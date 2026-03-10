import csv
import json
from pathlib import Path

from api.config import Settings
from api.job_store import JobStore
from api.services import OMRProcessor
from api.template_registry import TemplateRegistry


def _write_json(path: Path, payload: dict):
    path.write_text(json.dumps(payload), encoding="utf-8")


def test_sheet_normalization_maps_processed_review_and_failed(tmp_path):
    registry_root = tmp_path / "templates"
    template_dir = registry_root / "unit-template"
    template_dir.mkdir(parents=True)

    _write_json(
        template_dir / "template.json",
        {
            "pageDimensions": [300, 400],
            "bubbleDimensions": [10, 10],
            "preProcessors": [],
            "customLabels": {"matricula": ["matricula1..3"]},
            "fieldBlocks": {
                "identifier": {
                    "fieldType": "QTYPE_INT",
                    "origin": [10, 10],
                    "bubblesGap": 5,
                    "labelsGap": 10,
                    "fieldLabels": ["matricula1..3"],
                },
                "answers": {
                    "fieldType": "QTYPE_MCQ5",
                    "origin": [100, 10],
                    "bubblesGap": 5,
                    "labelsGap": 10,
                    "fieldLabels": ["q1..2"],
                },
            },
        },
    )
    _write_json(template_dir / "config.json", {})
    _write_json(
        template_dir / "manifest.json",
        {
            "id": "unit-template",
            "name": "Unit Template",
            "school": "Test",
            "card_brand_or_model": "Paper",
            "application_label": "unit",
            "question_count": 2,
            "areas": ["TEST"],
            "student_identifier_schema": "ra_bubbles",
            "language_schema": "none",
            "version": "1.0.0",
            "is_active": True,
        },
    )

    settings = Settings(
        api_token="",
        jobs_root=tmp_path / "jobs",
        jobs_ttl_seconds=3600,
        max_upload_bytes=1024 * 1024,
        max_uncompressed_bytes=4 * 1024 * 1024,
        max_images_per_job=10,
        allowed_extensions=(".png", ".jpg", ".jpeg"),
    )
    processor = OMRProcessor(
        registry=TemplateRegistry(registry_root),
        job_store=JobStore(settings.jobs_root, settings.jobs_ttl_seconds),
        settings=settings,
    )
    template = processor.registry.get_template("unit-template")

    workspace = tmp_path / "workspace"
    (workspace / "outputs" / "Results").mkdir(parents=True)
    (workspace / "outputs" / "Manual").mkdir(parents=True)
    (workspace / "outputs" / "CheckedOMRs").mkdir(parents=True)

    with open(workspace / "outputs" / "Results" / "Results_01AM.csv", "w", newline="", encoding="utf-8") as file:
        writer = csv.writer(file)
        writer.writerow(["file_id", "input_path", "output_path", "score", "matricula", "q1", "q2"])
        writer.writerow(
            [
                "scan-1.png",
                "scan-1.png",
                str(workspace / "outputs" / "CheckedOMRs" / "scan-1.png"),
                "0",
                "12",
                "AB",
                "D",
            ]
        )

    with open(workspace / "outputs" / "Manual" / "ErrorFiles.csv", "w", newline="", encoding="utf-8") as file:
        writer = csv.writer(file)
        writer.writerow(["file_id", "input_path", "output_path", "score", "matricula", "q1", "q2"])
        writer.writerow(["scan-2.png", "scan-2.png", "", "NA", "", "", ""])

    with open(workspace / "outputs" / "Manual" / "MultiMarkedFiles.csv", "w", newline="", encoding="utf-8") as file:
        writer = csv.writer(file)
        writer.writerow(["file_id", "input_path", "output_path", "score", "matricula", "q1", "q2"])

    (workspace / "outputs" / "CheckedOMRs" / "scan-1.png").write_bytes(b"fake-image")

    sheets = processor._collect_sheet_results(
        job_id="job-1",
        workspace=workspace,
        template=template,
        image_files=[workspace / "scan-1.png", workspace / "scan-2.png"],
    )

    first_sheet = next(sheet for sheet in sheets if sheet["filename"] == "scan-1.png")
    second_sheet = next(sheet for sheet in sheets if sheet["filename"] == "scan-2.png")

    assert first_sheet["status"] == "needs_review"
    assert "multi_mark_q1" in first_sheet["flags"]
    assert "partial_identifier" in first_sheet["flags"]
    assert first_sheet["annotated_image_url"].endswith("/artifacts/annotated")

    assert second_sheet["status"] == "failed"
    assert second_sheet["flags"] == ["processing_error"]


