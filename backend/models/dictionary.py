from __future__ import annotations

from datetime import datetime, timezone
from sqlalchemy import Integer, String, Float, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from db.config import Base


class DictionaryEntryRecord(Base):
    __tablename__ = "dictionary_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    simplified: Mapped[str] = mapped_column(String(128), index=True)
    traditional: Mapped[str | None] = mapped_column(String(128), nullable=True)
    pinyin: Mapped[str | None] = mapped_column(String(256), nullable=True)
    pinyin_numbered: Mapped[str | None] = mapped_column(String(256), nullable=True)
    vi: Mapped[str | None] = mapped_column(Text, nullable=True)
    en: Mapped[str | None] = mapped_column(Text, nullable=True)
    pos: Mapped[str | None] = mapped_column(String(64), nullable=True)
    hsk_level: Mapped[int | None] = mapped_column(Integer, nullable=True)
    domain_tags_json: Mapped[str] = mapped_column(Text, default="[]")
    source: Mapped[str] = mapped_column(String(64), default="custom_vi")
    source_version: Mapped[str] = mapped_column(String(64), default="")
    license: Mapped[str] = mapped_column(String(128), default="")
    raw_line: Mapped[str] = mapped_column(Text, default="")
    confidence: Mapped[float] = mapped_column(Float, default=0.8)
    note: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
