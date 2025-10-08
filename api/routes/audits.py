from __future__ import annotations

import json
import math
import secrets
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from fastapi.responses import FileResponse
from sqlmodel import Session, select

from api.db.config import get_settings
from api.db.models import AuditItem, AuditStatus, BatchStatus
from api.db.session import get_session
from api.models import (
    AuditDecisionRequest,
    AuditDetail,
    AuditListItem,
    AuditListResponse,
    AuditResponseModel,
    BatchManifest,
    BatchManifestItem,
    CleanupRequest,
    CleanupResponse,
    ExportMetadata,
)
from api.services.audit_registry import (
    cleanup_batch,
    get_batch,
    invalidate_batch_export,
    reconcile_batch,
)
from api.utils.validators import (
    sanitize_user_input,
    validate_answer_value,
    validate_audit_user,
    validate_batch_id,
)


router = APIRouter(prefix="/api/audits", tags=["auditoria"])


def _require_token(
    audit_token: Optional[str] = Header(default=None, alias="X-Audit-Token"),
) -> None:
    settings = get_settings()
    expected = settings.audit_token or ""
    provided = audit_token or ""
    if settings.audit_token and not secrets.compare_digest(provided, expected):
        raise HTTPException(status_code=401, detail="Token de auditoria inválido")


def _require_user(
    audit_user: Optional[str] = Header(default=None, alias="X-Audit-User"),
) -> str:
    user = (audit_user or "").strip()
    if not user:
        raise HTTPException(
            status_code=400, detail="Cabeçalho X-Audit-User é obrigatório"
        )

    if not validate_audit_user(user):
        raise HTTPException(
            status_code=400,
            detail="Cabeçalho X-Audit-User contém caracteres inválidos",
        )

    return sanitize_user_input(user, max_length=64)


def _public_url(path: Optional[str]) -> Optional[str]:
    if not path:
        return None
    return f"/static/{path.lstrip('/')}"


def _load_manifest(path: Path) -> BatchManifest:
    if not path.exists():
        raise HTTPException(status_code=404, detail="Manifesto não encontrado")

    with open(path, "r", encoding="utf-8") as handle:
        data = json.load(handle)

    return BatchManifest(
        batch_id=data["batch_id"],
        template=data["template"],
        generated_at=datetime.fromisoformat(data["generated_at"]),
        exported_by=data.get("exported_by"),
        has_corrections=data.get("has_corrections", False),
        files=data.get("files", {}),
        hashes=data.get("hashes", {}),
        summary=data.get("summary", {}),
        items=[
            BatchManifestItem(
                id=item["id"],
                file_id=item["file_id"],
                status=AuditStatus(item["status"]),
                issues=item.get("issues", []),
                updated_at=datetime.fromisoformat(item["updated_at"]),
                exported_at=(
                    datetime.fromisoformat(item["exported_at"])
                    if item.get("exported_at")
                    else None
                ),
            )
            for item in data.get("items", [])
        ],
    )


def _to_list_item(item: AuditItem) -> AuditListItem:
    return AuditListItem(
        id=item.id,
        file_id=item.file_id,
        template=item.template,
        batch_id=item.batch_id,
        issues=item.issues,
        status=item.status,
        image_url=_public_url(item.image_path),
        marked_image_url=_public_url(item.marked_image_path),
        created_at=item.created_at,
    )


def _to_detail(item: AuditItem) -> AuditDetail:
    responses = [
        AuditResponseModel(
            question=response.question,
            read_value=response.read_value,
            corrected_value=response.corrected_value,
        )
        for response in item.responses
    ]

    return AuditDetail(
        id=item.id,
        file_id=item.file_id,
        template=item.template,
        batch_id=item.batch_id,
        issues=item.issues,
        status=item.status,
        notes=item.notes,
        raw_answers=item.raw_answers,
        image_url=_public_url(item.image_path),
        marked_image_url=_public_url(item.marked_image_path),
        created_at=item.created_at,
        updated_at=item.updated_at,
        responses=responses,
    )


