from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Dict, List, Optional

from sqlalchemy import Column, JSON
from sqlalchemy.orm import relationship
from sqlmodel import Field, Relationship, SQLModel


class AuditStatus(str, Enum):
    PENDING = "pending"
    RESOLVED = "resolved"
    REOPENED = "reopened"


class BatchStatus(str, Enum):
    PENDING = "pending"
    EXPORTED = "exported"
    CLEANED = "cleaned"


class AuditBatch(SQLModel, table=True):
    __tablename__ = "audit_batches"

    id: Optional[int] = Field(default=None, primary_key=True)
    batch_id: str = Field(index=True, unique=True)
    template: str = Field(index=True)
    original_results_path: str
    corrected_results_path: Optional[str] = None
    manifest_path: Optional[str] = None
    status: BatchStatus = Field(default=BatchStatus.PENDING)
    exported_at: Optional[datetime] = None
    exported_by: Optional[str] = None
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
        sa_column_kwargs={"onupdate": lambda: datetime.now(timezone.utc)},
    )

    items: List["AuditItem"] = Relationship(
        back_populates="batch",
        sa_relationship=relationship(
            "AuditItem",
            back_populates="batch",
            cascade="all, delete-orphan",
        ),
    )


class AuditItem(SQLModel, table=True):
    __tablename__ = "audit_items"

    id: Optional[int] = Field(default=None, primary_key=True)
    file_id: str = Field(index=True)
    template: str = Field(index=True)
    batch_id: str = Field(index=True, foreign_key="audit_batches.batch_id")
    issues: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    image_path: Optional[str] = None
    marked_image_path: Optional[str] = None
    raw_answers: Dict[str, str] = Field(default_factory=dict, sa_column=Column(JSON))
    results_path: Optional[str] = None
    status: AuditStatus = Field(default=AuditStatus.PENDING)
    notes: Optional[str] = None
    exported_at: Optional[datetime] = None
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
        sa_column_kwargs={"onupdate": lambda: datetime.now(timezone.utc)},
    )

    batch: Optional[AuditBatch] = Relationship(
        back_populates="items",
        sa_relationship=relationship("AuditBatch", back_populates="items"),
    )

    responses: List["AuditResponse"] = Relationship(
        back_populates="item",
        sa_relationship=relationship(
            "AuditResponse",
            back_populates="item",
            cascade="all, delete-orphan",
        ),
    )


class AuditResponse(SQLModel, table=True):
    __tablename__ = "audit_responses"

    id: Optional[int] = Field(default=None, primary_key=True)
    audit_item_id: int = Field(foreign_key="audit_items.id", index=True)
    question: str = Field(index=True)
    read_value: Optional[str] = None
    corrected_value: Optional[str] = None
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
        sa_column_kwargs={"onupdate": lambda: datetime.now(timezone.utc)},
    )

    item: Optional[AuditItem] = Relationship(
        back_populates="responses",
        sa_relationship=relationship("AuditItem", back_populates="responses"),
    )
