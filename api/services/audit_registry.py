from __future__ import annotations

import csv
import hashlib
import json
import logging
import shutil
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from typing import Dict, Generator, Iterable, List, Optional

from sqlmodel import Session, select

from api.db.config import Settings
from api.db.models import (
    AuditBatch,
    AuditItem,
    AuditResponse,
    AuditStatus,
    BatchStatus,
)
from api.models import AuditListItem, AuditSummary
from api.utils.paths import to_public_path


PROBLEM_VALUES = {
    "",
    "UNMARKED",
    "INVALID",
    "MULTI",
    "MULTIPLE",
    "?",
    "NA",
    "BLANK",
    "EMPTY",
}

VALID_ALTERNATIVES = {"A", "B", "C", "D", "E"}

logger = logging.getLogger(__name__)


_BATCH_LOCKS: Dict[str, Lock] = {}
_LOCKS_MUTEX = Lock()


@dataclass
class ProcessedRecord:
    file_id: str
    answers: Dict[str, str]
    question_keys: List[str]
    marked_image_path: Optional[Path]


@dataclass
class ReconciliationResult:
    batch: AuditBatch
    corrected_csv: Path
    manifest_path: Path
    hashes: Dict[str, str]


@dataclass
class CleanupResult:
    batch_id: str
    removed_paths: List[Path]


def _ensure_dir(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    return path


@contextmanager
def _acquire_batch_lock(batch_id: str) -> Generator[None, None, None]:
    with _LOCKS_MUTEX:
        lock = _BATCH_LOCKS.setdefault(batch_id, Lock())
    lock.acquire()
    try:
        yield
    finally:
        lock.release()


def _build_public_url(relative_path: Optional[str]) -> Optional[str]:
    if not relative_path:
        return None
    relative_path = relative_path.lstrip("/")
    return f"/static/{relative_path}" if relative_path else None


def _copy_if_exists(src: Optional[Path], dest: Path) -> Optional[Path]:
    if not src or not src.exists():
        return None
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dest)
    return dest


def _detect_issues(answers: Dict[str, str], question_keys: Iterable[str]) -> List[str]:
    issues: List[str] = []
    for question in question_keys:
        raw_value = answers.get(question)
        value = (raw_value or "").strip()
        normalized = value.upper()
        if _is_problematic_value(normalized):
            display = value or "blank"
            issues.append(f"{question}: {display}")
    return issues


def register_audit_batch(
    session: Session,
    settings: Settings,
    *,
    template: str,
    batch_id: str,
    csv_path: Path,
    records: Iterable[ProcessedRecord],
    originals: Dict[str, Path],
) -> AuditSummary:
    records = list(records)

    if not records:
        return AuditSummary(
            batch_id=batch_id,
            total=0,
            pending=0,
            resolved=0,
            status=BatchStatus.PENDING,
            items=[],
        )

    results_dir = _ensure_dir(settings.results_dir / batch_id)
    stored_csv_path = results_dir / csv_path.name
    shutil.copy2(csv_path, stored_csv_path)
    stored_csv_rel = stored_csv_path.relative_to(settings.results_dir)

    batch = session.exec(
        select(AuditBatch).where(AuditBatch.batch_id == batch_id)
    ).one_or_none()

    if batch is None:
        batch = AuditBatch(
            batch_id=batch_id,
            template=template,
            original_results_path=stored_csv_rel.as_posix(),
            status=BatchStatus.PENDING,
        )
        session.add(batch)
        session.flush()
    else:
        invalidate_batch_export(batch, settings)
        batch.template = template
        batch.original_results_path = stored_csv_rel.as_posix()

    static_root = settings.static_root / batch_id
    originals_dir = _ensure_dir(static_root / "original")
    marked_dir = _ensure_dir(static_root / "marked")

    summary_items: List[AuditListItem] = []

    for record in records:
        issues = _detect_issues(record.answers, record.question_keys)
        if not issues:
            continue

        original_src = originals.get(record.file_id)
        original_dest = _copy_if_exists(
            original_src,
            originals_dir / Path(record.file_id).name,
        )

        marked_dest = None
        if record.marked_image_path:
            marked_dest = _copy_if_exists(
                record.marked_image_path,
                marked_dir / record.marked_image_path.name,
            )

        image_path = (
            to_public_path(original_dest, settings).as_posix() if original_dest else None
        )
        marked_image_path = (
            to_public_path(marked_dest, settings).as_posix() if marked_dest else None
        )

        audit_item = AuditItem(
            file_id=record.file_id,
            template=template,
            batch_id=batch_id,
            issues=issues,
            image_path=image_path,
            marked_image_path=marked_image_path,
            raw_answers=record.answers,
            results_path=stored_csv_rel.as_posix(),
            status=AuditStatus.PENDING,
        )

        audit_item.batch = batch

        session.add(audit_item)
        session.flush()

        responses = [
            AuditResponse(
                audit_item_id=audit_item.id,
                question=question,
                read_value=(record.answers.get(question) or None),
            )
            for question in record.question_keys
        ]

        session.add_all(responses)

        summary_items.append(
            AuditListItem(
                id=audit_item.id,
                file_id=audit_item.file_id,
                template=audit_item.template,
                batch_id=audit_item.batch_id,
                issues=audit_item.issues,
                status=audit_item.status,
                image_url=_build_public_url(audit_item.image_path),
                marked_image_url=_build_public_url(audit_item.marked_image_path),
                created_at=audit_item.created_at,
            )
        )

    session.commit()

    pending = len(summary_items)

    return AuditSummary(
        batch_id=batch_id,
        total=pending,
        pending=pending,
        resolved=0,
        status=batch.status,
        items=summary_items,
    )


