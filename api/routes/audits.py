from __future__ import annotations

import math
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query
import secrets
from sqlmodel import Session, select

from api.db.config import get_settings
from api.db.models import AuditItem, AuditStatus
from api.db.session import get_session
from api.models import (
    AuditDecisionRequest,
    AuditDetail,
    AuditListItem,
    AuditListResponse,
    AuditResponseModel,
)
from api.services.audit_registry import reconcile_batch


router = APIRouter(prefix="/api/audits", tags=["auditoria"])


def _require_token(
    audit_token: Optional[str] = Header(default=None, alias="X-Audit-Token"),
) -> None:
    settings = get_settings()
    expected = settings.audit_token or ""
    provided = audit_token or ""
    if settings.audit_token and not secrets.compare_digest(provided, expected):
        raise HTTPException(status_code=401, detail="Token de auditoria inválido")


def _public_url(path: Optional[str]) -> Optional[str]:
    if not path:
        return None
    return f"/static/{path.lstrip('/')}"


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

    for question, value in payload.answers.items():
        response = responses_map[question]
        response.corrected_value = value or None

    item.notes = payload.notes
    item.status = AuditStatus.RESOLVED

    session.add(item)
    session.commit()
    session.refresh(item)

    for response in item.responses:
        session.refresh(response)

    settings = get_settings()
    reconcile_batch(session, settings, batch_id=item.batch_id)

    session.refresh(item)

    return _to_detail(item)
