import re
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional

from pydantic import BaseModel

from src.utils.parsing import custom_sort_output_columns, open_template_with_defaults, parse_fields


class TemplateRegistryError(Exception):
    pass


class TemplateManifest(BaseModel):
    id: str
    name: str
    school: str
    card_brand_or_model: str
    application_label: str
    question_count: int
    areas: List[str]
    student_identifier_schema: str
    language_schema: str
    version: str
    is_active: bool


@dataclass(frozen=True)
class RegisteredTemplate:
    manifest: TemplateManifest
    template_dir: Path
    output_columns: List[str]
    question_columns: List[str]
    identifier_field: Optional[str]
    identifier_length: Optional[int]
    language_field: Optional[str]


class TemplateRegistry:
    manifest_filename = "manifest.json"

    def __init__(self, root_dir: Path = Path("samples")):
        self.root_dir = Path(root_dir)

    def _load_all(self) -> List[RegisteredTemplate]:
        if not self.root_dir.exists():
            return []

        templates = []
        for template_dir in sorted(self.root_dir.iterdir()):
            if not template_dir.is_dir():
                continue
            manifest_path = template_dir / self.manifest_filename
            if not manifest_path.exists():
                continue
            templates.append(self._load_registered_template(template_dir, manifest_path))
        return templates

    def list_templates(self) -> List[RegisteredTemplate]:
        return self._load_all()

    def list_manifest_models(self) -> List[TemplateManifest]:
        return [template.manifest for template in self.list_templates()]

    def get_template(self, template_id: str) -> RegisteredTemplate:
        for template in self._load_all():
            if template.manifest.id == template_id:
                return template
        raise TemplateRegistryError(f"Template '{template_id}' not found")

    def _load_registered_template(
        self, template_dir: Path, manifest_path: Path
    ) -> RegisteredTemplate:
        template_json_path = template_dir / "template.json"
        config_json_path = template_dir / "config.json"
        if not template_json_path.exists():
            raise TemplateRegistryError(f"Missing template.json in {template_dir}")
        if not config_json_path.exists():
            raise TemplateRegistryError(f"Missing config.json in {template_dir}")

        manifest = TemplateManifest.model_validate_json(
            manifest_path.read_text(encoding="utf-8")
        )
        template_json = open_template_with_defaults(template_json_path)
        output_columns = self._derive_output_columns(template_json)
        question_columns = [column for column in output_columns if re.fullmatch(r"q\d+", column)]
        identifier_field = self._detect_identifier_field(output_columns)
        identifier_length = self._derive_identifier_length(template_json, identifier_field)
        language_field = "lingua" if "lingua" in output_columns else None

        if manifest.question_count != len(question_columns):
            raise TemplateRegistryError(
                f"Template '{manifest.id}' question_count mismatch: "
                f"manifest={manifest.question_count} layout={len(question_columns)}"
            )

        if manifest.student_identifier_schema == "none" and identifier_field is not None:
            raise TemplateRegistryError(
                f"Template '{manifest.id}' declares no identifier schema but exposes '{identifier_field}'"
            )
        if manifest.student_identifier_schema != "none" and identifier_field is None:
            raise TemplateRegistryError(
                f"Template '{manifest.id}' declares identifier schema but no identifier field was found"
            )

        if manifest.language_schema == "none" and language_field is not None:
            raise TemplateRegistryError(
                f"Template '{manifest.id}' declares no language schema but exposes '{language_field}'"
            )
        if manifest.language_schema != "none" and language_field is None:
            raise TemplateRegistryError(
                f"Template '{manifest.id}' declares language schema but no language field was found"
            )

        return RegisteredTemplate(
            manifest=manifest,
            template_dir=template_dir,
            output_columns=output_columns,
            question_columns=question_columns,
            identifier_field=identifier_field,
            identifier_length=identifier_length,
            language_field=language_field,
        )

    def _derive_output_columns(self, template_json: dict) -> List[str]:
        custom_labels = template_json.get("customLabels", {})
        all_parsed_labels = set()
        for block_name, field_block in template_json["fieldBlocks"].items():
            parsed_labels = parse_fields(
                f"Field Block Labels: {block_name}", field_block["fieldLabels"]
            )
            all_parsed_labels.update(parsed_labels)

        custom_label_map: Dict[str, List[str]] = {}
        custom_label_set = set()
        for custom_label, label_strings in custom_labels.items():
            parsed_labels = parse_fields(f"Custom Label: {custom_label}", label_strings)
            custom_label_map[custom_label] = parsed_labels
            custom_label_set.update(parsed_labels)

        non_custom_columns = sorted(
            list(all_parsed_labels.difference(custom_label_set)),
            key=custom_sort_output_columns,
        )
        if template_json.get("outputColumns"):
            return parse_fields("Output Columns", template_json["outputColumns"])
        return sorted(non_custom_columns + list(custom_label_map.keys()), key=custom_sort_output_columns)

    def _detect_identifier_field(self, output_columns: List[str]) -> Optional[str]:
        if "matricula" in output_columns:
            return "matricula"
        lowered_map = {column.lower(): column for column in output_columns}
        for lowered, original in lowered_map.items():
            if lowered.startswith("roll"):
                return original
        return None

    def _derive_identifier_length(
        self, template_json: dict, identifier_field: Optional[str]
    ) -> Optional[int]:
        if identifier_field is None:
            return None
        custom_labels = template_json.get("customLabels", {})
        if identifier_field in custom_labels:
            return len(parse_fields(identifier_field, custom_labels[identifier_field]))
        return 1
