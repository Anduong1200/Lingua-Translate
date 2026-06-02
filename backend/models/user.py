from __future__ import annotations

from datetime import datetime, timezone
from sqlalchemy import Integer, String, Float, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from db.config import Base


class UserProfileRecord(Base):
    __tablename__ = "user_profile"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    target_level: Mapped[str] = mapped_column(String(16), default="HSK4")
    native_language: Mapped[str] = mapped_column(String(16), default="vi")
    preferred_domains_json: Mapped[str] = mapped_column(Text, default='["general"]')
    show_pinyin: Mapped[str] = mapped_column(String(32), default="always")
    translation_style: Mapped[str] = mapped_column(String(32), default="both")


class KnownWordRecord(Base):
    __tablename__ = "known_words"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    word: Mapped[str] = mapped_column(String(128), index=True)
    confidence: Mapped[float] = mapped_column(Float, default=0.5)
    last_seen: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    times_seen: Mapped[int] = mapped_column(Integer, default=1)
    times_looked_up: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class UserCorrectionRecord(Base):
    __tablename__ = "user_corrections"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    original_term: Mapped[str] = mapped_column(String(128), index=True)
    system_translation: Mapped[str] = mapped_column(Text, default="")
    user_translation: Mapped[str] = mapped_column(Text, default="")
    context: Mapped[str] = mapped_column(Text, default="")
    domain: Mapped[str] = mapped_column(String(64), default="general")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