def test_to_legacy_response_keeps_legacy_shape_and_ignores_failed_sheets(tmp_path):
    processor = OMRProcessor()
    artifact_path = tmp_path / "annotated.png"
    artifact_path.write_bytes(b"fake-image")

    response = processor.to_legacy_response(
        {
            "status": "completed",
            "summary": {"total": 2, "processed": 1, "needs_review": 0, "failed": 1},
            "errors": [],
            "sheets": [
                {
                    "filename": "scan-1.png",
                    "legacy_data": {"matricula1": "1", "matricula2": "2", "q1": "A"},
                    "annotated_image_path": str(artifact_path),
                },
                {
                    "filename": "scan-2.png",
                    "legacy_data": None,
                    "annotated_image_path": None,
                },
            ],
        }
    )

    assert response.status == "success"
    assert response.summary == {"total": 2, "processed": 1, "errors": 1}
    assert response.errors is None
    assert len(response.results) == 1
    assert response.results[0].data == {"matricula1": "1", "matricula2": "2", "q1": "A"}
    assert response.results[0].warnings == []


def test_normalized_result_keeps_legacy_data_only_for_results_rows(tmp_path):
    registry_root = tmp_path / "templates"
    template_dir = registry_root / "unit-template"
    template_dir.mkdir(parents=True)

    _write_json(
        template_dir / "template.json",
        {
            "pageDimensions": [300, 400],
            "bubbleDimensions": [10, 10],
            "preProcessors": [],
            "customLabels": {"matricula": ["matricula1..3"]},
            "fieldBlocks": {
                "identifier": {
                    "fieldType": "QTYPE_INT",
                    "origin": [10, 10],
                    "bubblesGap": 5,
                    "labelsGap": 10,
                    "fieldLabels": ["matricula1..3"],
                },
                "answers": {
                    "fieldType": "QTYPE_MCQ5",
                    "origin": [100, 10],
                    "bubblesGap": 5,
                    "labelsGap": 10,
                    "fieldLabels": ["q1..2"],
                },
            },
        },
    )
    _write_json(template_dir / "config.json", {})
    _write_json(
        template_dir / "manifest.json",
        {
            "id": "unit-template",
            "name": "Unit Template",
            "school": "Test",
            "card_brand_or_model": "Paper",
            "application_label": "unit",
            "question_count": 2,
            "areas": ["TEST"],
            "student_identifier_schema": "ra_bubbles",
            "language_schema": "none",
            "version": "1.0.0",
            "is_active": True,
        },
    )

    settings = Settings(
        api_token="",
        jobs_root=tmp_path / "jobs",
        jobs_ttl_seconds=3600,
        max_upload_bytes=1024 * 1024,
        max_uncompressed_bytes=4 * 1024 * 1024,
        max_images_per_job=10,
        allowed_extensions=(".png", ".jpg", ".jpeg"),
    )
    processor = OMRProcessor(
        registry=TemplateRegistry(registry_root),
        job_store=JobStore(settings.jobs_root, settings.jobs_ttl_seconds),
        settings=settings,
    )
    template = processor.registry.get_template("unit-template")
    workspace = tmp_path / "workspace"
    (workspace / "outputs" / "CheckedOMRs").mkdir(parents=True)
    (workspace / "outputs" / "CheckedOMRs" / "scan-1.png").write_bytes(b"fake-image")

    result_sheet = processor._normalize_sheet(
        job_id="job-1",
        filename="scan-1.png",
        template=template,
        row_bundle={
            "kind": "results",
            "row": {
                "file_id": "scan-1.png",
                "input_path": "scan-1.png",
                "output_path": str(workspace / "outputs" / "CheckedOMRs" / "scan-1.png"),
                "score": "0",
                "matricula1": "1",
                "matricula2": "2",
                "matricula3": "",
                "q1": "A",
                "q2": "B",
            },
        },
        workspace=workspace,
    )
    error_sheet = processor._normalize_sheet(
        job_id="job-1",
        filename="scan-2.png",
        template=template,
        row_bundle={
            "kind": "errors",
            "row": {
                "file_id": "scan-2.png",
                "input_path": "scan-2.png",
                "output_path": "",
                "score": "NA",
                "matricula1": "",
                "q1": "",
                "q2": "",
            },
        },
        workspace=workspace,
    )

    assert result_sheet["legacy_data"] == {
        "matricula1": "1",
        "matricula2": "2",
        "matricula3": "",
        "q1": "A",
        "q2": "B",
    }
    assert error_sheet["legacy_data"] is None
