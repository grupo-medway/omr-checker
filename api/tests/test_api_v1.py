import json
import zipfile
from pathlib import Path
import time

from fastapi.testclient import TestClient

from api.config import Settings
from api.job_store import JobStore
from api.main import app, get_processor
from api.services import OMRProcessor
from api.template_registry import TemplateRegistry
from src.tests.test_samples.sample2.boilerplate import CONFIG_BOILERPLATE, TEMPLATE_BOILERPLATE


def _write_json(path: Path, payload: dict):
    path.write_text(json.dumps(payload), encoding="utf-8")


def _build_test_processor(tmp_path: Path) -> OMRProcessor:
    registry_root = tmp_path / "templates"
    template_dir = registry_root / "sample1-template"
    template_dir.mkdir(parents=True)

    _write_json(template_dir / "template.json", TEMPLATE_BOILERPLATE)
    _write_json(template_dir / "config.json", CONFIG_BOILERPLATE)
    _write_json(
        template_dir / "manifest.json",
        {
            "id": "sample2-template",
            "name": "Sample 2 Template",
            "school": "Test",
            "card_brand_or_model": "Paper",
            "application_label": "sample2",
            "question_count": 34,
            "areas": ["TEST"],
            "student_identifier_schema": "none",
            "language_schema": "none",
            "version": "1.0.0",
            "is_active": True,
        },
    )
    (template_dir / "omr_marker.jpg").write_bytes(
        Path("src/tests/test_samples/sample2/omr_marker.jpg").read_bytes()
    )

    settings = Settings(
        api_token="test-token",
        jobs_root=tmp_path / "jobs",
        jobs_ttl_seconds=3600,
        max_upload_bytes=5 * 1024 * 1024,
        max_uncompressed_bytes=20 * 1024 * 1024,
        max_images_per_job=10,
        allowed_extensions=(".png", ".jpg", ".jpeg"),
    )
    return OMRProcessor(
        registry=TemplateRegistry(registry_root),
        job_store=JobStore(settings.jobs_root, settings.jobs_ttl_seconds),
        settings=settings,
    )


def _build_zip(zip_path: Path, image_path: Path):
    with zipfile.ZipFile(zip_path, "w") as archive:
        archive.write(image_path, arcname=image_path.name)


def test_v1_job_flow(monkeypatch, tmp_path):
    monkeypatch.setenv("OMR_API_TOKEN", "test-token")
    monkeypatch.setenv("OMR_HEADLESS", "1")

    processor = _build_test_processor(tmp_path)
    app.dependency_overrides[get_processor] = lambda: processor
    client = TestClient(app)

    image_path = Path("src/tests/test_samples/sample2/sample.jpg")
    zip_path = tmp_path / "upload.zip"
    _build_zip(zip_path, image_path)

    with open(zip_path, "rb") as file:
        response = client.post(
                "/v1/omr-jobs",
                headers={"Authorization": "Bearer test-token"},
                data={"template_id": "sample2-template", "source_type": "generic"},
                files={"file": ("upload.zip", file, "application/zip")},
            )

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["job_id"]
    assert payload["status"] == "completed"
    assert payload["summary"]["total"] == 1
    assert payload["sheets"][0]["filename"] == "sample.jpg"
    assert payload["sheets"][0]["review_artifacts"]["annotated_image_url"]
    assert "attention_flags" in payload["sheets"][0]
    assert isinstance(payload["sheets"][0]["attention_flags"], list)

    job_response = client.get(
        f"/v1/omr-jobs/{payload['job_id']}",
        headers={"Authorization": "Bearer test-token"},
    )
    assert job_response.status_code == 200
    assert job_response.json()["job_id"] == payload["job_id"]
    assert isinstance(job_response.json()["sheets"][0]["attention_flags"], list)

    artifact_url = payload["sheets"][0]["review_artifacts"]["annotated_image_url"]
    artifact_response = client.get(
        artifact_url,
        headers={"Authorization": "Bearer test-token"},
    )
    assert artifact_response.status_code == 200
    assert artifact_response.content

    list_response = client.get(
        "/v1/templates",
        headers={"Authorization": "Bearer test-token"},
    )
    assert list_response.status_code == 200
    assert list_response.json()["templates"][0]["id"] == "sample2-template"

    app.dependency_overrides.clear()


