import csv
import os
import uuid
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional

from api.config import Settings, get_settings
from api.job_store import JobStore, JobStoreError
from api.models import OMRResult, ProcessResponse
from api.template_registry import RegisteredTemplate, TemplateRegistry, TemplateRegistryError
from api.utils import FileHandler
from main import entry_point_for_args
from src.logger import logger


class OMRProcessingError(Exception):
    pass


class OMRProcessor:
    def __init__(
        self,
        registry: Optional[TemplateRegistry] = None,
        job_store: Optional[JobStore] = None,
        settings: Optional[Settings] = None,
    ):
        self.settings = settings or get_settings()
        self.registry = registry or TemplateRegistry()
        self.job_store = job_store or JobStore(
            self.settings.jobs_root, self.settings.jobs_ttl_seconds
        )

    def list_templates(self):
        return [template.manifest for template in self.registry.list_templates()]

    def get_template(self, template_id: str):
        return self.registry.get_template(template_id).manifest

    def create_job(
        self,
        *,
        upload_filename: str,
        zip_content: bytes,
        template_id: str,
        source_type: str,
        source_id: Optional[str] = None,
        metadata: Optional[dict] = None,
    ) -> dict:
        template = self.registry.get_template(template_id)
        if not template.manifest.is_active:
            raise OMRProcessingError(f"Template '{template_id}' is inactive")

        job_id = str(uuid.uuid4())
        created_at = self._now()
        job_dir = self.job_store.create_job_dir(job_id)
        workspace = job_dir / "workspace"
        logger.info(
            f"event=omr_job_started job_id={job_id} template_id={template_id} source_type={source_type}"
        )

        try:
            image_files = FileHandler.extract_zip(
                zip_content,
                str(workspace),
                allowed_extensions=self.settings.allowed_extensions,
                max_files=self.settings.max_images_per_job,
                max_upload_bytes=self.settings.max_upload_bytes,
                max_uncompressed_bytes=self.settings.max_uncompressed_bytes,
            )
        except (ValueError, zipfile.BadZipFile) as exc:
            self.job_store.delete_job(job_id)
            raise OMRProcessingError(str(exc))
        if not image_files:
            self.job_store.delete_job(job_id)
            raise OMRProcessingError("Nenhuma imagem válida encontrada no ZIP")

        success, message = FileHandler.copy_template_files(
            template.template_dir,
            str(workspace),
        )
        if not success:
            self.job_store.delete_job(job_id)
            raise OMRProcessingError(message)

        output_dir = workspace / "outputs"
        args = {
            "input_paths": [str(workspace)],
            "output_dir": str(output_dir),
            "debug": False,
            "autoAlign": False,
            "setLayout": False,
        }

        job_document = {
            "job_id": job_id,
            "created_at": created_at,
            "template_id": template_id,
            "source_type": source_type,
            "source_id": source_id,
            "metadata": metadata or {},
            "upload_filename": upload_filename,
        }

        try:
            entry_point_for_args(args)
            sheets = self._collect_sheet_results(
                job_id=job_id,
                workspace=workspace,
                template=template,
                image_files=image_files,
            )
            job_document.update(
                status="completed",
                completed_at=self._now(),
                summary=self._build_summary(sheets),
                sheets=sheets,
                errors=[],
            )
        except Exception as exc:
            logger.error(
                f"event=omr_job_failed job_id={job_id} template_id={template_id} error={exc}"
            )
            failed_sheets = self._build_unprocessed_sheets(
                job_id=job_id,
                image_files=image_files,
                template=template,
            )
            job_document.update(
                status="failed",
                completed_at=self._now(),
                summary=self._build_summary(failed_sheets),
                sheets=failed_sheets,
                errors=[str(exc)],
            )

        self.job_store.save_job(job_id, job_document)
        return job_document

    def get_job(self, job_id: str) -> dict:
        return self.job_store.load_job(job_id)

    def get_sheet_artifact_path(self, job_id: str, sheet_id: str) -> Path:
        job_document = self.get_job(job_id)
        for sheet in job_document["sheets"]:
            if sheet["sheet_id"] == sheet_id:
                artifact_path = sheet.get("annotated_image_path")
                if artifact_path and Path(artifact_path).exists():
                    return Path(artifact_path)
                raise JobStoreError(f"Sheet '{sheet_id}' has no annotated artifact")
        raise JobStoreError(f"Sheet '{sheet_id}' not found")

    def serialize_job_document(self, job_document: dict) -> dict:
        serialized = {**job_document}
        serialized["sheets"] = []
        for sheet in job_document["sheets"]:
            serialized["sheets"].append(
                {
                    "sheet_id": sheet["sheet_id"],
                    "filename": sheet["filename"],
                    "status": sheet["status"],
                    "student_identifier": sheet["student_identifier"],
                    "language": sheet["language"],
                    "answers_raw": sheet["answers_raw"],
                    "confidence_summary": sheet["confidence_summary"],
                    "flags": sheet["flags"],
                    "review_artifacts": {
                        "annotated_image_url": sheet.get("annotated_image_url")
                    },
                }
            )
        return serialized

    def to_legacy_response(self, job_document: dict) -> ProcessResponse:
        results = []
        for sheet in job_document["sheets"]:
            legacy_data = sheet.get("legacy_data")
            if legacy_data is None:
                continue

            artifact_path = sheet.get("annotated_image_path")
            processed_image = ""
            if artifact_path and Path(artifact_path).exists():
                processed_image = FileHandler.image_to_base64(Path(artifact_path))

            results.append(
                OMRResult(
                    filename=sheet["filename"],
                    data=legacy_data,
                    processed_image=processed_image,
                    warnings=[],
                )
            )

        total = job_document["summary"]["total"]
        processed = len(results)
        return ProcessResponse(
            status="error" if job_document["status"] == "failed" else "success",
            results=results,
            summary={
                "total": total,
                "processed": processed,
                "errors": total - processed,
            },
            errors=job_document["errors"] or None if job_document["status"] == "failed" else None,
        )

    def _collect_sheet_results(
        self,
        *,
        job_id: str,
        workspace: Path,
        template: RegisteredTemplate,
        image_files: List[Path],
    ) -> List[dict]:
        output_dir = workspace / "outputs"
        rows_by_filename = self._read_output_rows(output_dir)
        sheets = []
        for image_file in image_files:
            row_bundle = rows_by_filename.get(image_file.name)
            if row_bundle is None:
                sheets.append(
                    self._build_failed_sheet(job_id, image_file.name, template, "processing_error")
                )
                continue
            sheet = self._normalize_sheet(
                job_id=job_id,
                filename=image_file.name,
                template=template,
                row_bundle=row_bundle,
                workspace=workspace,
            )
            sheets.append(sheet)
        return sheets

    def _build_unprocessed_sheets(
        self,
        *,
        job_id: str,
        image_files: List[Path],
        template: RegisteredTemplate,
    ) -> List[dict]:
        return [
            self._build_failed_sheet(job_id, image_file.name, template, "processing_error")
            for image_file in image_files
        ]

    def _build_failed_sheet(
        self,
        job_id: str,
        filename: str,
        template: RegisteredTemplate,
        flag: str,
    ) -> dict:
        sheet_id = str(uuid.uuid4())
        return {
            "sheet_id": sheet_id,
            "filename": filename,
            "status": "failed",
            "student_identifier": {
                "raw": "",
                "schema": template.manifest.student_identifier_schema,
                "type": "ra",
            },
            "language": "",
            "answers_raw": {},
            "confidence_summary": {
                "level": "low",
                "requires_human_review": True,
                "reasons": [flag],
            },
            "flags": [flag],
            "annotated_image_url": None,
            "annotated_image_path": None,
            "legacy_data": None,
        }

    def _read_output_rows(self, output_dir: Path) -> Dict[str, dict]:
        rows_by_filename: Dict[str, dict] = {}
        results_dir = output_dir / "Results"
        latest_results_csv = None
        if results_dir.exists():
            csv_candidates = list(results_dir.glob("*.csv"))
            if csv_candidates:
                latest_results_csv = max(csv_candidates, key=os.path.getctime)

        if latest_results_csv:
            for row in self._read_csv_rows(latest_results_csv):
                rows_by_filename[row["file_id"]] = {"kind": "results", "row": row}

        manual_dir = output_dir / "Manual"
        for name, kind in [("MultiMarkedFiles.csv", "multi_marked"), ("ErrorFiles.csv", "errors")]:
            csv_path = manual_dir / name
            if not csv_path.exists():
                continue
            for row in self._read_csv_rows(csv_path):
                rows_by_filename[row["file_id"]] = {"kind": kind, "row": row}

        return rows_by_filename

    def _normalize_sheet(
        self,
        *,
        job_id: str,
        filename: str,
        template: RegisteredTemplate,
        row_bundle: dict,
        workspace: Path,
    ) -> dict:
        row = row_bundle["row"]
        kind = row_bundle["kind"]
        sheet_id = str(uuid.uuid4())

        answers_raw = self._extract_answers(row)
        flags = []
        if kind == "errors":
            flags.append("processing_error")

        for question, answer in answers_raw.items():
            if len(answer) > 1:
                flags.append(f"multi_mark_{question}")

        identifier_raw = self._extract_identifier(row, template)
        language_value = self._extract_language(row, template)
        if kind != "errors":
            if template.manifest.student_identifier_schema != "none":
                if not identifier_raw:
                    flags.append("missing_identifier")
                elif template.identifier_length and len(identifier_raw) < template.identifier_length:
                    flags.append("partial_identifier")

            if template.manifest.language_schema != "none" and not language_value:
                flags.append("missing_language")

        status = "processed"
        if "processing_error" in flags:
            status = "failed"
        elif flags or kind == "multi_marked":
            status = "needs_review"

        confidence_level = "high" if status == "processed" else "low"
        artifact_path = self._resolve_annotated_image_path(
            row=row,
            filename=filename,
            workspace=workspace,
        )
        annotated_url = None
        if artifact_path is not None:
            annotated_url = f"/v1/omr-jobs/{job_id}/sheets/{sheet_id}/artifacts/annotated"

        return {
            "sheet_id": sheet_id,
            "filename": filename,
            "status": status,
            "student_identifier": {
                "raw": identifier_raw,
                "schema": template.manifest.student_identifier_schema,
                "type": "ra",
            },
            "language": language_value,
            "answers_raw": answers_raw,
            "confidence_summary": {
                "level": confidence_level,
                "requires_human_review": status != "processed",
                "reasons": flags,
            },
            "flags": flags,
            "annotated_image_url": annotated_url,
            "annotated_image_path": str(artifact_path) if artifact_path else None,
            "legacy_data": self._build_legacy_data(row) if kind == "results" else None,
        }

    def _build_legacy_data(self, row: dict) -> Dict[str, str]:
        return {
            key: value
            for key, value in row.items()
            if key.startswith("matricula") or key.startswith("lingua") or key.startswith("q")
        }

    def _extract_answers(self, row: dict) -> Dict[str, str]:
        answers = {}
        for key in sorted(row.keys(), key=self._sort_response_key):
            if key.startswith("q"):
                answers[key] = row.get(key, "")
        return answers

    def _extract_identifier(self, row: dict, template: RegisteredTemplate) -> str:
        if template.identifier_field is None:
            return ""
        return row.get(template.identifier_field, "") or ""

    def _extract_language(self, row: dict, template: RegisteredTemplate) -> str:
        if template.language_field is None:
            return ""
        return row.get(template.language_field, "") or ""

    def _resolve_annotated_image_path(
        self,
        *,
        row: dict,
        filename: str,
        workspace: Path,
    ) -> Optional[Path]:
        output_path = row.get("output_path", "")
        if output_path:
            output_candidate = Path(output_path)
            if output_candidate.exists():
                return output_candidate

        matches = list((workspace / "outputs").rglob(filename))
        return matches[0] if matches else None

    def _build_summary(self, sheets: List[dict]) -> dict:
        summary = {"total": len(sheets), "processed": 0, "needs_review": 0, "failed": 0}
        for sheet in sheets:
            summary[sheet["status"]] += 1
        return summary

    def _read_csv_rows(self, csv_path: Path) -> List[dict]:
        rows = []
        with open(csv_path, "r", encoding="utf-8") as file:
            reader = csv.DictReader(file)
            for row in reader:
                rows.append(dict(row))
        return rows

    def _sort_response_key(self, key: str):
        if key.startswith("q") and key[1:].isdigit():
            return (0, int(key[1:]))
        return (1, key)

    def _now(self) -> str:
        return datetime.now(timezone.utc).isoformat()