@router.get("", response_model=AuditListResponse)
def list_audits(
    *,
    status: Optional[AuditStatus] = Query(default=None),
    template: Optional[str] = Query(default=None),
    batch_id: Optional[str] = Query(default=None),
    created_from: Optional[datetime] = Query(default=None),
    created_to: Optional[datetime] = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    _: None = Depends(_require_token),
    session: Session = Depends(get_session),
):
    statement = select(AuditItem)

    if status:
        statement = statement.where(AuditItem.status == status)
    if template:
        statement = statement.where(AuditItem.template == template)
    if batch_id:
        statement = statement.where(AuditItem.batch_id == batch_id)
    if created_from:
        statement = statement.where(AuditItem.created_at >= created_from)
    if created_to:
        statement = statement.where(AuditItem.created_at <= created_to)

    statement = statement.order_by(AuditItem.created_at.desc())

    items = session.exec(statement).all()

    total = len(items)
    pending = sum(1 for item in items if item.status == AuditStatus.PENDING)
    resolved = sum(1 for item in items if item.status == AuditStatus.RESOLVED)
    reopened = sum(1 for item in items if item.status == AuditStatus.REOPENED)

    start = (page - 1) * page_size
    end = start + page_size
    paged_items = items[start:end]

    total_pages = max(1, math.ceil(total / page_size)) if total else 1

    return AuditListResponse(
        items=[_to_list_item(item) for item in paged_items],
        total=total,
        pending=pending,
        resolved=resolved,
        reopened=reopened,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/export")
def export_batch(
    batch_id: str = Query(..., description="Identificador do lote"),
    format: str = Query(default="file", pattern="^(file|json)$"),
    _: None = Depends(_require_token),
    user: str = Depends(_require_user),
    session: Session = Depends(get_session),
):
    if not validate_batch_id(batch_id):
        raise HTTPException(status_code=400, detail="batch_id inválido ou perigoso")
    settings = get_settings()
    result = reconcile_batch(session, settings, batch_id=batch_id, exported_by=user)

    if result is None:
        raise HTTPException(status_code=404, detail="Lote não encontrado")

    batch = result.batch

    if batch.exported_at is None:
        raise HTTPException(
            status_code=500, detail="Falha ao registrar exportação do lote"
        )

    if format.lower() == "json":
        manifest = _load_manifest(result.manifest_path)
        metadata = ExportMetadata(
            batch_id=batch.batch_id,
            status=batch.status,
            exported_at=batch.exported_at,
            exported_by=batch.exported_by,
            corrected_results_path=batch.corrected_results_path
            or result.corrected_csv.name,
            manifest_path=batch.manifest_path or result.manifest_path.name,
            manifest=manifest,
        )
        return metadata

    filename = result.corrected_csv.name
    return FileResponse(
        path=result.corrected_csv,
        media_type="text/csv",
        filename=filename,
    )


@router.post("/cleanup", response_model=CleanupResponse)
def cleanup_batch_endpoint(
    payload: CleanupRequest,
    _: None = Depends(_require_token),
    _user: str = Depends(_require_user),
    session: Session = Depends(get_session),
):
    if not payload.confirm:
        raise HTTPException(
            status_code=400, detail="Confirme a limpeza definindo 'confirm' para true"
        )

    if not validate_batch_id(payload.batch_id):
        raise HTTPException(status_code=400, detail="batch_id inválido ou perigoso")

    settings = get_settings()

    try:
        result = cleanup_batch(session, settings, batch_id=payload.batch_id)
    except ValueError as exc:  # noqa: BLE001
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    if result is None:
        raise HTTPException(status_code=404, detail="Lote não encontrado")

    removed = [path.as_posix() for path in result.removed_paths]

    return CleanupResponse(
        batch_id=result.batch_id,
        status=BatchStatus.CLEANED,
        removed_paths=removed,
    )


@router.get("/{audit_id}", response_model=AuditDetail)
def get_audit(
    audit_id: int,
    _: None = Depends(_require_token),
    session: Session = Depends(get_session),
):
    item = session.get(AuditItem, audit_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item de auditoria não encontrado")

    session.refresh(item)

    return _to_detail(item)


@router.post("/{audit_id}/decision", response_model=AuditDetail)
def submit_decision(
    audit_id: int,
    payload: AuditDecisionRequest,
    _: None = Depends(_require_token),
    session: Session = Depends(get_session),
):
    item = session.get(AuditItem, audit_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item de auditoria não encontrado")

    responses_map = {response.question: response for response in item.responses}

    invalid_questions = [
        question for question in payload.answers.keys() if question not in responses_map
    ]
    if invalid_questions:
        raise HTTPException(
            status_code=400,
            detail=f"Questões inválidas para este item: {', '.join(invalid_questions)}",
        )

    # Validate answer values
    invalid_answers = {
        question: value
        for question, value in payload.answers.items()
        if value and not validate_answer_value(value)
    }
    if invalid_answers:
        raise HTTPException(
            status_code=400,
            detail=f"Valores de resposta inválidos: {invalid_answers}",
        )

    for question, value in payload.answers.items():
        response = responses_map[question]
        response.corrected_value = value or None

    # Sanitize notes
    item.notes = (
        sanitize_user_input(payload.notes or "", max_length=512)
        if payload.notes
        else None
    )
    item.status = AuditStatus.RESOLVED
    item.exported_at = None

    session.add(item)
    batch = get_batch(session, item.batch_id)
    if batch:
        settings = get_settings()
        invalidate_batch_export(batch, settings)
        session.add(batch)

    session.commit()
    session.refresh(item)

    for response in item.responses:
        session.refresh(response)

    return _to_detail(item)
