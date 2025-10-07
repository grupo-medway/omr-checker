from __future__ import annotations

import shutil
from pathlib import Path

from api.db.config import Settings


def _mkdir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def ensure_storage_dirs(settings: Settings) -> None:
    """Ensure all storage directories exist."""

    for path in (
        settings.storage_root,
        settings.processing_dir,
        settings.results_dir,
        settings.exports_dir,
        settings.static_root,
        settings.temp_root,
    ):
        _mkdir(path)


def reset_storage(settings: Settings, *, drop_db: bool = True) -> None:
    """Remove processing/results directories and, optionally, the database file."""

    targets = [
        settings.processing_dir,
        settings.results_dir,
        settings.exports_dir,
        settings.static_root,
    ]

    for directory in targets:
        if directory.exists():
            shutil.rmtree(directory)

    ensure_storage_dirs(settings)

    if drop_db and settings.database_path.exists():
        settings.database_path.unlink()
