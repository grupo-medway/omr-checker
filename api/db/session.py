from collections.abc import Generator
from pathlib import Path

from sqlalchemy import inspect
from sqlmodel import Session, SQLModel, create_engine, select

from .config import get_settings
from . import models  # noqa: F401  Ensures models are registered with SQLModel metadata
from .models import AuditBatch, AuditItem, BatchStatus


settings = get_settings()


def _ensure_parent(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False},
    echo=False,
)


def init_db() -> None:
    _ensure_parent(settings.database_path)
    SQLModel.metadata.create_all(engine)
    _backfill_batches()


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session


def _backfill_batches() -> None:
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())

    if "audit_items" not in tables:
        return

    with Session(engine) as session:
        existing_batches = {
            batch_id for batch_id in session.exec(select(AuditBatch.batch_id))
        }

        legacy_batches = {
            batch_id
            for batch_id in session.exec(select(AuditItem.batch_id).distinct())
            if batch_id
        }

        missing_batches = legacy_batches - existing_batches

        if not missing_batches:
            return

        for batch_id in sorted(missing_batches):
            items = session.exec(
                select(AuditItem)
                .where(AuditItem.batch_id == batch_id)
                .order_by(AuditItem.created_at.asc())
            ).all()

            if not items:
                continue

            results_path = next(
                (item.results_path for item in items if item.results_path),
                None,
            )

            if not results_path:
                continue

            template = items[0].template

            session.add(
                AuditBatch(
                    batch_id=batch_id,
                    template=template,
                    original_results_path=results_path,
                    status=BatchStatus.PENDING,
                )
            )

        session.commit()
