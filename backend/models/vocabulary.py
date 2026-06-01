from __future__ import annotations

from datetime import datetime, timezone
from sqlalchemy import String, Integer, Text, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from db.config import Base


class VocabularyItemRecord(Base):
    __tablename__ = "vocabulary_items"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    word: Mapped[str] = mapped_column(String(128), index=True)
    translation: Mapped[str] = mapped_column(Text, default="")
    pinyin: Mapped[str] = mapped_column(String(256), default="")
    context: Mapped[str] = mapped_column(Text, default="")
    source_file: Mapped[str] = mapped_column(String(256), default="")
    source_document_id: Mapped[str] = mapped_column(String(64), default="", index=True)
    hsk_level: Mapped[int | None] = mapped_column(Integer, nullable=True)
    domain_tags_json: Mapped[str] = mapped_column(Text, default="[]")
    topic: Mapped[str] = mapped_column(String(64), default="general")
    favorite: Mapped[bool] = mapped_column(Boolean, default=False)
    learned: Mapped[bool] = mapped_column(Boolean, default=False)
    lookup_count: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
