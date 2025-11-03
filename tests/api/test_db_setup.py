import json
import sqlite3

from sqlalchemy import inspect
from sqlmodel import Session, select

from api.utils.storage import ensure_storage_dirs
from api.db.models import AuditBatch


def test_init_db_creates_tables(audit_env):
    settings, db_session = audit_env

    ensure_storage_dirs(settings)
    db_session.init_db()

    inspector = inspect(db_session.engine)
    tables = inspector.get_table_names()

    assert "audit_items" in tables
    assert "audit_responses" in tables
    assert "audit_batches" in tables
    assert settings.database_path.exists()


def test_init_db_backfills_batches(audit_env):
    settings, db_session = audit_env

    ensure_storage_dirs(settings)

    legacy_results = settings.results_dir / "legacy_batch"
    legacy_results.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(settings.database_path)
    cur = conn.cursor()

    cur.execute(
        """
        CREATE TABLE audit_items (
            id INTEGER PRIMARY KEY,
            file_id TEXT,
            template TEXT,
            batch_id TEXT,
            issues TEXT,
            image_path TEXT,
            marked_image_path TEXT,
            raw_answers TEXT,
            results_path TEXT,
            status TEXT,
            notes TEXT,
            exported_at TEXT,
            created_at TEXT,
            updated_at TEXT
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE audit_responses (
            id INTEGER PRIMARY KEY,
            audit_item_id INTEGER,
            question TEXT,
            read_value TEXT,
            corrected_value TEXT,
            created_at TEXT,
            updated_at TEXT
        )
        """
    )

    issues = json.dumps(["q1: blank"])
    raw_answers = json.dumps({"q1": ""})

    cur.execute(
        """
        INSERT INTO audit_items (
            id, file_id, template, batch_id, issues, image_path, marked_image_path,
            raw_answers, results_path, status, notes, exported_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            1,
            "legacy.png",
            "legacy-template",
            "legacy_batch",
            issues,
            None,
            None,
            raw_answers,
            "legacy_batch/Results.csv",
            "PENDING",
            None,
            None,
            "2024-01-01T00:00:00+00:00",
            "2024-01-01T00:00:00+00:00",
        ),
    )

    conn.commit()
    conn.close()

    db_session.init_db()

    with Session(db_session.engine) as session:
        batch = session.exec(
            select(AuditBatch).where(AuditBatch.batch_id == "legacy_batch")
        ).one_or_none()

        assert batch is not None
        assert batch.template == "legacy-template"
        assert batch.original_results_path == "legacy_batch/Results.csv"
