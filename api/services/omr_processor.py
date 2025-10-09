from __future__ import annotations

import csv
import os
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional
from uuid import uuid4

from sqlmodel import Session

sys.path.append(str(Path(__file__).parent.parent.parent))

from main import entry_point_for_args
from api.db.config import Settings
from api.models import OMRResult, ProcessResponse
from api.services.audit_registry import ProcessedRecord, register_audit_batch
from api.utils import FileHandler


@dataclass
class CollectedResults:
    csv_path: Path
    records: List[ProcessedRecord]
    results: List[OMRResult]


class OMRProcessor:
    @staticmethod
    def process_omr_files(
        image_files: List[Path],
        template_name: str,
        temp_dir: str,
        *,
        session: Session,
        settings: Settings,
    ) -> ProcessResponse:
        """
        Processa arquivos OMR e retorna resultados
        """
        # Criar diretório de saída
        temp_dir_path = Path(temp_dir)
        output_dir = temp_dir_path / "outputs"
        output_dir.mkdir(parents=True, exist_ok=True)

        # Configurar argumentos para o OMRChecker
        args = {
            "input_paths": [str(temp_dir)],
            "output_dir": str(output_dir),
            "debug": False,
            "autoAlign": False,
            "setLayout": False
        }

        batch_id = uuid4().hex

        try:
            entry_point_for_args(args)
            collected = OMRProcessor._collect_results(output_dir)

            if collected is None:
                return ProcessResponse(
                    status="error",
                    results=[],
                    summary={
                        "total": len(image_files),
                        "processed": 0,
                        "errors": len(image_files),
                        "batch_id": batch_id,
                    },
                    errors=["Nenhum resultado CSV foi gerado pelo pipeline"],
                    audit=None,
                )

            originals_map = {path.name: path for path in image_files}

            audit_summary = register_audit_batch(
                session,
                settings,
                template=template_name,
                batch_id=batch_id,
                csv_path=collected.csv_path,
                records=collected.records,
                originals=originals_map,
            )

            return ProcessResponse(
                status="success",
                results=collected.results,
                summary={
                    "total": len(image_files),
                    "processed": len(collected.results),
                    "errors": max(0, len(image_files) - len(collected.results)),
                    "batch_id": batch_id,
                },
                audit=audit_summary,
            )

        except Exception as e:
            return ProcessResponse(
                status="error",
                results=[],
                summary={
                    "total": len(image_files),
                    "processed": 0,
                    "errors": len(image_files),
                    "batch_id": batch_id,
                },
                errors=[str(e)],
                audit=None,
            )
    
    @staticmethod
    def _collect_results(output_dir: Path) -> Optional[CollectedResults]:
        """Coleta resultados do processamento e prepara dados para auditoria."""

        results_dir = output_dir / "Results"

        if not results_dir.exists():
            return None

        csv_files = list(results_dir.glob("*.csv"))
        if not csv_files:
            return None

        latest_csv = max(csv_files, key=os.path.getctime)
        checked_dir = output_dir / "CheckedOMRs"

        omr_results: List[OMRResult] = []
        processed_records: List[ProcessedRecord] = []

        try:
            with open(latest_csv, "r", encoding="utf-8", newline="") as file_obj:
                reader = csv.DictReader(file_obj)
                fieldnames = reader.fieldnames or []

                answer_keys = [
                    key
                    for key in fieldnames
                    if key
                    and (
                        key.lower().startswith("matricula")
                        or key.lower().startswith("lingua")
                        or key.lower().startswith("q")
                    )
                ]
                question_keys = [key for key in answer_keys if key.lower().startswith("q")]

                for row in reader:
                    filename = row.get("file_id", "")
                    if not filename:
                        continue

                    processed_image_path = OMRProcessor._resolve_marked_image(
                        row.get("output_path"),
                        checked_dir,
                        filename,
                    )

                    processed_image_base64 = ""
                    if processed_image_path and processed_image_path.exists():
                        processed_image_base64 = FileHandler.image_to_base64(
                            processed_image_path
                        )

                    filtered_data = {
                        key: row.get(key, "") for key in answer_keys
                    }

                    omr_results.append(
                        OMRResult(
                            filename=filename,
                            data=filtered_data,
                            processed_image=processed_image_base64,
                            processed_image_url=None,
                            warnings=[],
                        )
                    )

                    processed_records.append(
                        ProcessedRecord(
                            file_id=filename,
                            answers=filtered_data,
                            question_keys=question_keys,
                            marked_image_path=processed_image_path,
                        )
                    )
        except Exception as exc:  # noqa: BLE001
            print(f"Erro ao ler CSV: {exc}")
            return None

        return CollectedResults(
            csv_path=latest_csv,
            records=processed_records,
            results=omr_results,
        )

    @staticmethod
    def _resolve_marked_image(
        output_path_value: Optional[str],
        checked_dir: Path,
        filename: str,
    ) -> Optional[Path]:
        if output_path_value:
            candidate = Path(output_path_value)
            if candidate.exists():
                return candidate

        if checked_dir.exists():
            for ext in (".jpg", ".png", ".jpeg"):
                candidate = checked_dir / f"{Path(filename).stem}{ext}"
                if candidate.exists():
                    return candidate
        return None