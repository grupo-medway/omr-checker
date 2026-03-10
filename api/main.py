import json
import os
from typing import Optional

os.environ.setdefault("OMR_HEADLESS", "1")

from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, JSONResponse

from api.auth import require_v1_auth
from api.job_store import JobStoreError
from api.models import ErrorResponse, JobResponse, ProcessResponse, TemplateListResponse
from api.services import OMRProcessingError, OMRProcessor
from api.template_registry import TemplateRegistryError

app = FastAPI(
    title="OMRChecker API",
    description="API para processamento de gabaritos OMR",
    version="1.0.0",
)


def get_processor() -> OMRProcessor:
    return OMRProcessor()


@app.get("/")
async def root():
    return {"message": "OMRChecker API está rodando!"}


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}


@app.get(
    "/v1/templates",
    response_model=TemplateListResponse,
    dependencies=[Depends(require_v1_auth)],
)
async def list_v1_templates(processor: OMRProcessor = Depends(get_processor)):
    return {"templates": processor.list_templates()}


@app.get(
    "/v1/templates/{template_id}",
    dependencies=[Depends(require_v1_auth)],
)
async def get_v1_template(
    template_id: str,
    processor: OMRProcessor = Depends(get_processor),
):
    return processor.get_template(template_id)


@app.post(
    "/v1/omr-jobs",
    response_model=JobResponse,
    dependencies=[Depends(require_v1_auth)],
)
async def create_omr_job(
    file: UploadFile = File(..., description="Arquivo ZIP com as imagens dos gabaritos"),
    template_id: str = Form(...),
    source_type: str = Form(...),
    source_id: Optional[str] = Form(None),
    metadata: Optional[str] = Form(None),
    processor: OMRProcessor = Depends(get_processor),
):
    if not file.filename or not file.filename.lower().endswith(".zip"):
        raise HTTPException(status_code=400, detail="O arquivo deve ser um ZIP")

    parsed_metadata = {}
    if metadata:
        try:
            parsed_metadata = json.loads(metadata)
        except json.JSONDecodeError as exc:
            raise HTTPException(status_code=400, detail=f"Invalid metadata JSON: {exc}")

    content = await file.read()
    job_document = processor.create_job(
        upload_filename=file.filename,
        zip_content=content,
        template_id=template_id,
        source_type=source_type,
        source_id=source_id,
        metadata=parsed_metadata,
    )
    return processor.serialize_job_document(job_document)


@app.get(
    "/v1/omr-jobs/{job_id}",
    response_model=JobResponse,
    dependencies=[Depends(require_v1_auth)],
)
async def get_omr_job(job_id: str, processor: OMRProcessor = Depends(get_processor)):
    return processor.serialize_job_document(processor.get_job(job_id))


@app.get(
    "/v1/omr-jobs/{job_id}/sheets/{sheet_id}/artifacts/annotated",
    dependencies=[Depends(require_v1_auth)],
)
async def get_annotated_artifact(
    job_id: str,
    sheet_id: str,
    processor: OMRProcessor = Depends(get_processor),
):
    artifact_path = processor.get_sheet_artifact_path(job_id, sheet_id)
    return FileResponse(artifact_path)


@app.get("/api/templates", deprecated=True)
async def list_templates(processor: OMRProcessor = Depends(get_processor)):
    manifests = processor.list_templates()
    return {"templates": [manifest.id for manifest in manifests]}


@app.post("/api/process-omr", response_model=ProcessResponse, deprecated=True)
async def process_omr(
    file: UploadFile = File(..., description="Arquivo ZIP com as imagens dos gabaritos"),
    template: str = Form(..., description="Nome do template a ser usado"),
):
    if not file.filename or not file.filename.lower().endswith(".zip"):
        raise HTTPException(status_code=400, detail="O arquivo deve ser um ZIP")

    content = await file.read()
    processor = get_processor()
    job_document = processor.create_job(
        upload_filename=file.filename,
        zip_content=content,
        template_id=template,
        source_type="legacy_api",
    )
    return processor.to_legacy_response(job_document)


@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(error=exc.detail, details=str(exc)).model_dump(by_alias=True),
    )


@app.exception_handler(TemplateRegistryError)
@app.exception_handler(OMRProcessingError)
@app.exception_handler(JobStoreError)
async def omr_exception_handler(request, exc):
    status_code = 400
    if isinstance(exc, TemplateRegistryError):
        status_code = 404 if "not found" in str(exc).lower() else 500
    elif isinstance(exc, JobStoreError):
        status_code = 404

    return JSONResponse(
        status_code=status_code,
        content=ErrorResponse(
            error=str(exc), details=exc.__class__.__name__
        ).model_dump(by_alias=True),
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
