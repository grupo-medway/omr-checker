from pydantic import BaseModel
from typing import Dict, List, Optional


class OMRResult(BaseModel):
    filename: str
    data: Dict[str, str]  # Dados extraídos do OMR
    processed_image: str  # Base64 da imagem processada
    warnings: List[str] = []


class ProcessResponse(BaseModel):
    status: str
    results: List[OMRResult]
    summary: Dict[str, int]
    errors: Optional[List[str]] = None


class ErrorResponse(BaseModel):
    error: str
    details: Optional[str] = None