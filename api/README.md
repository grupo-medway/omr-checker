# OMRChecker API

API REST para processamento de gabaritos OMR (Optical Mark Recognition).

## Instalação

1. Instale as dependências:
```bash
pip install fastapi uvicorn python-multipart
```

## Executando a API

```bash
# Da raiz do projeto OMRChecker
uvicorn api.main:app --reload
```

A API estará disponível em http://localhost:8000

## Documentação Interativa

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Endpoints

### 1. Listar Templates Disponíveis

```bash
GET /api/templates
```

Retorna lista de templates disponíveis no diretório `samples/`.

### 2. Processar Gabaritos

```bash
POST /api/process-omr
```

**Parâmetros:**
- `file`: Arquivo ZIP contendo as imagens dos gabaritos (PNG/JPG)
- `template`: Nome do template a ser usado

**Resposta:**
```json
{
  "status": "success",
  "results": [
    {
      "filename": "gabarito_001.jpg",
      "data": {
        "matricula1": "1",
        "matricula2": "2",
        "matricula3": "3",
        "matricula4": "4",
        "matricula5": "5",
        "lingua1": "ING",
        "q1": "A",
        "q2": "B",
        "q3": "C"
      },
      "processed_image": "base64...",
      "warnings": []
    }
  ],
  "summary": {
    "total": 10,
    "processed": 10,
    "errors": 0
  }
}
```

## Exemplo de Uso

### Python
```python
import requests

# Listar templates
response = requests.get("http://localhost:8000/api/templates")
templates = response.json()["templates"]

# Processar gabaritos
with open("gabaritos.zip", "rb") as f:
    files = {"file": ("gabaritos.zip", f, "application/zip")}
    data = {"template": "medway"}
    
    response = requests.post(
        "http://localhost:8000/api/process-omr",
        files=files,
        data=data
    )
    
    result = response.json()
```

### cURL
```bash
# Listar templates
curl http://localhost:8000/api/templates

# Processar gabaritos
curl -X POST http://localhost:8000/api/process-omr \
  -F "file=@gabaritos.zip" \
  -F "template=medway"
```

## Script de Teste

Execute o script de teste fornecido:

```bash
python test_api.py
```

## Estrutura do Projeto

```
api/
├── __init__.py
├── main.py              # Endpoints da API
├── models.py            # Modelos de dados
├── services/
│   └── omr_processor.py # Lógica de processamento
└── utils/
    └── file_handler.py  # Manipulação de arquivos
```

## Notas de Segurança

- A API valida o conteúdo do ZIP para prevenir path traversal
- Limita tipos de arquivo aceitos (apenas imagens)
- Remove arquivos temporários após processamento
- Recomenda-se adicionar autenticação em produção