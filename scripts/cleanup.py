#!/usr/bin/env python3

"""Utility script to reset local storage and database for the audit workflow."""

from __future__ import annotations

import sys
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))


from api.db import get_settings, init_db  # noqa: E402
from api.utils.storage import ensure_storage_dirs, reset_storage  # noqa: E402


def main() -> None:
    settings = get_settings()
    reset_storage(settings, drop_db=True)
    ensure_storage_dirs(settings)
    init_db()
    print("Ambiente de auditoria reinicializado com sucesso.")


if __name__ == "__main__":
    main()
