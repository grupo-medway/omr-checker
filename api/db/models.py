from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional

from sqlalchemy import Column, JSON
from sqlmodel import Field, Relationship, SQLModel


class AuditStatus(str, Enum):
    PENDING = "pending"
    RESOLVED = "resolved"
    REOPENED = "reopened"


class AuditItem(SQLModel, table=True):
    __tablename__ = "audit_items"

    id: Optional[int] = Field(default=None, primary_key=True)
    file_id: str = Field(index=True)
    template: str = Field(index=True)
    issues: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    image_path: Optional[str] = None
    marked_image_path: Optional[str] = None
    raw_answers: Dict[str, str] = Field(default_factory=dict, sa_column=Column(JSON))
    status: AuditStatus = Field(default=AuditStatus.PENDING)
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        nullable=False,
        sa_column_kwargs={"onupdate": datetime.utcnow},
    )

    responses: List["AuditResponse"] = Relationship(back_populates="item")


class AuditResponse(SQLModel, table=True):
    __tablename__ = "audit_responses"

    id: Optional[int] = Field(default=None, primary_key=True)
    audit_item_id: int = Field(foreign_key="audit_items.id", index=True)
    question: str = Field(index=True)
    read_value: Optional[str] = None
    corrected_value: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        nullable=False,
        sa_column_kwargs={"onupdate": datetime.utcnow},
    )

    item: Optional[AuditItem] = Relationship(back_populates="responses")
