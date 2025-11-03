from contextlib import contextmanager
import logging
from pathlib import Path
from threading import Lock
from typing import Optional

import tempfile

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlmodel import Session

from api.db import get_settings, init_db
from api.models import ErrorResponse, ProcessResponse
from api.routes import audits_router
from api.services import OMRProcessor
from api.utils import FileHandler
from api.utils.storage import ensure_storage_dirs
from api.utils.validators import validate_template_name
from api.db.session import get_session


settings = get_settings()
logger = logging.getLogger(__name__)

# Global lock for OMR processing (prevents concurrent uploads)
_processing_lock = Lock()


@contextmanager
def acquire_processing_lock():
    """Context manager for processing lock."""
    if not _processing_lock.acquire(blocking=False):
        raise HTTPException(
            status_code=429,
            detail="Já existe um processamento em andamento. Aguarde o término."
        )
    try:
        yield
    finally:
        _processing_lock.release()


app = FastAPI(
    title="OMRChecker API",
    description="API para processamento de gabaritos OMR",
    version="1.0.0",
)


ensure_storage_dirs(settings)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"]
)
app.mount("/static", StaticFiles(directory=settings.static_root), name="static")
app.include_router(audits_router)


@app.on_event("startup")
async def startup_event() -> None:
    ensure_storage_dirs(settings)
    init_db()


app.state.settings = settings  # type: ignore[attr-defined]


@app.get("/")
async def root():
    return {"message": "OMRChecker API está rodando!"}


@app.get("/api/templates")
async def list_templates():
    """Lista todos os templates disponíveis."""

    base_dir = settings.templates_dir
    if not base_dir.exists():
        return {"templates": []}

    templates = sorted(
        item.name
        for item in base_dir.iterdir()
        if item.is_dir() and (item / "template.json").exists()
    )

    return {"templates": templates}


@app.post("/api/process-omr", response_model=ProcessResponse)
async def process_omr(
    file: UploadFile = File(..., description="Arquivo ZIP com as imagens dos gabaritos"),
    template: str = Form(..., description="Nome do template a ser usado"),
    audit_token: Optional[str] = Header(default=None, alias="X-Audit-Token"),
    session: Session = Depends(get_session),
):
    """Processa um conjunto de imagens OMR usando o template especificado."""

    logger.info(f"Iniciando processamento OMR: template={template}, arquivo={file.filename}")

    # Rate limiting: only one processing at a time (MVP single-user approach)
    with acquire_processing_lock():
        if settings.audit_token and audit_token != settings.audit_token:
            logger.warning(f"Tentativa de acesso não autorizado ao processamento OMR")
            raise HTTPException(status_code=401, detail="Token de auditoria inválido")

        # Validate template name for security
        if not validate_template_name(template):
            raise HTTPException(
                status_code=400,
                detail="Nome do template inválido ou perigoso"
            )

        if not file.filename or not file.filename.lower().endswith(".zip"):
            raise HTTPException(status_code=400, detail="O arquivo deve ser um ZIP")

        if not FileHandler.validate_template_exists(template):
            raise HTTPException(
                status_code=404,
                detail=(
                    f"Template '{template}' não encontrado. Use /api/templates para listar os disponíveis."
                ),
            )

        ensure_storage_dirs(settings)
        temp_root = settings.temp_root
        temp_root.mkdir(parents=True, exist_ok=True)
        temp_dir = Path(tempfile.mkdtemp(prefix="audit_", dir=str(temp_root)))

        try:
            content = await file.read()
            max_bytes = settings.max_zip_size_mb * 1024 * 1024
            if len(content) > max_bytes:
                raise HTTPException(
                    status_code=400,
                    detail=f"Arquivo ZIP excede o limite de {settings.max_zip_size_mb}MB",
                )

            try:
                image_files = FileHandler.extract_zip(content, temp_dir)
            except ValueError as exc:
                raise HTTPException(status_code=400, detail=str(exc)) from exc

            if not image_files:
                raise HTTPException(
                    status_code=400,
                    detail="Nenhuma imagem válida encontrada no ZIP",
                )

            success, message = FileHandler.copy_template_files(template, temp_dir)
            if not success:
                raise HTTPException(status_code=500, detail=message)

            logger.info(f"Processando {len(image_files)} imagens com template {template}")

            response = OMRProcessor.process_omr_files(
                image_files=image_files,
                template_name=template,
                temp_dir=str(temp_dir),
                session=session,
                settings=settings,
            )

            logger.info(f"Processamento concluído: batch_id={response.summary.get('batch_id')}, total={response.summary.get('total')}, processados={response.summary.get('processed')}")
            return response
        except HTTPException:
            raise
        except Exception as exc:  # noqa: BLE001
            logger.error(f"Erro fatal no processamento OMR: {exc}", exc_info=True)
            raise HTTPException(
                status_code=500,
                detail=f"Erro no processamento: {exc}",
            ) from exc
        finally:
            FileHandler.cleanup_temp_dir(temp_dir)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            error=exc.detail,
            details=str(exc),
        ).dict(),
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)