from sqlalchemy import inspect

from api.utils.storage import ensure_storage_dirs


def test_init_db_creates_tables(audit_env):
    settings, db_session = audit_env

    ensure_storage_dirs(settings)
    db_session.init_db()

    inspector = inspect(db_session.engine)
    tables = inspector.get_table_names()

    assert "audit_items" in tables
    assert "audit_responses" in tables
    assert settings.database_path.exists()
