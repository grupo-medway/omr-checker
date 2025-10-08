from __future__ import annotations

import csv
import shutil
from dataclasses import dataclass
import logging
from pathlib import Path
from typing import Dict, Iterable, List, Optional

from sqlmodel import Session, select

from api.db.config import Settings
from api.db.models import AuditItem, AuditResponse, AuditStatus
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

logger = logging.getLogger(__name__)


@dataclass
class ProcessedRecord:
    file_id: str
    answers: Dict[str, str]
    question_keys: List[str]
    marked_image_path: Optional[Path]


def _ensure_dir(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    return path


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
        if normalized in PROBLEM_VALUES:
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
            items=[],
        )

    results_dir = _ensure_dir(settings.results_dir / batch_id)
    stored_csv_path = results_dir / csv_path.name
    shutil.copy2(csv_path, stored_csv_path)
    stored_csv_rel = stored_csv_path.relative_to(settings.results_dir)

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
        items=summary_items,
    )


def reconcile_batch(
    session: Session,
    settings: Settings,
    *,
    batch_id: str,
) -> Optional[Path]:
    items = session.exec(
        select(AuditItem).where(AuditItem.batch_id == batch_id)
    ).all()

    if not items:
        return None

    source_item = next((item for item in items if item.results_path), None)
    if not source_item:
        return None

    try:
        original_csv_path = _safe_resolve(settings.results_dir, source_item.results_path)
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
    for item in items:
        response_map = {
            response.question: (response.corrected_value or response.read_value or "")
            for response in item.responses
        }
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

    return corrected_path


def _safe_resolve(base: Path, relative_path: str) -> Path:
    base_resolved = base.resolve()
    candidate = (base_resolved / relative_path).resolve()
    if not str(candidate).startswith(str(base_resolved)):
        raise ValueError("Path traversal detected")
    return candidate
