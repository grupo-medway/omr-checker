from pathlib import Path
from typing import Optional

import tempfile

from fastapi import FastAPI, File, Form, Header, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse

from api.db import get_settings, init_db
from api.models import ErrorResponse, ProcessResponse
from api.services import OMRProcessor
from api.utils import FileHandler
from api.utils.storage import ensure_storage_dirs


settings = get_settings()

app = FastAPI(
    title="OMRChecker API",
    description="API para processamento de gabaritos OMR",
    version="1.0.0",
)


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
):
    """Processa um conjunto de imagens OMR usando o template especificado."""

    if settings.audit_token and audit_token != settings.audit_token:
        raise HTTPException(status_code=401, detail="Token de auditoria inválido")

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

        response = OMRProcessor.process_omr_files(
            image_files=image_files,
            template_name=template,
            temp_dir=str(temp_dir),
        )

        return response
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
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