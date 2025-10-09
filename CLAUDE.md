# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OMR Checker is a system for reading and correcting OMR (Optical Mark Recognition) sheets using computer vision. The project has three main components:

1. **Core OMR Engine** (`src/`, `main.py`): Python-based CV processing using OpenCV
2. **REST API** (`api/`): FastAPI backend with audit workflow and database persistence
3. **Web Frontend** (`web/`): Next.js 15 application for auditing processed results

## Development Commands

### Core OMR Processing

```bash
# Run OMR processing on sample data
python3 main.py

# Visual configuration mode (CRITICAL for template setup)
python3 main.py --setLayout

# Process specific directory
python3 main.py -i ./samples/evolucional-dia1 -o ./outputs

# With auto-alignment (experimental)
python3 main.py --autoAlign -i ./samples/sample-dir
```

### API Development

```bash
# Run API server with hot reload
uvicorn api.main:app --reload

# API will be available at:
# - http://localhost:8000
# - Swagger docs: http://localhost:8000/docs
# - ReDoc: http://localhost:8000/redoc
```

### Web Frontend

```bash
cd web
npm run dev     # Development server on http://localhost:3000
npm run build   # Production build
npm run start   # Production server
npm run lint    # ESLint
```

### Testing

```bash
# Run all tests
pytest

# Run specific test
pytest tests/api/test_audit_flow.py

# Run with verbose output
pytest -v

# The pre-commit hook runs: pytest -k sample1
# The pre-push hook runs: pytest with all tests
```

### Code Quality

```bash
# Install pre-commit hooks (required for development)
pre-commit install --install-hooks

# Run pre-commit manually
pre-commit run --all-files

# Format with black
black .

# Sort imports with isort
isort --profile black .
```

## Architecture

### OMR Processing Pipeline

The core processing flow (`src/core.py`, `src/entry.py`):

1. **Image Loading**: Load scanned OMR sheets from `inputs/` directory
2. **Pre-processing**: Apply filters defined in `template.json` (CLAHE, morphology, thresholding)
3. **Template Matching**: Align image to template reference using `template_reference.jpg`
4. **Bubble Detection**: Read marked bubbles based on `fieldBlocks` coordinates in template
5. **Response Extraction**: Convert bubble positions to answers (A/B/C/D, matricula digits, etc.)
6. **Output**: Generate CSV results and marked images in `outputs/`

Key classes:
- `Template` (src/template.py): Loads and validates template.json configuration
- `ImageInstanceOps` (src/core.py): Image processing operations per batch
- `PROCESSOR_MANAGER` (src/processors/): Manages pre-processor plugins

### Template Configuration

Templates live in `samples/*/` directories. Each template requires:

- `template.json`: Field blocks, bubble dimensions, page dimensions, pre-processors
- `template_reference.jpg`: Reference image for alignment
- `config.json`: Tuning parameters (thresholds, alignment, display settings)

**IMPORTANT**: Always use `--setLayout` mode first to visualize template alignment before processing real data.

### API Architecture

The API (`api/main.py`) provides:

1. **Template Management**: List available templates from `samples/`
2. **OMR Processing**: Accept ZIP of images, process with specified template
3. **Audit Workflow**: Track problematic responses for manual review

Key components:
- `api/services/omr_processor.py`: Integrates core OMR engine with API
- `api/services/audit_registry.py`: Manages audit items and database persistence
- `api/db/models.py`: SQLModel entities (AuditItem, AuditResponse)
- `api/routes/audits.py`: REST endpoints for audit workflow

Database is SQLite by default, configured via `api/db/config.py`.

### Audit System Flow

1. API processes OMR images and detects issues (unmarked, multi-marked, invalid)
2. Problematic responses are saved as `AuditItem` with status=PENDING
3. Frontend fetches pending items via `/api/audits` endpoint
4. User reviews image, corrects responses, updates status (RESOLVED/REOPENED)
5. Corrected data is persisted in `AuditResponse` table

Static files (images) are served from `/static/` and stored in `storage/` directory.

### Web Frontend

- Next.js 15 with App Router
- TailwindCSS 4 + Radix UI components
- TypeScript with strict mode
- Components in `web/components/`, pages in `web/app/`

## Dependencies

Core: `opencv-python`, `numpy`, `pandas`, `rich` (console output)
API: `fastapi`, `uvicorn`, `sqlmodel`, `pydantic-settings`
Frontend: `next`, `react`, `tailwindcss`

## Environment Variables

Configure via `.env` file:

```bash
# API Configuration
AUDIT_TOKEN=your-secret-token    # Optional: Enables X-Audit-Token authentication
MAX_ZIP_SIZE_MB=50               # Maximum upload size
TEMPLATES_DIR=./samples          # Template directory
STATIC_ROOT=./storage            # Static file storage
DATABASE_URL=sqlite:///./audit.db  # Database connection
```

## Git Workflow

Pre-commit hooks enforce:
- black formatting (line length: 88)
- isort import sorting (black profile)
- flake8 linting (ignores: E501, W503, E203, E741, F541)
- pytest sample1 test must pass

Pre-push hooks require:
- All pytest tests must pass

Railway deployment ignores `web/` directory (configured in `railway.json`).

## Testing Strategy

Tests are in:
- `src/tests/`: Core OMR engine tests
- `tests/`: API and integration tests

Test configuration in `pytest.ini`:
- Test paths: `src/tests`, `tests`
- Options: `-qq --capture=no` (quiet mode, show print statements)

## Common Gotchas

1. **OpenCV headless**: Production uses `opencv-python-headless` in Docker, dev uses `opencv-python`
2. **Template paths**: Templates must have both `template.json` AND `template_reference.jpg` to be valid
3. **Image alignment**: Auto-align (`--autoAlign`) is experimental; manual template tuning is more reliable
4. **Audit tokens**: If `AUDIT_TOKEN` is set, all `/api/process-omr` requests need `X-Audit-Token` header
5. **File cleanup**: API cleans up temp files in `finally` blocks; don't rely on temp data persisting
