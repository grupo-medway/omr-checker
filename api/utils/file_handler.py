import base64
import os
import shutil
import zipfile
from pathlib import Path
from typing import Iterable, List, Tuple

from api.db.config import get_settings


settings = get_settings()
VALID_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg"}


def _normalise_suffix(filename: str) -> str:
    return Path(filename).suffix.lower()


def _extension_allowed(filename: str) -> bool:
    return _normalise_suffix(filename) in VALID_IMAGE_EXTENSIONS


def _is_safe_member(member: zipfile.ZipInfo) -> bool:
    name = member.filename
    return not (
        ".." in name
        or name.startswith("/")
        or name.startswith("\\")
    )


def _is_within(base: Path, target: Path) -> bool:
    try:
        target.resolve().relative_to(base.resolve())
        return True
    except ValueError:
        return False


class FileHandler:
    @staticmethod
    def extract_zip(zip_content: bytes, extract_to: Path) -> List[Path]:
        """
        Extrai arquivos ZIP com segurança e retorna lista de imagens encontradas.
        """

        extract_to = Path(extract_to)
        extract_to.mkdir(parents=True, exist_ok=True)
        zip_path = extract_to / "upload.zip"

        with open(zip_path, "wb") as file_obj:
            file_obj.write(zip_content)

        image_files: List[Path] = []
        with zipfile.ZipFile(zip_path, "r") as zip_ref:
            for file_info in zip_ref.filelist:
                if not _is_safe_member(file_info):
                    raise ValueError(f"Arquivo suspeito no ZIP: {file_info.filename}")

            for file_info in zip_ref.filelist:
                if file_info.is_dir():
                    continue

                filename = os.path.basename(file_info.filename)
                if not filename or not _extension_allowed(filename):
                    continue

                target_path = extract_to / filename
                with zip_ref.open(file_info) as source, open(target_path, "wb") as target:
                    target.write(source.read())
                image_files.append(target_path)

        # Garantir ordenação consistente
        return sorted(image_files)

    @staticmethod
    def copy_template_files(
        template_name: str,
        dest_dir: Path,
        *,
        templates_dir: Path | None = None,
        files_to_copy: Iterable[str] | None = None,
    ) -> Tuple[bool, str]:
        """Copia arquivos do template para o diretório de processamento."""

        base_dir = Path(templates_dir) if templates_dir else settings.templates_dir
        template_dir = base_dir / template_name

        if not template_dir.exists():
            return False, f"Template '{template_name}' não encontrado"

        dest_dir = Path(dest_dir)
        dest_dir.mkdir(parents=True, exist_ok=True)

        filenames = list(files_to_copy) if files_to_copy else [
            "template.json",
            "config.json",
            "evaluation.json",
        ]

        for file_name in filenames:
            src_file = template_dir / file_name
            if src_file.exists():
                shutil.copy(src_file, dest_dir)

        return True, "Template copiado com sucesso"

    @staticmethod
    def image_to_base64(image_path: Path) -> str:
        """Converte imagem para base64."""

        with open(image_path, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode("utf-8")

    @staticmethod
    def cleanup_temp_dir(temp_dir: Path) -> None:
        """Remove diretório temporário com segurança."""

        temp_dir = Path(temp_dir)
        try:
            if temp_dir.exists() and _is_within(settings.temp_root, temp_dir):
                shutil.rmtree(temp_dir)
        except Exception as exc:  # noqa: BLE001
            print(f"Erro ao limpar diretório temporário: {exc}")

    @staticmethod
    def validate_template_exists(template_name: str) -> bool:
        """Valida se o template existe."""

        template_dir = settings.templates_dir / template_name
        return (template_dir / "template.json").exists()
