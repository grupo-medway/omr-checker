from __future__ import annotations

import importlib
import sys
from pathlib import Path
from types import ModuleType
from typing import Tuple

import pytest

ROOT_DIR = Path(__file__).resolve().parents[2]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from api.db import config as db_config
import api.db.session as db_session


@pytest.fixture
def audit_env(tmp_path, monkeypatch) -> Tuple[db_config.Settings, ModuleType]:
    storage_root = tmp_path / "storage"
    temp_root = tmp_path / "temp"

    monkeypatch.setenv("AUDIT_STORAGE_ROOT", str(storage_root))
    monkeypatch.setenv("AUDIT_TEMP_ROOT", str(temp_root))
    monkeypatch.setenv("AUDIT_DATABASE_FILENAME", "test_auditoria.db")

    db_config.get_settings.cache_clear()
    module = importlib.reload(db_session)
    settings = db_config.get_settings()

    try:
        yield settings, module
    finally:
        db_config.get_settings.cache_clear()
        importlib.reload(db_session)