def test_v1_requires_auth(monkeypatch, tmp_path):
    monkeypatch.setenv("OMR_API_TOKEN", "test-token")
    processor = _build_test_processor(tmp_path)
    app.dependency_overrides[get_processor] = lambda: processor
    client = TestClient(app)

    response = client.get("/v1/templates")
    assert response.status_code == 401

    app.dependency_overrides.clear()


def test_legacy_routes_require_auth(monkeypatch, tmp_path):
    monkeypatch.setenv("OMR_API_TOKEN", "test-token")
    monkeypatch.setenv("OMR_HEADLESS", "1")

    processor = _build_test_processor(tmp_path)
    app.dependency_overrides[get_processor] = lambda: processor
    client = TestClient(app)

    templates_response = client.get("/api/templates")
    assert templates_response.status_code == 401

    image_path = Path("src/tests/test_samples/sample2/sample.jpg")
    zip_path = tmp_path / "upload.zip"
    _build_zip(zip_path, image_path)
    with open(zip_path, "rb") as file:
        process_response = client.post(
            "/api/process-omr",
            data={"template": "sample2-template"},
            files={"file": ("upload.zip", file, "application/zip")},
        )

    assert process_response.status_code == 401
    app.dependency_overrides.clear()


def test_v1_rejects_unknown_template(monkeypatch, tmp_path):
    monkeypatch.setenv("OMR_API_TOKEN", "test-token")
    processor = _build_test_processor(tmp_path)
    app.dependency_overrides[get_processor] = lambda: processor
    client = TestClient(app)

    image_path = Path("src/tests/test_samples/sample2/sample.jpg")
    zip_path = tmp_path / "upload.zip"
    _build_zip(zip_path, image_path)

    with open(zip_path, "rb") as file:
        response = client.post(
            "/v1/omr-jobs",
            headers={"Authorization": "Bearer test-token"},
            data={"template_id": "missing-template", "source_type": "generic"},
            files={"file": ("upload.zip", file, "application/zip")},
        )

    assert response.status_code == 404
    app.dependency_overrides.clear()


def test_v1_rejects_invalid_zip(monkeypatch, tmp_path):
    monkeypatch.setenv("OMR_API_TOKEN", "test-token")
    processor = _build_test_processor(tmp_path)
    app.dependency_overrides[get_processor] = lambda: processor
    client = TestClient(app)

    response = client.post(
        "/v1/omr-jobs",
        headers={"Authorization": "Bearer test-token"},
        data={"template_id": "sample2-template", "source_type": "generic"},
        files={"file": ("upload.zip", b"not-a-real-zip", "application/zip")},
    )

    assert response.status_code == 400
    app.dependency_overrides.clear()


def test_v1_settings_follow_current_env(monkeypatch, tmp_path):
    monkeypatch.setenv("OMR_API_TOKEN", "first-token")
    processor = _build_test_processor(tmp_path / "first")
    app.dependency_overrides[get_processor] = lambda: processor
    client = TestClient(app)

    response = client.get(
        "/v1/templates",
        headers={"Authorization": "Bearer wrong-token"},
    )
    assert response.status_code == 401

    app.dependency_overrides.clear()

    monkeypatch.setenv("OMR_API_TOKEN", "second-token")
    processor = _build_test_processor(tmp_path / "second")
    app.dependency_overrides[get_processor] = lambda: processor
    client = TestClient(app)

    response = client.get(
        "/v1/templates",
        headers={"Authorization": "Bearer second-token"},
    )
    assert response.status_code == 200

    app.dependency_overrides.clear()