def reconcile_batch(
    session: Session,
    settings: Settings,
    *,
    batch_id: str,
    exported_by: Optional[str] = None,
    force: bool = False,
) -> Optional[ReconciliationResult]:
    with _acquire_batch_lock(batch_id):
        batch = session.exec(
            select(AuditBatch).where(AuditBatch.batch_id == batch_id)
        ).one_or_none()

        if batch is None:
            return None

        if (
            not force
            and batch.status == BatchStatus.EXPORTED
            and batch.corrected_results_path
            and batch.manifest_path
        ):
            try:
                corrected_cache = _safe_resolve(
                    settings.exports_dir, batch.corrected_results_path
                )
                manifest_cache = _safe_resolve(
                    settings.exports_dir, batch.manifest_path
                )
            except ValueError:
                corrected_cache = None
                manifest_cache = None

            if (
                corrected_cache
                and manifest_cache
                and corrected_cache.exists()
                and manifest_cache.exists()
            ):
                manifest_data = _load_manifest_dict(manifest_cache)
                return ReconciliationResult(
                    batch=batch,
                    corrected_csv=corrected_cache,
                    manifest_path=manifest_cache,
                    hashes=manifest_data.get("hashes", {}),
                )

        items = session.exec(
            select(AuditItem).where(AuditItem.batch_id == batch_id)
        ).all()

        if not items:
            return None

        try:
            original_csv_path = _safe_resolve(
                settings.results_dir, batch.original_results_path
            )
        except ValueError as exc:
            logger.error("results path outside allowed directory", exc_info=exc)
            return None

        if not original_csv_path.exists():
            logger.error("results CSV not found", extra={"path": str(original_csv_path)})
            return None

        with open(original_csv_path, "r", encoding="utf-8", newline="") as handle:
            reader = csv.DictReader(handle)
            fieldnames = reader.fieldnames or []
            rows = list(reader)

        corrections: Dict[str, Dict[str, str]] = {}
        has_corrections = False

        for item in items:
            response_map: Dict[str, str] = {}
            for response in item.responses:
                chosen_value = response.corrected_value
                if chosen_value is not None and chosen_value != response.read_value:
                    has_corrections = True
                value = (
                    chosen_value if chosen_value is not None else response.read_value or ""
                )
                response_map[response.question] = value
            corrections[item.file_id] = response_map

        for row in rows:
            file_id = row.get("file_id")
            if not file_id or file_id not in corrections:
                continue

            updates = corrections[file_id]
            for question, value in updates.items():
                if question in row:
                    row[question] = value

        exports_dir = _ensure_dir(settings.exports_dir / batch_id)
        corrected_path = exports_dir / "Results_Corrigidos.csv"

        with open(corrected_path, "w", encoding="utf-8", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=fieldnames, extrasaction="ignore")
            writer.writeheader()
            writer.writerows(rows)

        manifest_path = exports_dir / "results_manifest.json"
        generated_at = datetime.now(timezone.utc)

        summary_counts = {
            "total": len(items),
            "pending": sum(1 for item in items if item.status == AuditStatus.PENDING),
            "resolved": sum(1 for item in items if item.status == AuditStatus.RESOLVED),
            "reopened": sum(1 for item in items if item.status == AuditStatus.REOPENED),
        }

        for item in items:
            if item.status == AuditStatus.RESOLVED:
                item.exported_at = generated_at
                session.add(item)

        manifest_data = {
            "batch_id": batch.batch_id,
            "template": batch.template,
            "generated_at": generated_at.isoformat(),
            "exported_by": exported_by,
            "has_corrections": has_corrections,
            "files": {
                "original": batch.original_results_path,
                "corrected": corrected_path.relative_to(settings.exports_dir).as_posix(),
            },
            "hashes": {
                "original": _hash_file(original_csv_path),
                "corrected": _hash_file(corrected_path),
            },
            "summary": summary_counts,
            "items": [
                {
                    "id": item.id,
                    "file_id": item.file_id,
                    "status": item.status.value,
                    "issues": item.issues,
                    "updated_at": item.updated_at.isoformat(),
                    "exported_at": item.exported_at.isoformat() if item.exported_at else None,
                }
                for item in items
            ],
        }

        with open(manifest_path, "w", encoding="utf-8") as handle:
            json.dump(manifest_data, handle, ensure_ascii=False, indent=2)

        corrected_rel = corrected_path.relative_to(settings.exports_dir).as_posix()
        manifest_rel = manifest_path.relative_to(settings.exports_dir).as_posix()

        batch.corrected_results_path = corrected_rel
        batch.manifest_path = manifest_rel
        batch.status = BatchStatus.EXPORTED
        batch.exported_at = generated_at
        batch.exported_by = exported_by

        session.add(batch)
        session.commit()
        session.refresh(batch)

        return ReconciliationResult(
            batch=batch,
            corrected_csv=corrected_path,
            manifest_path=manifest_path,
            hashes=manifest_data["hashes"],
        )


