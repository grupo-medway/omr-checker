from datetime import datetime
from typing import Dict, List, Optional, Union

from pydantic import BaseModel

from api.db.models import AuditStatus


class OMRResult(BaseModel):
    filename: str
    data: Dict[str, str]  # Dados extraídos do OMR
    processed_image: str  # Base64 da imagem processada
    processed_image_url: Optional[str] = None
    warnings: List[str] = []


class ProcessResponse(BaseModel):
    status: str
    results: List[OMRResult]
    summary: Dict[str, Union[int, str]]
    errors: Optional[List[str]] = None
    audit: Optional["AuditSummary"] = None


class ErrorResponse(BaseModel):
    error: str
    details: Optional[str] = None


class AuditListItem(BaseModel):
    id: int
    file_id: str
    template: str
    batch_id: str
    issues: List[str]
    status: AuditStatus
    image_url: Optional[str] = None
    marked_image_url: Optional[str] = None
    created_at: datetime


class AuditSummary(BaseModel):
    batch_id: str
    total: int
    pending: int
    resolved: int
    items: List[AuditListItem]


class AuditResponseModel(BaseModel):
    question: str
    read_value: Optional[str]
    corrected_value: Optional[str]


class AuditDetail(BaseModel):
    id: int
    file_id: str
    template: str
    batch_id: str
    issues: List[str]
    status: AuditStatus
    notes: Optional[str]
    raw_answers: Dict[str, str]
    image_url: Optional[str]
    marked_image_url: Optional[str]
    created_at: datetime
    updated_at: datetime
    responses: List[AuditResponseModel]


class AuditDecisionRequest(BaseModel):
    answers: Dict[str, str]
    notes: Optional[str] = None


class AuditListResponse(BaseModel):
    items: List[AuditListItem]
    total: int
    pending: int
    resolved: int
    reopened: int
    page: int
    page_size: int
    total_pages: int


ProcessResponse.model_rebuild()