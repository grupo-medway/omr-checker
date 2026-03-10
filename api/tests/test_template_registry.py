import json
from pathlib import Path

import pytest

from api.template_registry import TemplateRegistry, TemplateRegistryError


def _write_json(path: Path, payload: dict):
    path.write_text(json.dumps(payload), encoding="utf-8")


def test_registry_ignores_directories_without_manifest(tmp_path):
    template_dir = tmp_path / "without-manifest"
    template_dir.mkdir()
    _write_json(
        template_dir / "template.json",
        {
            "pageDimensions": [300, 400],
            "bubbleDimensions": [10, 10],
            "preProcessors": [],
            "fieldBlocks": {
                "answers": {
                    "fieldType": "QTYPE_MCQ5",
                    "origin": [10, 10],
                    "bubblesGap": 5,
                    "labelsGap": 10,
                    "fieldLabels": ["q1..2"],
                }
            },
        },
    )
    _write_json(template_dir / "config.json", {})

    registry = TemplateRegistry(tmp_path)
    assert registry.list_templates() == []


def test_registry_rejects_invalid_manifest(tmp_path):
    template_dir = tmp_path / "invalid-template"
    template_dir.mkdir()
    _write_json(
        template_dir / "template.json",
        {
            "pageDimensions": [300, 400],
            "bubbleDimensions": [10, 10],
            "preProcessors": [],
            "fieldBlocks": {
                "answers": {
                    "fieldType": "QTYPE_MCQ5",
                    "origin": [10, 10],
                    "bubblesGap": 5,
                    "labelsGap": 10,
                    "fieldLabels": ["q1..2"],
                }
            },
        },
    )
    _write_json(template_dir / "config.json", {})
    _write_json(
        template_dir / "manifest.json",
        {
            "id": "invalid-template",
            "name": "Invalid Template",
            "school": "Test",
            "card_brand_or_model": "Paper",
            "application_label": "invalid",
            "question_count": 999,
            "areas": ["TEST"],
            "student_identifier_schema": "none",
            "language_schema": "none",
            "version": "1.0.0",
            "is_active": True,
        },
    )

    registry = TemplateRegistry(tmp_path)
    with pytest.raises(TemplateRegistryError):
        registry.list_templates()


def test_registry_reflects_new_manifest_without_restarting(tmp_path):
    registry = TemplateRegistry(tmp_path)
    assert registry.list_templates() == []

    template_dir = tmp_path / "dynamic-template"
    template_dir.mkdir()
    _write_json(
        template_dir / "template.json",
        {
            "pageDimensions": [300, 400],
            "bubbleDimensions": [10, 10],
            "preProcessors": [],
            "fieldBlocks": {
                "answers": {
                    "fieldType": "QTYPE_MCQ5",
                    "origin": [10, 10],
                    "bubblesGap": 5,
                    "labelsGap": 10,
                    "fieldLabels": ["q1..2"],
                }
            },
        },
    )
    _write_json(template_dir / "config.json", {})
    _write_json(
        template_dir / "manifest.json",
        {
            "id": "dynamic-template",
            "name": "Dynamic Template",
            "school": "Test",
            "card_brand_or_model": "Paper",
            "application_label": "dynamic",
            "question_count": 2,
            "areas": ["TEST"],
            "student_identifier_schema": "none",
            "language_schema": "none",
            "version": "1.0.0",
            "is_active": True,
        },
    )

    templates = registry.list_templates()
    assert len(templates) == 1
    assert templates[0].manifest.id == "dynamic-template"
