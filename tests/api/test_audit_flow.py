from __future__ import annotations

import csv
import importlib
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from api.db.models import AuditItem
from api.services.audit_registry import ProcessedRecord, register_audit_batch, reconcile_batch
from api.utils.storage import ensure_storage_dirs


def _create_csv(path: Path, rows: list[dict[str, str]]) -> None:
    fieldnames = [
        "file_id",
        "input_path",
        "output_path",
        "score",
        "matricula",
        "lingua",
        "q1",
        "q2",
    ]
    with open(path, "w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


@pytest.fixture
def api_client(audit_env):
    settings, db_session_module = audit_env
    ensure_storage_dirs(settings)
    db_session_module.init_db()

    app_module = importlib.reload(importlib.import_module("api.main"))
    client = TestClient(app_module.app)

    try:
        yield client, settings, db_session_module
    finally:
        client.close()


def test_register_audit_batch_creates_pending_items(api_client, tmp_path):
    client, settings, db_session_module = api_client

    batch_id = "batch-test"
    results_dir = tmp_path / "outputs"
    results_dir.mkdir(parents=True, exist_ok=True)
    csv_path = results_dir / "Results_10AM.csv"

    original_image = tmp_path / "file1.png"
    original_image.write_bytes(b"original")

    marked_image_dir = tmp_path / "marked"
    marked_image_dir.mkdir(parents=True, exist_ok=True)
    marked_image = marked_image_dir / "file1.png"
    marked_image.write_bytes(b"marked")

    _create_csv(
        csv_path,
        [
            {
                "file_id": "file1.png",
                "input_path": str(original_image),
                "output_path": str(marked_image),
                "score": "0",
                "matricula": "123",
                "lingua": "PT",
                "q1": "",
                "q2": "A",
            }
        ],
    )

    record = ProcessedRecord(
        file_id="file1.png",
        answers={"matricula": "123", "lingua": "PT", "q1": "", "q2": "A"},
        question_keys=["q1", "q2"],
        marked_image_path=marked_image,
    )

    with Session(db_session_module.engine) as session:
        summary = register_audit_batch(
            session,
            settings,
            template="template",
            batch_id=batch_id,
            csv_path=csv_path,
            records=[record],
            originals={"file1.png": original_image},
        )

        assert summary.batch_id == batch_id
        assert summary.pending == 1
        item_id = summary.items[0].id

        item = session.get(AuditItem, item_id)
        assert item is not None
        assert item.issues
        assert item.raw_answers["q2"] == "A"
        assert item.image_path is not None

        exported = reconcile_batch(session, settings, batch_id=batch_id)
        assert exported is not None
        assert exported.exists()


def test_decision_endpoint_updates_responses(api_client, tmp_path):
    client, settings, db_session_module = api_client

    batch_id = "batch-endpoint"
    results_dir = tmp_path / "outputs"
    results_dir.mkdir(parents=True, exist_ok=True)
    csv_path = results_dir / "Results_11AM.csv"

    original_image = tmp_path / "file2.png"
    original_image.write_bytes(b"original")

    marked_image = tmp_path / "file2_marked.png"
    marked_image.write_bytes(b"marked")

    _create_csv(
        csv_path,
        [
            {
                "file_id": "file2.png",
                "input_path": str(original_image),
                "output_path": str(marked_image),
                "score": "0",
                "matricula": "456",
                "lingua": "EN",
                "q1": "",
                "q2": "B",
            }
        ],
    )

    record = ProcessedRecord(
        file_id="file2.png",
        answers={"matricula": "456", "lingua": "EN", "q1": "", "q2": "B"},
        question_keys=["q1", "q2"],
        marked_image_path=marked_image,
    )

    with Session(db_session_module.engine) as session:
        summary = register_audit_batch(
            session,
            settings,
            template="template",
            batch_id=batch_id,
            csv_path=csv_path,
            records=[record],
            originals={"file2.png": original_image},
        )

    item_id = summary.items[0].id

    response = client.get("/api/audits")
    assert response.status_code == 200
    data = response.json()
    assert data["pending"] == 1

    decision = client.post(
        f"/api/audits/{item_id}/decision",
        json={"answers": {"q1": "C"}, "notes": "ok"},
    )
    assert decision.status_code == 200
    payload = decision.json()
    assert payload["status"] == "resolved"
    assert payload["notes"] == "ok"
    responses = {resp["question"]: resp for resp in payload["responses"]}
    assert responses["q1"]["corrected_value"] == "C"

    exports_path = settings.exports_dir / batch_id / "Results_Corrigidos.csv"
    assert exports_path.exists()

    with open(exports_path, "r", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        row = next(iter(reader))
        assert row["q1"] == "C"
