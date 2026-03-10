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
