from __future__ import annotations

from datetime import datetime, timezone
from sqlalchemy import String, Integer, Float, Text, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from db.config import Base


class ReviewItemRecord(Base):
    __tablename__ = "review_items"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    annotation_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    item_type: Mapped[str] = mapped_column(String(32), default="flashcard")
    source_type: Mapped[str] = mapped_column(String(32), default="word")
    front: Mapped[str] = mapped_column(Text, default="")
    back: Mapped[str] = mapped_column(Text, default="")
    context: Mapped[str] = mapped_column(Text, default="")
    source_sentence: Mapped[str] = mapped_column(Text, default="")
    pinyin: Mapped[str] = mapped_column(String(256), default="")
    hsk_level: Mapped[int | None] = mapped_column(Integer, nullable=True)
    domain_tag: Mapped[str | None] = mapped_column(String(64), nullable=True)
    due_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    interval_days: Mapped[int] = mapped_column(Integer, default=0)
    ease: Mapped[float] = mapped_column(Float, default=2.5)
    reviewed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class ReviewEventRecord(Base):
    __tablename__ = "review_events"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    review_item_id: Mapped[str] = mapped_column(String(64), index=True)
    rating: Mapped[int] = mapped_column(Integer)
    response_time_ms: Mapped[int] = mapped_column(Integer, default=0)
    reviewed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
