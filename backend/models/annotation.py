from __future__ import annotations

from datetime import datetime, timezone
from sqlalchemy import String, Integer, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from db.config import Base


class AnnotationRecord(Base):
    __tablename__ = "annotations"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    document_id: Mapped[str] = mapped_column(String(64), index=True)
    page_id: Mapped[str] = mapped_column(String(64), default="page-1")
    page_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sentence_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    selected_text: Mapped[str] = mapped_column(Text)
    selection_start: Mapped[int] = mapped_column(Integer, default=0)
    selection_end: Mapped[int] = mapped_column(Integer, default=0)
    bbox_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    annotation_type: Mapped[str] = mapped_column(String(32), default="word")
    note: Mapped[str] = mapped_column(Text, default="")
    explanation_vi: Mapped[str] = mapped_column(Text, default="")
    selected_meaning_vi: Mapped[str] = mapped_column(Text, default="")
    analysis_json: Mapped[str] = mapped_column(Text, default="{}")
    source_sentence: Mapped[str] = mapped_column(Text, default="")
    pinyin: Mapped[str] = mapped_column(String(256), default="")
    hsk_level: Mapped[int | None] = mapped_column(Integer, nullable=True)
    domain_tag: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
