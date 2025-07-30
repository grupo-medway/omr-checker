from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
import tempfile
import os
from typing import Optional

from api.models import ProcessResponse, ErrorResponse
from api.services import OMRProcessor
from api.utils import FileHandler

app = FastAPI(
    title="OMRChecker API",
    description="API para processamento de gabaritos OMR",
    version="1.0.0"
)


@app.get("/")
async def root():
    return {"message": "OMRChecker API está rodando!"}


@app.get("/api/templates")
async def list_templates():
    """Lista todos os templates disponíveis"""
    samples_dir = "samples"
    templates = []
    
    if os.path.exists(samples_dir):
        for item in os.listdir(samples_dir):
            template_path = os.path.join(samples_dir, item)
            if os.path.isdir(template_path):
                # Verificar se tem template.json
                if os.path.exists(os.path.join(template_path, "template.json")):
                    templates.append(item)
    
    return {"templates": templates}


@app.post("/api/process-omr", response_model=ProcessResponse)
async def process_omr(
    file: UploadFile = File(..., description="Arquivo ZIP com as imagens dos gabaritos"),
    template: str = Form(..., description="Nome do template a ser usado")
):
    """
    Processa um conjunto de imagens OMR usando o template especificado
    
    - **file**: Arquivo ZIP contendo as imagens dos gabaritos
    - **template**: Nome do template (deve existir em samples/)
    """
    
    # Validação do arquivo
    if not file.filename.endswith('.zip'):
        raise HTTPException(
            status_code=400, 
            detail="O arquivo deve ser um ZIP"
        )
    
    # Validação do template
    if not FileHandler.validate_template_exists(template):
        raise HTTPException(
            status_code=404,
            detail=f"Template '{template}' não encontrado. Use /api/templates para listar os disponíveis."
        )
    
    # Criar diretório temporário
    temp_dir = tempfile.mkdtemp()
    
    try:
        # Ler conteúdo do arquivo
        content = await file.read()
        
        # Extrair arquivos ZIP
        try:
            image_files = FileHandler.extract_zip(content, temp_dir)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        
        if not image_files:
            raise HTTPException(
                status_code=400,
                detail="Nenhuma imagem válida encontrada no ZIP"
            )
        
        # Copiar arquivos do template
        success, message = FileHandler.copy_template_files(template, temp_dir)
        if not success:
            raise HTTPException(status_code=500, detail=message)
        
        # Processar arquivos
        response = OMRProcessor.process_omr_files(
            image_files=image_files,
            template_name=template,
            temp_dir=temp_dir
        )
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro no processamento: {str(e)}"
        )
    finally:
        # Limpar diretório temporário
        FileHandler.cleanup_temp_dir(temp_dir)


@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            error=exc.detail,
            details=str(exc)
        ).dict()
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)