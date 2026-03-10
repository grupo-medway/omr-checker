# OMRChecker API

API REST para processamento de cartoes OMR com contrato de jobs em `/v1`.

## Executando

```bash
uvicorn api.main:app --reload
```

## Variaveis de ambiente

- `OMR_API_TOKEN`: bearer token usado nos endpoints `/v1/**`
- `OMR_HEADLESS=1`: forca execucao sem GUI
- `OMR_JOB_STORAGE_DIR`: diretorio base dos jobs temporarios
- `OMR_JOB_TTL_SECONDS`: TTL dos jobs persistidos em disco
- `OMR_MAX_UPLOAD_BYTES`: tamanho maximo do ZIP
- `OMR_MAX_UNCOMPRESSED_BYTES`: limite total descompactado aceito do ZIP
- `OMR_MAX_IMAGES_PER_JOB`: quantidade maxima de imagens por job

## Endpoints v1

### `GET /healthz`

Health check sem autenticacao.

### `GET /v1/templates`

Lista templates tecnicos registrados em `samples/*/manifest.json`.

### `GET /v1/templates/{template_id}`

Retorna os metadados de um template especifico.

### `POST /v1/omr-jobs`

Abre e processa um job OMR de forma sincrona, mas com payload em formato de job.

Campos `multipart/form-data`:

- `file`: ZIP com imagens `.png`, `.jpg` ou `.jpeg`
- `template_id`: ID tecnico do template
- `source_type`: tipo do fluxo chamador
- `source_id`: opcional
- `metadata`: JSON opcional em string

### `GET /v1/omr-jobs/{job_id}`

Retorna o resultado bruto normalizado por folha.

### `GET /v1/omr-jobs/{job_id}/sheets/{sheet_id}/artifacts/annotated`

Serve a imagem anotada da folha quando o artefato existe.

## Autenticacao

Todos os endpoints `/v1/**` e os wrappers legados em `/api/*` usam `Authorization: Bearer <token>` quando `OMR_API_TOKEN` estiver definido.

## Payload por folha

Cada folha retorna:

- `status`: `processed | needs_review | failed`
- `student_identifier`
- `language`
- `answers_raw`
- `flags`
- `confidence_summary`
- `review_artifacts.annotated_image_url`

Flags suportadas hoje:

- `multi_mark_qN`
- `missing_identifier`
- `partial_identifier`
- `missing_language`
- `processing_error`

## Templates

Cada template produtivo precisa de:

- `manifest.json`
- `template.json`
- `config.json`
- arquivos auxiliares do pre-processor, quando existirem

O manifesto valida:

- identidade publica (`id`, `name`, `version`, `is_active`)
- contagem de questoes
- presenca/ausencia de identificador do aluno
- presenca/ausencia de campo de lingua

## Compatibilidade legada

Os endpoints antigos continuam disponiveis por uma iteracao:

- `GET /api/templates`
- `POST /api/process-omr`

Eles funcionam como wrappers sobre a nova camada de jobs, mantendo o formato legado de resposta.
