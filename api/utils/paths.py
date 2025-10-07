from __future__ import annotations

from pathlib import Path

from api.db.config import Settings


def to_public_path(path: Path, settings: Settings) -> Path:
    """Return path relative to the public static root."""

    path = Path(path).resolve()
    root = settings.static_root.resolve()
    return path.relative_to(root)


def to_processing_path(path: Path, settings: Settings) -> Path:
    """Return path relative to the processing directory."""

    path = Path(path).resolve()
    root = settings.processing_dir.resolve()
    return path.relative_to(root)
