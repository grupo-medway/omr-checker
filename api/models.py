from typing import Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field

from api.template_registry import TemplateManifest


class StudentIdentifier(BaseModel):
    raw: str
    schema_: str = Field(..., alias="schema")
    type: str = "ra"
    model_config = ConfigDict(populate_by_name=True)


class ConfidenceSummary(BaseModel):
    level: str
    requires_human_review: bool
    reasons: List[str] = Field(default_factory=list)


class ReviewArtifacts(BaseModel):
    annotated_image_url: Optional[str] = None


class SheetResult(BaseModel):
    sheet_id: str
    filename: str
    status: str
    student_identifier: StudentIdentifier
    language: str
    answers_raw: Dict[str, str]
    confidence_summary: ConfidenceSummary
    flags: List[str] = Field(default_factory=list)
    review_artifacts: ReviewArtifacts = Field(default_factory=ReviewArtifacts)


class JobSummary(BaseModel):
    total: int
    processed: int
    needs_review: int
    failed: int


class JobResponse(BaseModel):
    job_id: str
    status: str
    created_at: str
    completed_at: Optional[str] = None
    template_id: str
    source_type: str
    source_id: Optional[str] = None
    summary: JobSummary
    sheets: List[SheetResult] = Field(default_factory=list)
    errors: List[str] = Field(default_factory=list)


class TemplateListResponse(BaseModel):
    templates: List[TemplateManifest]


class OMRResult(BaseModel):
    filename: str
    data: Dict[str, str]
    processed_image: str
    warnings: List[str] = Field(default_factory=list)


class ProcessResponse(BaseModel):
    status: str
    results: List[OMRResult]
    summary: Dict[str, int]
    errors: Optional[List[str]] = None


class ErrorResponse(BaseModel):
    error: str
    details: Optional[str] = None
