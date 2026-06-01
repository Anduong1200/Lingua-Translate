from __future__ import annotations

from datetime import datetime, timezone
from sqlalchemy import String, Float, Text, DateTime, Integer
from sqlalchemy.orm import Mapped, mapped_column
from db.config import Base


class DocumentRecord(Base):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    title: Mapped[str] = mapped_column(String(256))
    file_name: Mapped[str] = mapped_column(String(256), default="")
    original_filename: Mapped[str] = mapped_column(String(256), default="")
    stored_filename: Mapped[str] = mapped_column(String(256), default="")
    file_path: Mapped[str] = mapped_column(Text, default="")
    sha256: Mapped[str] = mapped_column(String(64), default="")
    mime_type: Mapped[str] = mapped_column(String(128), default="")
    source_type: Mapped[str] = mapped_column(String(32), default="pdf")
    language: Mapped[str] = mapped_column(String(32), default="zh-CN")
    content: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class PageRecord(Base):
    __tablename__ = "pages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    document_id: Mapped[str] = mapped_column(String(64), index=True)
    page_number: Mapped[int] = mapped_column(Integer)
    text: Mapped[str] = mapped_column(Text, default="")
    width: Mapped[float | None] = mapped_column(Float, nullable=True)
    height: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