def get_batch(session: Session, batch_id: str) -> Optional[AuditBatch]:
    return session.exec(
        select(AuditBatch).where(AuditBatch.batch_id == batch_id)
    ).one_or_none()


def cleanup_batch(
    session: Session,
    settings: Settings,
    *,
    batch_id: str,
) -> Optional[CleanupResult]:
    batch = get_batch(session, batch_id)
    if batch is None:
        return None

    if batch.status != BatchStatus.EXPORTED:
        raise ValueError("Batch deve estar exportado antes da limpeza")

    removed: List[Path] = []
    targets = [
        settings.results_dir / batch_id,
        settings.exports_dir / batch_id,
        settings.static_root / batch_id,
    ]

    for directory in targets:
        if directory.exists():
            shutil.rmtree(directory)
            removed.append(directory)

    session.delete(batch)
    session.commit()

    with _LOCKS_MUTEX:
        _BATCH_LOCKS.pop(batch_id, None)

    return CleanupResult(batch_id=batch_id, removed_paths=removed)


def invalidate_batch_export(batch: AuditBatch, settings: Settings) -> None:
    export_dir = settings.exports_dir / batch.batch_id
    if export_dir.exists():
        shutil.rmtree(export_dir)

    batch.status = BatchStatus.PENDING
    batch.corrected_results_path = None
    batch.manifest_path = None
    batch.exported_at = None
    batch.exported_by = None


def _load_manifest_dict(path: Path) -> Dict[str, object]:
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def _safe_resolve(base: Path, relative_path: str) -> Path:
    base_resolved = base.resolve()
    candidate = (base_resolved / relative_path).resolve()
    if not str(candidate).startswith(str(base_resolved)):
        raise ValueError("Path traversal detected")
    return candidate


def _hash_file(path: Path) -> str:
    hasher = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(8192), b""):
            hasher.update(chunk)
    return hasher.hexdigest()


def _is_problematic_value(value: str) -> bool:
    if value in PROBLEM_VALUES:
        return True

    normalized = value.strip().upper()
    if not normalized:
        return True

    if normalized in PROBLEM_VALUES:
        return True

    letters = [char for char in normalized if char.isalpha()]
    if not letters:
        return True

    unique_letters = {char for char in letters}

    if len(unique_letters) > 1:
        return True

    only_letter = unique_letters.pop()
    return only_letter not in VALID_ALTERNATIVES or normalized != only_letter
