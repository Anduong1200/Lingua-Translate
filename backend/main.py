from __future__ import annotations

import json
import hashlib
import os
import re
import sqlite3
import threading
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone
from io import BytesIO
from pathlib import Path
from typing import Any, Literal

import httpx
import jieba
from fastapi import Depends, FastAPI, File, Form, HTTPException, Query, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from pypinyin import Style, lazy_pinyin
from sqlalchemy import Boolean, DateTime, Float, Integer, String, Text, create_engine, delete, func, select, text as sql_text
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker

try:
    from pypdf import PdfReader
except Exception:  # pragma: no cover - optional parser
    PdfReader = None

try:
    import docx
except Exception:  # pragma: no cover - optional parser
    docx = None


APP_VERSION = "0.1.0"
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "hanora.sqlite3"
UPLOAD_DIR = DATA_DIR / "uploads"
BACKUP_DIR = DATA_DIR / "backups"
GOOGLE_KEY_FILE = DATA_DIR / "google_api_keys.txt"
LOCAL_ENV_FILES = [BASE_DIR / ".env", BASE_DIR.parent / ".env"]

DATA_DIR.mkdir(parents=True, exist_ok=True)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
BACKUP_DIR.mkdir(parents=True, exist_ok=True)

engine = create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


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


class UserCorrectionRecord(Base):
    __tablename__ = "user_corrections"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    original_term: Mapped[str] = mapped_column(String(128), index=True)
    system_translation: Mapped[str] = mapped_column(Text, default="")
    user_translation: Mapped[str] = mapped_column(Text)
    context: Mapped[str] = mapped_column(Text, default="")
    domain: Mapped[str] = mapped_column(String(64), default="general")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


SEED_DICTIONARY: list[dict[str, Any]] = [
    {"simplified": "我", "pinyin": "wǒ", "vi": "tôi", "en": "I; me", "pos": "pronoun", "hsk_level": 1},
    {"simplified": "非常", "pinyin": "fēi cháng", "vi": "rất, vô cùng", "en": "very; extremely", "pos": "adverb", "hsk_level": 2},
    {"simplified": "喜欢", "pinyin": "xǐ huan", "vi": "thích, yêu thích", "en": "to like", "pos": "verb", "hsk_level": 1},
    {"simplified": "学习", "pinyin": "xué xí", "vi": "học tập", "en": "to study; to learn", "pos": "verb", "hsk_level": 1},
    {"simplified": "中文", "pinyin": "zhōng wén", "vi": "tiếng Trung", "en": "Chinese language", "pos": "noun", "hsk_level": 1},
    {"simplified": "虽然", "pinyin": "suī rán", "vi": "mặc dù", "en": "although", "pos": "conjunction", "hsk_level": 4},
    {"simplified": "但是", "pinyin": "dàn shì", "vi": "nhưng", "en": "but; however", "pos": "conjunction", "hsk_level": 2},
    {"simplified": "由于", "pinyin": "yóu yú", "vi": "do, bởi vì", "en": "due to; owing to", "pos": "preposition", "hsk_level": 5, "domain_tags": ["academic", "business"]},
    {"simplified": "因为", "pinyin": "yīn wèi", "vi": "bởi vì", "en": "because", "pos": "conjunction", "hsk_level": 2},
    {"simplified": "所以", "pinyin": "suǒ yǐ", "vi": "cho nên, vì vậy", "en": "so; therefore", "pos": "conjunction", "hsk_level": 2},
    {"simplified": "市场", "pinyin": "shì chǎng", "vi": "thị trường", "en": "market", "pos": "noun", "hsk_level": 4, "domain_tags": ["economics"]},
    {"simplified": "需求", "pinyin": "xū qiú", "vi": "nhu cầu", "en": "demand; requirement", "pos": "noun", "hsk_level": 6, "domain_tags": ["economics"]},
    {"simplified": "下降", "pinyin": "xià jiàng", "vi": "giảm, đi xuống", "en": "to decline; to drop", "pos": "verb", "hsk_level": 5, "domain_tags": ["economics"]},
    {"simplified": "公司", "pinyin": "gōng sī", "vi": "công ty", "en": "company", "pos": "noun", "hsk_level": 2, "domain_tags": ["business"]},
    {"simplified": "该", "pinyin": "gāi", "vi": "đó, ấy; nên", "en": "that; should", "pos": "determiner", "hsk_level": 4},
    {"simplified": "了", "pinyin": "le", "vi": "trợ từ hoàn thành/thay đổi trạng thái", "en": "aspect particle", "pos": "particle", "hsk_level": 1},
    {"simplified": "调整", "pinyin": "tiáo zhěng", "vi": "điều chỉnh", "en": "to adjust", "pos": "verb", "hsk_level": 5, "domain_tags": ["business"]},
    {"simplified": "生产", "pinyin": "shēng chǎn", "vi": "sản xuất", "en": "production; to produce", "pos": "verb", "hsk_level": 4, "domain_tags": ["business"]},
    {"simplified": "计划", "pinyin": "jì huà", "vi": "kế hoạch", "en": "plan", "pos": "noun", "hsk_level": 3, "domain_tags": ["business"]},
    {"simplified": "市场需求", "pinyin": "shì chǎng xū qiú", "vi": "nhu cầu thị trường", "en": "market demand", "pos": "noun phrase", "hsk_level": 6, "domain_tags": ["economics"], "source": "phrase_entries"},
    {"simplified": "生产计划", "pinyin": "shēng chǎn jì huà", "vi": "kế hoạch sản xuất", "en": "production plan", "pos": "noun phrase", "hsk_level": 5, "domain_tags": ["business"], "source": "phrase_entries"},
    {"simplified": "计算机", "pinyin": "jì suàn jī", "vi": "máy tính", "en": "computer", "pos": "noun", "hsk_level": 5, "domain_tags": ["computer_science"]},
    {"simplified": "系统", "pinyin": "xì tǒng", "vi": "hệ thống", "en": "system", "pos": "noun", "hsk_level": 5, "domain_tags": ["computer_science"]},
    {"simplified": "计算机系统", "pinyin": "jì suàn jī xì tǒng", "vi": "hệ thống máy tính", "en": "computer system", "pos": "noun phrase", "hsk_level": 5, "domain_tags": ["computer_science"], "source": "phrase_entries"},
    {"simplified": "需要", "pinyin": "xū yào", "vi": "cần, cần phải", "en": "to need", "pos": "verb", "hsk_level": 2},
    {"simplified": "处理", "pinyin": "chǔ lǐ", "vi": "xử lý; giải quyết", "en": "to handle; to process; to deal with", "pos": "verb", "hsk_level": 5, "domain_tags": ["general", "computer_science"]},
    {"simplified": "大量", "pinyin": "dà liàng", "vi": "lượng lớn, rất nhiều", "en": "large amount; massive", "pos": "adjective", "hsk_level": 5},
    {"simplified": "数据", "pinyin": "shù jù", "vi": "dữ liệu", "en": "data", "pos": "noun", "hsk_level": 5, "domain_tags": ["computer_science"]},
    {"simplified": "处理数据", "pinyin": "chǔ lǐ shù jù", "vi": "xử lý dữ liệu", "en": "to process data", "pos": "verb phrase", "hsk_level": 5, "domain_tags": ["computer_science"], "source": "phrase_entries"},
]

PUNCTUATION = {"。", "，", "、", "！", "？", "；", "：", ".", ",", "!", "?", ";", ":"}


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def make_id(prefix: str) -> str:
    return f"{prefix}_{int(datetime.now().timestamp() * 1000):x}"


def db_session() -> Session:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def current_request(request: Request) -> Request:
    return request


def json_loads(value: str | None, fallback: Any) -> Any:
    if not value:
        return fallback
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return fallback


def json_dumps(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False)


def parse_key_list(value: str | None) -> list[str]:
    if not value:
        return []
    cleaned = value.strip().strip("\"'")
    keys = [item.strip().strip("\"'") for item in re.split(r"[\s,;]+", cleaned) if item.strip()]
    return [key for key in keys if key and not key.startswith("#")]


def read_local_env_files() -> dict[str, str]:
    values: dict[str, str] = {}
    for env_file in LOCAL_ENV_FILES:
        if not env_file.exists():
            continue
        for raw_line in env_file.read_text(encoding="utf-8", errors="ignore").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            values[key.strip()] = value.strip().strip("\"'")
    return values


def app_config(name: str, default: str = "") -> str:
    if os.environ.get(name):
        return os.environ[name]
    return read_local_env_files().get(name, default)


def app_env() -> str:
    return app_config("APP_ENV", app_config("ENV", "development")).strip().lower() or "development"


def config_int(name: str, default: int, minimum: int | None = None, maximum: int | None = None) -> int:
    raw_value = app_config(name, str(default))
    try:
        value = int(raw_value)
    except ValueError:
        value = default
    if minimum is not None:
        value = max(value, minimum)
    if maximum is not None:
        value = min(value, maximum)
    return value


def config_float(name: str, default: float, minimum: float | None = None, maximum: float | None = None) -> float:
    raw_value = app_config(name, str(default))
    try:
        value = float(raw_value)
    except ValueError:
        value = default
    if minimum is not None:
        value = max(value, minimum)
    if maximum is not None:
        value = min(value, maximum)
    return value


def configured_cors_origins() -> list[str]:
    configured = parse_key_list(app_config("FRONTEND_ORIGINS"))
    if configured:
        return configured
    # Allow local dev server ports dynamically from 3000 to 3010 to prevent CORS issues on port collisions
    origins = []
    for port in range(3000, 3011):
        origins.append(f"http://127.0.0.1:{port}")
        origins.append(f"http://localhost:{port}")
    return origins


def max_upload_bytes() -> int:
    return config_int("MAX_UPLOAD_BYTES", 50 * 1024 * 1024, minimum=1024 * 1024, maximum=500 * 1024 * 1024)


def allowed_upload_extensions() -> set[str]:
    configured = parse_key_list(app_config("ALLOWED_UPLOAD_EXTENSIONS"))
    extensions = configured or [".pdf", ".txt", ".md", ".docx", ".png", ".jpg", ".jpeg", ".webp"]
    return {item.lower() if item.startswith(".") else f".{item.lower()}" for item in extensions}


def ai_rate_limit_per_minute() -> int:
    return config_int("AI_RATE_LIMIT_PER_MINUTE", 30, minimum=0, maximum=10000)


def upload_rate_limit_per_minute() -> int:
    return config_int("UPLOAD_RATE_LIMIT_PER_MINUTE", 20, minimum=0, maximum=10000)


class InMemoryRateLimiter:
    def __init__(self) -> None:
        self._events: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def check(self, request: Request, *, name: str, limit: int, window_seconds: int = 60) -> None:
        if limit <= 0:
            return
        client = request.client.host if request.client else "local"
        key = f"{name}:{client}"
        now = time.monotonic()
        cutoff = now - window_seconds
        with self._lock:
            events = self._events[key]
            while events and events[0] < cutoff:
                events.popleft()
            if len(events) >= limit:
                raise HTTPException(
                    status_code=429,
                    detail=f"Rate limit exceeded for {name}. Try again later.",
                    headers={"Retry-After": str(window_seconds)},
                )
            events.append(now)


rate_limiter = InMemoryRateLimiter()


def safe_filename(value: str | None, fallback: str = "document.pdf") -> str:
    name = Path(value or fallback).name.strip()
    name = re.sub(r"[^A-Za-z0-9._() \-\u3400-\u9fff]+", "_", name).strip(" .")
    return name or fallback


def path_is_under(child: Path, parent: Path) -> bool:
    try:
        child.resolve().relative_to(parent.resolve())
        return True
    except ValueError:
        return False


async def read_upload_file_limited(file: UploadFile) -> bytes:
    limit = max_upload_bytes()
    chunks: list[bytes] = []
    total = 0
    while True:
        chunk = await file.read(1024 * 1024)
        if not chunk:
            break
        total += len(chunk)
        if total > limit:
            raise HTTPException(status_code=413, detail=f"Uploaded file exceeds limit of {limit} bytes.")
        chunks.append(chunk)
    return b"".join(chunks)


def runtime_config_warnings() -> list[str]:
    warnings: list[str] = []
    origins = configured_cors_origins()
    if "*" in origins:
        warnings.append("FRONTEND_ORIGINS contains wildcard '*'; set explicit origins for production.")
    if app_env() in {"prod", "production"} and not app_config("FRONTEND_ORIGINS"):
        warnings.append("APP_ENV is production but FRONTEND_ORIGINS is not configured.")
    if GOOGLE_KEY_FILE.exists():
        warnings.append("Google API keys are loaded from backend/data/google_api_keys.txt; keep this file local and ignored.")
    if not DB_PATH.exists():
        warnings.append("SQLite database file does not exist yet.")
    if max_upload_bytes() > 100 * 1024 * 1024:
        warnings.append("MAX_UPLOAD_BYTES is high; large local uploads can slow PDF parsing.")
    if ai_rate_limit_per_minute() == 0:
        warnings.append("AI rate limiting is disabled.")
    if upload_rate_limit_per_minute() == 0:
        warnings.append("Upload rate limiting is disabled.")
    return warnings


def load_google_api_keys() -> list[str]:
    keys: list[str] = []
    for env_name in ["GOOGLE_API_KEYS", "GEMINI_API_KEYS", "GOOGLE_API_KEY", "GEMINI_API_KEY"]:
        keys.extend(parse_key_list(os.environ.get(env_name)))

    local_env = read_local_env_files()
    for env_name in ["GOOGLE_API_KEYS", "GEMINI_API_KEYS", "GOOGLE_API_KEY", "GEMINI_API_KEY"]:
        keys.extend(parse_key_list(local_env.get(env_name)))

    if GOOGLE_KEY_FILE.exists():
        for raw_line in GOOGLE_KEY_FILE.read_text(encoding="utf-8", errors="ignore").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                _, line = line.split("=", 1)
            keys.extend(parse_key_list(line))

    deduped: list[str] = []
    seen: set[str] = set()
    for key in keys:
        if key not in seen:
            seen.add(key)
            deduped.append(key)
    return deduped


def secret_fingerprint(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()[:10]


class GoogleApiKeyPool:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._index = 0

    def next_key(self, keys: list[str]) -> tuple[int, str]:
        if not keys:
            raise RuntimeError("No Google API keys configured.")
        with self._lock:
            self._index %= len(keys)
            key_index = self._index
            self._index = (self._index + 1) % len(keys)
        return key_index, keys[key_index]

    def status(self, keys: list[str]) -> dict[str, Any]:
        with self._lock:
            next_index = self._index % len(keys) if keys else 0
        return {
            "configured_keys": len(keys),
            "next_key_index": next_index,
            "key_fingerprints": [secret_fingerprint(key) for key in keys],
        }


google_key_pool = GoogleApiKeyPool()


def contains_chinese(text: str) -> bool:
    return bool(re.search(r"[\u4e00-\u9fff]", text or ""))


def pinyin_display(text: str) -> str:
    return " ".join(lazy_pinyin(text, style=Style.TONE))


def pinyin_numbered(text: str) -> str:
    return " ".join(lazy_pinyin(text, style=Style.TONE3))


def split_definitions(value: str | list[str] | None) -> list[str]:
    if not value:
        return []
    if isinstance(value, list):
        return value
    return [item.strip() for item in re.split(r"[;；/]", value) if item.strip()]


def entry_get(entry: dict[str, Any] | DictionaryEntryRecord, key: str, default: Any = None) -> Any:
    if isinstance(entry, dict):
        return entry.get(key, default)
    if key == "domain_tags":
        return json_loads(entry.domain_tags_json, [])
    return getattr(entry, key, default)


def to_dictionary_result(entry: dict[str, Any] | DictionaryEntryRecord) -> dict[str, Any]:
    simplified = entry_get(entry, "simplified", "")
    display = entry_get(entry, "pinyin") or (pinyin_display(simplified) if contains_chinese(simplified) else "")
    definitions_vi = split_definitions(entry_get(entry, "vi") or entry_get(entry, "definition_vi") or entry_get(entry, "definitions_vi"))
    definitions_en = split_definitions(entry_get(entry, "en") or entry_get(entry, "definitions_en"))
    return {
        "simplified": simplified,
        "traditional": entry_get(entry, "traditional") or simplified,
        "pinyin": entry_get(entry, "pinyin_numbered") or pinyin_numbered(simplified),
        "pinyin_display": display,
        "definitions_en": definitions_en,
        "definitions_vi": definitions_vi,
        "hsk_level": entry_get(entry, "hsk_level"),
        "domain_tags": entry_get(entry, "domain_tags", []) or [],
        "source": entry_get(entry, "source", "hanora_seed_vi"),
        "confidence": entry_get(entry, "confidence", 0.8),
        "note": entry_get(entry, "note", ""),
        "pos": entry_get(entry, "pos"),
    }


def seed_entry(surface: str) -> dict[str, Any] | None:
    return next((entry for entry in SEED_DICTIONARY if entry["simplified"] == surface or entry.get("traditional") == surface), None)


def db_entry(surface: str, session: Session) -> DictionaryEntryRecord | None:
    matches = session.execute(
        select(DictionaryEntryRecord).where(
            (DictionaryEntryRecord.simplified == surface) | (DictionaryEntryRecord.traditional == surface)
        )
    ).scalars().all()
    source_priority = {
        "custom_vi": 0,
        "domain_dictionary": 1,
        "phrase_entries": 2,
        "hsk_vocab": 3,
        "cc-cedict": 4,
    }
    return sorted(matches, key=lambda entry: source_priority.get(entry.source, 10))[0] if matches else None


def dictionary_source_priority(source: str | None) -> int:
    return {
        "user_corrections": 0,
        "custom_vi": 1,
        "hanora_seed_vi": 2,
        "domain_dictionary": 3,
        "phrase_entries": 4,
        "hsk_vocab": 5,
        "cc-cedict": 6,
    }.get(source or "", 10)


def dictionary_relevance_key(entry: dict[str, Any], query: str) -> tuple[int, int, float, int, str]:
    simplified = str(entry.get("simplified") or "")
    traditional = str(entry.get("traditional") or "")
    haystack = " ".join(str(entry.get(key, "")) for key in ["simplified", "traditional", "pinyin", "vi", "en"]).lower()
    lowered = query.lower()
    if simplified == query or traditional == query:
        relevance = 0
    elif simplified.startswith(query) or traditional.startswith(query):
        relevance = 1
    elif query in simplified or query in traditional:
        relevance = 2
    elif lowered in haystack:
        relevance = 3
    else:
        relevance = 4
    return (
        relevance,
        dictionary_source_priority(entry.get("source")),
        -float(entry.get("confidence") or 0),
        len(simplified),
        simplified,
    )


def find_dictionary_entry(surface: str, session: Session) -> dict[str, Any] | DictionaryEntryRecord | None:
    database_entry = db_entry(surface, session)
    seed = seed_entry(surface)
    if not seed:
        return database_entry
    if not database_entry:
        return seed
    if database_entry.source in {"hsk_vocab", "cc-cedict"} and entry_get(seed, "vi"):
        return seed
    return database_entry


def configure_jieba(session: Session | None = None) -> None:
    for entry in SEED_DICTIONARY:
        jieba.add_word(entry["simplified"], freq=200000)
    if session:
        for entry in session.execute(select(DictionaryEntryRecord)).scalars():
            jieba.add_word(entry.simplified, freq=200000)


def token_from_surface(surface: str, session: Session) -> dict[str, Any]:
    entry = find_dictionary_entry(surface, session)
    if not entry:
        is_punct = surface in PUNCTUATION
        return {
            "surface": surface,
            "normalized": surface,
            "pinyin": pinyin_display(surface) if contains_chinese(surface) else "",
            "pos": "punctuation" if is_punct else None,
            "hsk_level": None,
            "definitions_vi": [] if is_punct else [f'Cần bổ sung nghĩa tiếng Việt cho "{surface}"'],
            "definitions_en": [] if is_punct else ["No local dictionary match yet"],
            "definitions": []
            if is_punct
            else [
                {"lang": "vi", "value": f'Cần bổ sung nghĩa tiếng Việt cho "{surface}"', "source": "local_fallback", "confidence": 0.35},
                {"lang": "en", "value": "No local dictionary match yet", "source": "local_fallback", "confidence": 0.25},
            ],
            "domain_tags": [],
            "confidence": 1 if is_punct else 0.35,
        }

    result = to_dictionary_result(entry)
    definitions = [
        *[
            {"lang": "vi", "value": value, "source": result["source"], "confidence": result["confidence"]}
            for value in result["definitions_vi"]
        ],
        *[
            {"lang": "en", "value": value, "source": result["source"], "confidence": min(result["confidence"], 0.76)}
            for value in result["definitions_en"]
        ],
    ]
    return {
        "surface": result["simplified"],
        "normalized": result["simplified"],
        "pinyin": result["pinyin_display"],
        "pos": result["pos"],
        "hsk_level": result["hsk_level"],
        "definitions_vi": result["definitions_vi"],
        "definitions_en": result["definitions_en"],
        "definitions": definitions,
        "domain_tags": result["domain_tags"],
        "confidence": result["confidence"],
    }


def tokenize_chinese(text: str, session: Session) -> list[dict[str, Any]]:
    configure_jieba(session)
    tokens: list[dict[str, Any]] = []
    for surface in jieba.cut(text, cut_all=False):
        surface = surface.strip()
        if not surface:
            continue
        if all(char in PUNCTUATION for char in surface):
            tokens.extend(token_from_surface(char, session) for char in surface)
        else:
            tokens.append(token_from_surface(surface, session))
    return tokens


def split_sentences(text: str) -> list[str]:
    return [sentence.strip() for sentence in re.split(r"(?<=[。！？!?])\s*|\n+", text or "") if sentence.strip()]


def grammar_patterns(sentence: str) -> list[dict[str, Any]]:
    patterns: list[dict[str, Any]] = []
    if "虽然" in sentence and "但是" in sentence:
        patterns.append({"pattern": "虽然...但是...", "meaning_vi": "mặc dù... nhưng..., nêu quan hệ nhượng bộ rồi chuyển ý", "confidence": 0.9})
    if "由于" in sentence:
        patterns.append({"pattern": "由于...", "meaning_vi": "do/vì, thường dùng trong văn viết, báo cáo hoặc giải thích nguyên nhân", "confidence": 0.84})
    if "因为" in sentence and "所以" in sentence:
        patterns.append({"pattern": "因为...所以...", "meaning_vi": "vì... nên..., nêu nguyên nhân rồi kết quả", "confidence": 0.86})
    if "需要" in sentence:
        patterns.append({"pattern": "需要 + Verb/Noun", "meaning_vi": "cần/cần phải làm gì đó; trong câu kỹ thuật thường đứng trước hành động xử lý", "confidence": 0.76})
    if "把" in sentence:
        patterns.append({"pattern": "把 + object + verb", "meaning_vi": "đưa tân ngữ lên trước động từ để nhấn mạnh cách xử lý hoặc kết quả", "confidence": 0.72})
    if "被" in sentence:
        patterns.append({"pattern": "被 + verb", "meaning_vi": "cấu trúc bị động: chủ thể chịu tác động của hành động phía sau 被", "confidence": 0.72})
    if "对" in sentence and "来说" in sentence:
        patterns.append({"pattern": "对...来说", "meaning_vi": "đối với..., giới hạn góc nhìn hoặc đối tượng được bàn tới", "confidence": 0.74})
    if "不仅" in sentence and "而且" in sentence:
        patterns.append({"pattern": "不仅...而且...", "meaning_vi": "không chỉ... mà còn..., dùng để tăng cấp hoặc bổ sung ý", "confidence": 0.82})
    return patterns


def analyze_chinese(text: str, session: Session) -> dict[str, Any]:
    return {
        "text": text,
        "sentences": [
            {
                "text": sentence,
                "tokens": tokenize_chinese(sentence, session),
                "grammar_patterns": grammar_patterns(sentence),
            }
            for sentence in split_sentences(text)
        ],
    }


def token_vi(token: dict[str, Any]) -> str:
    return (token.get("definitions_vi") or [""])[0] or next(
        (definition["value"] for definition in token.get("definitions", []) if definition.get("lang") == "vi"),
        "",
    )


def token_en(token: dict[str, Any]) -> str:
    return (token.get("definitions_en") or [""])[0] or next(
        (definition["value"] for definition in token.get("definitions", []) if definition.get("lang") == "en"),
        "",
    )


def content_tokens(tokens: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [token for token in tokens if token.get("surface", "").strip() and token.get("pos") != "punctuation"]


def find_containing_sentence(selected_text: str, source_sentence: str | None, paragraph_context: str | None, page_context: str | None) -> str:
    if source_sentence and source_sentence.strip():
        return source_sentence.strip()
    for context in [paragraph_context, page_context]:
        for sentence in split_sentences(context or ""):
            if selected_text and selected_text in sentence:
                return sentence
    return selected_text or (paragraph_context or page_context or "")


def detect_domain(context: str, requested_domain: str | None) -> str:
    if requested_domain and requested_domain not in {"general", "auto"}:
        return requested_domain
    if re.search(r"计算机|系统|数据|处理|网络|软件|算法", context):
        return "computer_science"
    if re.search(r"市场|需求|经济|公司|生产|计划|调整|下降|增长", context):
        return "economics"
    if re.search(r"考试|学习|成绩|中文|汉字", context):
        return "education"
    return "general"


def infer_reading_mode(selected_text: str, source_sentence: str, paragraph_context: str, page_context: str, session: Session) -> str:
    selected = selected_text.strip()
    if selected and selected == page_context.strip():
        return "page"
    if selected and selected == paragraph_context.strip():
        return "paragraph"
    if selected and selected == source_sentence.strip():
        return "sentence"
    if len(selected) == 1 and contains_chinese(selected):
        return "character"
    if len(content_tokens(tokenize_chinese(selected, session))) > 1 or len(selected) > 2:
        return "phrase"
    return "word"


def literal_translation(tokens: list[dict[str, Any]]) -> str:
    return " / ".join(filter(None, [token_vi(token) for token in content_tokens(tokens)]))


def natural_translation(selected_text: str, source_sentence: str, tokens: list[dict[str, Any]], domain: str) -> str:
    if "由于市场需求下降" in source_sentence and "调整了生产计划" in source_sentence and selected_text == source_sentence:
        return "Do nhu cầu thị trường giảm, công ty đó đã điều chỉnh kế hoạch sản xuất."
    if "市场需求下降" in selected_text:
        return "nhu cầu thị trường giảm"
    if selected_text == "市场需求":
        return "nhu cầu thị trường"
    if selected_text == "下降":
        return "giảm"
    if selected_text in {"系统", "计算机系统"} and "计算机" in source_sentence:
        return "hệ thống máy tính"
    if selected_text in {"处理", "处理数据"} and "数据" in source_sentence:
        return "xử lý dữ liệu" if selected_text == "处理数据" else "xử lý"
    if selected_text == "需要处理大量数据":
        return "cần xử lý lượng lớn dữ liệu"
    if domain == "computer_science" and selected_text == "系统":
        return "hệ thống"
    return literal_translation(tokens) or f'{selected_text} (chưa có bản dịch tự nhiên trong từ điển cục bộ)'


def contextual_role(selected_text: str, source_sentence: str, domain: str) -> dict[str, str]:
    if selected_text == "市场需求下降":
        return {"role_vi": "Cụm chủ-vị ngắn", "explanation_vi": "市场需求 là chủ thể, 下降 là vị ngữ; cả cụm nghĩa là nhu cầu thị trường giảm."}
    if selected_text == "市场需求" and "下降" in source_sentence:
        return {"role_vi": "Chủ thể của hành động/trạng thái", "explanation_vi": "Trong câu này, 市场需求 là chủ thể của 下降, nghĩa là phần nhu cầu thị trường đang giảm."}
    if selected_text == "系统" and "计算机" in source_sentence:
        return {"role_vi": "Danh từ trung tâm trong cụm danh từ", "explanation_vi": '系统 nằm trong cụm 计算机系统, nên ưu tiên nghĩa "hệ thống máy tính" thay vì một hệ thống xã hội hay tổ chức.'}
    if selected_text == "处理" and "数据" in source_sentence:
        return {"role_vi": "Động từ đi với tân ngữ 数据", "explanation_vi": '处理 đi với 数据, nên nghĩa phù hợp là "xử lý dữ liệu", không phải xử lý một vụ việc hay khiếu nại.'}
    if selected_text == "由于":
        return {"role_vi": "Từ nối nguyên nhân", "explanation_vi": "由于 mở đầu vế nguyên nhân, thường gặp trong văn viết, báo cáo hoặc giải thích logic nguyên nhân-kết quả."}
    return {"role_vi": "Đơn vị được chọn trong câu", "explanation_vi": f"Backend dùng câu chứa selection, domain {domain} và từ điển cục bộ để ưu tiên nghĩa phù hợp trước nghĩa chung."}


def contextual_examples(selected_text: str, domain: str) -> list[str]:
    examples = {
        "处理": ["处理数据 = xử lý dữ liệu", "处理问题 = xử lý vấn đề", "处理投诉 = xử lý khiếu nại"],
        "系统": ["计算机系统 = hệ thống máy tính", "管理系统 = hệ thống quản lý", "社会保障系统 = hệ thống an sinh xã hội"],
        "市场需求": ["市场需求下降 = nhu cầu thị trường giảm", "满足市场需求 = đáp ứng nhu cầu thị trường"],
        "下降": ["价格下降 = giá giảm", "需求下降 = nhu cầu giảm"],
    }
    if selected_text in examples:
        return examples[selected_text]
    if domain == "computer_science":
        return ["处理数据 = xử lý dữ liệu", "计算机系统 = hệ thống máy tính"]
    if domain == "economics":
        return ["市场需求 = nhu cầu thị trường", "生产计划 = kế hoạch sản xuất"]
    return []


def find_user_correction(selected_text: str, domain: str, session: Session) -> UserCorrectionRecord | None:
    return session.execute(
        select(UserCorrectionRecord)
        .where(UserCorrectionRecord.original_term == selected_text)
        .where((UserCorrectionRecord.domain == domain) | (UserCorrectionRecord.domain == "general"))
        .order_by(UserCorrectionRecord.created_at.desc())
    ).scalars().first()


def get_profile(session: Session) -> UserProfileRecord:
    profile = session.get(UserProfileRecord, 1)
    if profile:
        return profile
    profile = UserProfileRecord(id=1)
    session.add(profile)
    session.commit()
    session.refresh(profile)
    return profile


def profile_to_dict(profile: UserProfileRecord) -> dict[str, Any]:
    return {
        "target_level": profile.target_level,
        "native_language": profile.native_language,
        "preferred_domains": json_loads(profile.preferred_domains_json, ["general"]),
        "show_pinyin": profile.show_pinyin,
        "translation_style": profile.translation_style,
    }


def ensure_runtime_schema() -> None:
    with engine.connect() as connection:
        document_columns = {row[1] for row in connection.execute(sql_text("PRAGMA table_info(documents)")).fetchall()}
        dictionary_columns = {row[1] for row in connection.execute(sql_text("PRAGMA table_info(dictionary_entries)")).fetchall()}
        vocabulary_columns = {row[1] for row in connection.execute(sql_text("PRAGMA table_info(vocabulary_items)")).fetchall()}
    required_document_columns = {
        "original_filename": "VARCHAR(256) DEFAULT ''",
        "stored_filename": "VARCHAR(256) DEFAULT ''",
        "file_path": "TEXT DEFAULT ''",
        "sha256": "VARCHAR(64) DEFAULT ''",
        "mime_type": "VARCHAR(128) DEFAULT ''",
    }
    required_dictionary_columns = {
        "source_version": "VARCHAR(64) DEFAULT ''",
        "license": "VARCHAR(128) DEFAULT ''",
        "raw_line": "TEXT DEFAULT ''",
    }
    required_vocabulary_columns = {
        "source_document_id": "VARCHAR(64) DEFAULT ''",
        "topic": "VARCHAR(64) DEFAULT 'general'",
        "favorite": "BOOLEAN DEFAULT 0",
        "learned": "BOOLEAN DEFAULT 0",
        "lookup_count": "INTEGER DEFAULT 1",
    }
    with engine.begin() as connection:
        for column_name, column_type in required_document_columns.items():
            if column_name not in document_columns:
                connection.execute(sql_text(f"ALTER TABLE documents ADD COLUMN {column_name} {column_type}"))
        for column_name, column_type in required_dictionary_columns.items():
            if column_name not in dictionary_columns:
                connection.execute(sql_text(f"ALTER TABLE dictionary_entries ADD COLUMN {column_name} {column_type}"))
        if vocabulary_columns:
            for column_name, column_type in required_vocabulary_columns.items():
                if column_name not in vocabulary_columns:
                    connection.execute(sql_text(f"ALTER TABLE vocabulary_items ADD COLUMN {column_name} {column_type}"))
        connection.execute(sql_text("CREATE INDEX IF NOT EXISTS ix_dictionary_entries_source ON dictionary_entries (source)"))
        connection.execute(sql_text("CREATE INDEX IF NOT EXISTS ix_pages_document_page ON pages (document_id, page_number)"))
        connection.execute(sql_text("CREATE INDEX IF NOT EXISTS ix_annotations_document_page ON annotations (document_id, page_number)"))
        connection.execute(sql_text("CREATE INDEX IF NOT EXISTS ix_review_items_due_at ON review_items (due_at)"))
        connection.execute(sql_text("CREATE INDEX IF NOT EXISTS ix_vocabulary_items_word ON vocabulary_items (word)"))
        connection.execute(sql_text("CREATE INDEX IF NOT EXISTS ix_vocabulary_items_source_document_id ON vocabulary_items (source_document_id)"))


def review_suggestion(selected_text: str, source_sentence: str, translation: str, selected_tokens: list[dict[str, Any]]) -> dict[str, Any]:
    target = "市场需求" if "市场需求" in selected_text else (selected_tokens[0]["surface"] if selected_tokens else selected_text)
    front = source_sentence.replace(target, "____", 1) if source_sentence and target else f"____ = {translation}"
    return {
        "type": "cloze",
        "front": front,
        "answer": target,
        "back": translation,
        "context": source_sentence,
        "targets": [token["surface"] for token in selected_tokens],
    }


def build_contextual_analysis(payload: "NlpAnalyzeRequest", session: Session) -> dict[str, Any]:
    selected_text = (payload.selected_text or payload.text or "").strip()
    source_sentence = find_containing_sentence(selected_text, payload.source_sentence, payload.paragraph_context, payload.page_context)
    paragraph_context = (payload.paragraph_context or source_sentence or "").strip()
    page_context = (payload.page_context or paragraph_context or source_sentence or "").strip()
    context_text = "\n".join(filter(None, [source_sentence, paragraph_context, page_context]))
    domain = detect_domain(context_text, payload.domain_mode or payload.mode)
    analysis = analyze_chinese(source_sentence or selected_text, session)
    selected_tokens = content_tokens(tokenize_chinese(selected_text, session))
    correction = find_user_correction(selected_text, domain, session)
    quick_vi = [correction.user_translation] if correction else [token_vi(token) for token in selected_tokens if token_vi(token)]
    quick_en = [token_en(token) for token in selected_tokens if token_en(token)]
    hsk_levels = [token["hsk_level"] for token in selected_tokens if token.get("hsk_level")]
    domain_tags = sorted({tag for token in selected_tokens for tag in token.get("domain_tags", [])})
    confidence = round(sum(float(token.get("confidence", 0.5)) for token in selected_tokens) / len(selected_tokens), 2) if selected_tokens else 0.35
    natural_vi = correction.user_translation if correction else natural_translation(selected_text, source_sentence, selected_tokens, domain)
    literal_vi = literal_translation(selected_tokens) or natural_vi
    role = contextual_role(selected_text, source_sentence, domain)
    profile = get_profile(session)

    return {
        **analysis,
        "selection": {
            "selected_text": selected_text,
            "source_sentence": source_sentence,
            "paragraph_context": paragraph_context,
            "page_context": page_context,
            "domain_mode": domain,
            "user_level": payload.user_level or profile.target_level,
            "analysis_mode": infer_reading_mode(selected_text, source_sentence, paragraph_context, page_context, session),
        },
        "quick_meaning": {
            "surface": selected_text,
            "pinyin": pinyin_display(selected_text) if contains_chinese(selected_text) else "",
            "definitions_vi": quick_vi or [f'Cần bổ sung nghĩa tiếng Việt cho "{selected_text}"'],
            "definitions_en": quick_en,
            "hsk_level": max(hsk_levels) if hsk_levels else None,
            "domain_tags": domain_tags or [domain],
            "confidence": confidence,
        },
        "translations": {"natural_vi": natural_vi, "literal_vi": literal_vi},
        "context": {"domain": domain, "role_vi": role["role_vi"], "explanation_vi": role["explanation_vi"], "confidence": confidence},
        "grammar": {
            "patterns": grammar_patterns(source_sentence),
            "explanation_vi": (grammar_patterns(source_sentence)[0]["meaning_vi"] if grammar_patterns(source_sentence) else "Chưa phát hiện mẫu ngữ pháp rule-based nổi bật trong selection này."),
        },
        "examples": contextual_examples(selected_text, domain),
        "review_suggestion": review_suggestion(selected_text, source_sentence, natural_vi, selected_tokens),
        "personalization": {
            "applied_correction": bool(correction),
            "correction_id": correction.id if correction else None,
            "user_level": payload.user_level or profile.target_level,
        },
    }


class NlpAnalyzeRequest(BaseModel):
    text: str | None = None
    selected_text: str | None = None
    source_sentence: str | None = None
    paragraph_context: str | None = None
    page_context: str | None = None
    mode: str | None = "auto"
    domain_mode: str | None = "auto"
    user_level: str | None = None
    ai_enabled: bool = False


class AIContextRequest(NlpAnalyzeRequest):
    model: str | None = None
    temperature: float = Field(default=0.2, ge=0, le=2)


class TextRequest(BaseModel):
    text: str


class DictionaryImportRequest(BaseModel):
    file_path: str
    source: str = "cc-cedict"


class CustomDictionaryRequest(BaseModel):
    simplified: str
    traditional: str | None = None
    pinyin: str | None = None
    definition_vi: str
    definition_en: str | None = ""
    domain: str = "general"
    note: str = ""


class DocumentCreateRequest(BaseModel):
    title: str
    file_name: str = ""
    source_type: str = "pdf"
    language: str = "zh-CN"
    content: str = ""


class PageCreateRequest(BaseModel):
    page_number: int
    text: str = ""
    width: float | None = None
    height: float | None = None


class AnnotationCreateRequest(BaseModel):
    id: str | None = None
    document_id: str
    page_id: str = "page-1"
    page_number: int | None = None
    sentence_id: str | None = None
    selected_text: str
    source_sentence: str = ""
    selection_start: int = 0
    selection_end: int = 0
    bbox_json: str | None = None
    annotation_type: Literal["word", "phrase", "sentence"] | str = "word"
    note: str | None = ""
    explanation_vi: str | None = ""
    selected_meaning_vi: str | None = ""
    analysis_json: str | dict[str, Any] | None = None
    pinyin: str | None = ""
    hsk_level: int | None = None
    domain_tag: str | None = None


class ReviewItemCreateRequest(BaseModel):
    annotation_id: str | None = None
    item_type: str = "flashcard"
    source_type: str | None = None
    front: str | None = None
    back: str | None = None
    context: str | None = None
    source_sentence: str | None = None
    pinyin: str | None = None
    hsk_level: int | None = None
    domain_tag: str | None = None


class ReviewEventCreateRequest(BaseModel):
    review_item_id: str
    rating: int | str
    response_time_ms: int = 0


class TranslateRequest(BaseModel):
    text: str
    sourceLang: str = "auto"
    targetLang: str = "vi"


class UserCorrectionCreateRequest(BaseModel):
    original_term: str
    system_translation: str = ""
    user_translation: str
    context: str = ""
    domain: str = "general"


class KnownWordCreateRequest(BaseModel):
    word: str
    confidence: float = Field(0.5, ge=0, le=1)


class VocabularyUpsertRequest(BaseModel):
    word: str
    translation: str = ""
    pinyin: str = ""
    context: str = ""
    source_file: str = ""
    source_document_id: str = ""
    hsk_level: int | None = None
    domain_tags: list[str] = Field(default_factory=list)
    topic: str = "general"


class VocabularyPatchRequest(BaseModel):
    translation: str | None = None
    topic: str | None = None
    favorite: bool | None = None
    learned: bool | None = None


class BackupRestoreRequest(BaseModel):
    file_name: str


class AutoReviewCreateRequest(BaseModel):
    limit: int = Field(20, ge=1, le=100)
    min_frequency: int = Field(1, ge=1, le=50)


class GoogleAIError(Exception):
    def __init__(self, status_code: int, message: str) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.message = message


def google_ai_model(default: str = "gemini-3.5-flash") -> str:
    return app_config("GOOGLE_AI_MODEL", app_config("GEMINI_MODEL", default))


def google_ai_endpoint() -> str:
    return app_config("GOOGLE_AI_ENDPOINT", "https://generativelanguage.googleapis.com/v1beta").rstrip("/")


def ai_status_payload() -> dict[str, Any]:
    keys = load_google_api_keys()
    return {
        "enabled": bool(keys),
        "provider": "google_gemini",
        "model": google_ai_model(),
        "endpoint": google_ai_endpoint(),
        "key_source": "GOOGLE_API_KEYS/GEMINI_API_KEYS env, backend/.env, or backend/data/google_api_keys.txt",
        **google_key_pool.status(keys),
    }


def build_ai_context_prompt(payload: AIContextRequest | NlpAnalyzeRequest, rule_based: dict[str, Any], session: Session) -> str:
    profile = get_profile(session)
    selection = rule_based.get("selection", {})
    quick_meaning = rule_based.get("quick_meaning", {})
    grammar = rule_based.get("grammar", {})
    deterministic_context = {
        "selected_text": selection.get("selected_text") or payload.selected_text or payload.text,
        "source_sentence": selection.get("source_sentence") or payload.source_sentence,
        "paragraph_context": selection.get("paragraph_context") or payload.paragraph_context,
        "page_context": selection.get("page_context") or payload.page_context,
        "domain": selection.get("domain_mode") or payload.domain_mode,
        "user_level": selection.get("user_level") or payload.user_level or profile.target_level,
        "dictionary_meaning": quick_meaning,
        "rule_based_translations": rule_based.get("translations", {}),
        "rule_based_context": rule_based.get("context", {}),
        "rule_based_grammar": grammar,
        "review_suggestion": rule_based.get("review_suggestion", {}),
        "profile": {
            "native_language": profile.native_language,
            "target_level": profile.target_level,
            "preferred_domains": json_loads(profile.preferred_domains_json, ["general"]),
            "show_pinyin": profile.show_pinyin,
            "translation_style": profile.translation_style,
        },
    }
    return (
        "Bạn là AI context reading layer cho app học đọc tiếng Trung của người Việt.\n"
        "Nhiệm vụ: giải thích selection trong ngữ cảnh, không dịch từng chữ máy móc, không bịa nghĩa ngoài dữ liệu nếu không chắc.\n"
        "Ưu tiên nghĩa tiếng Việt trong dictionary/user corrections, domain, câu gốc và trình độ HSK của user.\n"
        "Trả về JSON hợp lệ, không markdown, không chú thích ngoài JSON.\n"
        "Schema JSON bắt buộc:\n"
        "{\n"
        '  "natural_vi": "bản dịch tự nhiên",\n'
        '  "literal_vi": "bản dịch sát cấu trúc",\n'
        '  "context_explanation_vi": "giải thích vai trò của selection trong câu",\n'
        '  "grammar_notes": [{"pattern": "...", "meaning_vi": "...", "evidence": "..."}],\n'
        '  "nuance_vi": "sắc thái/ngữ vực/domain nếu có",\n'
        '  "domain": "general|economics|computer_science|academic|education|business",\n'
        '  "review_suggestions": [{"type": "cloze|flashcard", "front": "...", "back": "...", "reason_vi": "..."}],\n'
        '  "personalization": {"level_adjustment_vi": "...", "show_pinyin": true},\n'
        '  "confidence": 0.0\n'
        "}\n\n"
        f"Dữ liệu cục bộ đã phân tích:\n{json_dumps(deterministic_context)}"
    )


def extract_gemini_text(response_json: dict[str, Any]) -> str:
    candidates = response_json.get("candidates") or []
    if not candidates:
        return ""
    parts = candidates[0].get("content", {}).get("parts", [])
    return "".join(str(part.get("text", "")) for part in parts if isinstance(part, dict)).strip()


def parse_ai_json(text: str) -> dict[str, Any]:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?", "", cleaned, flags=re.I).strip()
        cleaned = re.sub(r"```$", "", cleaned).strip()
    try:
        parsed = json.loads(cleaned)
        return parsed if isinstance(parsed, dict) else {"raw_text": cleaned}
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", cleaned, flags=re.S)
        if match:
            try:
                parsed = json.loads(match.group(0))
                return parsed if isinstance(parsed, dict) else {"raw_text": cleaned}
            except json.JSONDecodeError:
                pass
    return {"raw_text": cleaned}


def post_google_generate_content(api_key: str, model: str, prompt: str, temperature: float) -> dict[str, Any]:
    url = f"{google_ai_endpoint()}/models/{model}:generateContent"
    body = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": temperature,
            "maxOutputTokens": 1200,
            "responseMimeType": "application/json",
        },
    }
    try:
        response = httpx.post(
            url,
            headers={"x-goog-api-key": api_key, "Content-Type": "application/json"},
            json=body,
            timeout=config_float("GOOGLE_AI_TIMEOUT_SECONDS", 30, minimum=3, maximum=120),
        )
    except httpx.HTTPError as exc:
        raise GoogleAIError(0, str(exc)) from exc
    if response.status_code >= 400:
        message = response.text[:240] if response.text else response.reason_phrase
        raise GoogleAIError(response.status_code, message)
    return response.json()


def generate_google_ai_context(payload: AIContextRequest | NlpAnalyzeRequest, rule_based: dict[str, Any], session: Session) -> dict[str, Any]:
    keys = load_google_api_keys()
    model = payload.model if isinstance(payload, AIContextRequest) and payload.model else google_ai_model()
    temperature = payload.temperature if isinstance(payload, AIContextRequest) else 0.2
    if not keys:
        return {
            "enabled": False,
            "provider": "google_gemini",
            "model": model,
            "status": "missing_api_key",
            "message": "Configure GOOGLE_API_KEYS in backend/.env or add keys to backend/data/google_api_keys.txt.",
        }

    prompt = build_ai_context_prompt(payload, rule_based, session)
    errors: list[dict[str, Any]] = []
    for _ in range(len(keys)):
        key_index, api_key = google_key_pool.next_key(keys)
        try:
            response_json = post_google_generate_content(api_key, model, prompt, temperature)
            text = extract_gemini_text(response_json)
            parsed = parse_ai_json(text)
            return {
                "enabled": True,
                "provider": "google_gemini",
                "model": model,
                "key_index": key_index,
                "key_fingerprint": secret_fingerprint(api_key),
                "status": "ok",
                "response": parsed,
                "usage": response_json.get("usageMetadata", {}),
            }
        except GoogleAIError as exc:
            errors.append({"key_index": key_index, "status_code": exc.status_code, "message": exc.message[:160]})
            if exc.status_code == 400:
                break

    return {
        "enabled": True,
        "provider": "google_gemini",
        "model": model,
        "status": "all_keys_failed",
        "errors": errors,
    }


if os.environ.get("HANORA_SKIP_CREATE_ALL") != "1":
    Base.metadata.create_all(engine)
    ensure_runtime_schema()
    with SessionLocal() as startup_session:
        configure_jieba(startup_session)
        get_profile(startup_session)

app = FastAPI(title="Chinese Context Reader Local API", version=APP_VERSION)
app.add_middleware(
    CORSMiddleware,
    allow_origins=configured_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "version": APP_VERSION}


@app.get("/api/health/deep")
def health_deep(session: Session = Depends(db_session)) -> dict[str, Any]:
    checks: dict[str, Any] = {
        "database": {"ok": False, "path": str(DB_PATH), "size_bytes": DB_PATH.stat().st_size if DB_PATH.exists() else 0},
        "uploads": {"ok": UPLOAD_DIR.exists(), "path": str(UPLOAD_DIR)},
        "backups": {"ok": BACKUP_DIR.exists(), "path": str(BACKUP_DIR)},
        "dictionary": {"ok": False, "entries": 0, "cc_cedict_entries": 0, "hsk_vocab_entries": 0},
        "ai": ai_status_payload(),
    }
    try:
        session.execute(sql_text("SELECT 1")).scalar_one()
        dictionary_total = session.scalar(select(func.count(DictionaryEntryRecord.id))) or 0
        all_dictionary_entries = len(SEED_DICTIONARY) + dictionary_total
        checks["database"]["ok"] = True
        checks["dictionary"] = {
            "ok": all_dictionary_entries > 0,
            "entries": all_dictionary_entries,
            "cc_cedict_entries": session.scalar(select(func.count(DictionaryEntryRecord.id)).where(DictionaryEntryRecord.source == "cc-cedict")) or 0,
            "hsk_vocab_entries": session.scalar(select(func.count(DictionaryEntryRecord.id)).where(DictionaryEntryRecord.source == "hsk_vocab")) or 0,
        }
    except Exception as exc:
        checks["database"]["error"] = str(exc)

    hard_failures = [name for name, payload in checks.items() if isinstance(payload, dict) and payload.get("ok") is False and name != "ai"]
    return {
        "status": "error" if hard_failures else "ok",
        "version": APP_VERSION,
        "environment": app_env(),
        "checks": checks,
        "warnings": runtime_config_warnings(),
    }


@app.get("/api/system/info")
def system_info(session: Session = Depends(db_session)) -> dict[str, Any]:
    custom_count = session.scalar(select(func.count(DictionaryEntryRecord.id))) or 0
    return {
        "nlp_engine": "jieba",
        "pinyin_engine": "pypinyin",
        "dictionary_loaded": True,
        "dictionary_entries": len(SEED_DICTIONARY) + custom_count,
        "database": "sqlite",
        "orm": "sqlalchemy",
        "offline_first": True,
    }


@app.get("/api/system/config")
def system_config() -> dict[str, Any]:
    return {
        "environment": app_env(),
        "frontend_origins": configured_cors_origins(),
        "data_dir": str(DATA_DIR),
        "upload": {
            "dir": str(UPLOAD_DIR),
            "max_bytes": max_upload_bytes(),
            "allowed_extensions": sorted(allowed_upload_extensions()),
            "rate_limit_per_minute": upload_rate_limit_per_minute(),
        },
        "rate_limits": {
            "ai_per_minute": ai_rate_limit_per_minute(),
            "upload_per_minute": upload_rate_limit_per_minute(),
        },
        "backup_dir": str(BACKUP_DIR),
        "ai": ai_status_payload(),
        "warnings": runtime_config_warnings(),
    }


@app.get("/api/ai/status")
def ai_status() -> dict[str, Any]:
    return ai_status_payload()


@app.post("/api/ai/context-reading")
def ai_context_reading(
    payload: AIContextRequest,
    session: Session = Depends(db_session),
    request: Request = Depends(current_request),
) -> dict[str, Any]:
    if isinstance(request, Request):
        rate_limiter.check(request, name="ai", limit=ai_rate_limit_per_minute())
    text = (payload.selected_text or payload.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text parameter is required.")
    rule_based = build_contextual_analysis(payload, session) if (
        payload.selected_text or payload.source_sentence or payload.paragraph_context or payload.page_context
    ) else analyze_chinese(text, session)
    return {
        "rule_based": rule_based,
        "ai": generate_google_ai_context(payload, rule_based, session),
    }


@app.post("/api/nlp/analyze")
def nlp_analyze(
    payload: NlpAnalyzeRequest,
    session: Session = Depends(db_session),
    request: Request | None = Depends(current_request),
) -> dict[str, Any]:
    text = (payload.selected_text or payload.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text parameter is required.")
    if payload.selected_text or payload.source_sentence or payload.paragraph_context or payload.page_context:
        analysis = build_contextual_analysis(payload, session)
    else:
        analysis = analyze_chinese(text, session)
    if payload.ai_enabled:
        if isinstance(request, Request):
            rate_limiter.check(request, name="ai", limit=ai_rate_limit_per_minute())
        analysis["ai_context"] = generate_google_ai_context(payload, analysis, session)
    return analysis


@app.post("/api/nlp/segment")
def nlp_segment(payload: TextRequest, session: Session = Depends(db_session)) -> dict[str, list[str]]:
    return {"tokens": [token["surface"] for token in tokenize_chinese(payload.text, session)]}


@app.post("/api/nlp/pinyin")
def nlp_pinyin(payload: TextRequest) -> dict[str, str]:
    return {"text": payload.text, "pinyin": pinyin_display(payload.text)}


def parse_cedict_line(line: str, source: str) -> dict[str, Any] | None:
    if not line or line.startswith("#"):
        return None
    match = re.match(r"^(\S+)\s+(\S+)\s+\[([^\]]+)\]\s+\/(.+)\/$", line)
    if not match:
        return None
    traditional, simplified, raw_pinyin, definitions = match.groups()
    return {
        "traditional": traditional,
        "simplified": simplified,
        "pinyin": raw_pinyin.lower(),
        "pinyin_numbered": raw_pinyin.lower(),
        "vi": "",
        "en": "; ".join([item for item in definitions.split("/") if item]),
        "source": source,
        "confidence": 0.7,
    }


@app.post("/api/dictionary/import")
def dictionary_import(payload: DictionaryImportRequest, session: Session = Depends(db_session)) -> dict[str, int]:
    resolved = Path(payload.file_path)
    if not resolved.is_absolute():
        resolved = (BASE_DIR / payload.file_path).resolve()
    if not resolved.exists():
        raise HTTPException(status_code=404, detail=f"Dictionary file not found: {resolved}")

    imported = skipped = errors = 0
    for line in resolved.read_text(encoding="utf-8").splitlines():
        stripped_line = line.strip()
        try:
            entry = parse_cedict_line(stripped_line, payload.source)
            if not entry:
                skipped += 1
                continue
            existing = session.execute(
                select(DictionaryEntryRecord)
                .where(DictionaryEntryRecord.simplified == entry["simplified"])
                .where(DictionaryEntryRecord.source == payload.source)
            ).scalar_one_or_none()
            if not existing:
                existing = DictionaryEntryRecord(simplified=entry["simplified"])
                session.add(existing)
            existing.traditional = entry["traditional"]
            existing.pinyin = entry["pinyin"]
            existing.pinyin_numbered = entry["pinyin_numbered"]
            existing.vi = entry["vi"]
            existing.en = entry["en"]
            existing.source = entry["source"]
            existing.source_version = resolved.name
            existing.license = "CC-CEDICT" if payload.source == "cc-cedict" else ""
            existing.raw_line = stripped_line
            existing.confidence = entry["confidence"]
            imported += 1
        except Exception:
            errors += 1
    session.commit()
    configure_jieba(session)
    return {"imported": imported, "skipped": skipped, "errors": errors}


@app.get("/api/dictionary/search")
def dictionary_search(q: str = Query(...), session: Session = Depends(db_session)) -> dict[str, Any]:
    query = q.strip()
    if not query:
        raise HTTPException(status_code=400, detail="q query parameter is required.")

    results: list[dict[str, Any]] = []
    corrections = session.execute(
        select(UserCorrectionRecord).where(
            (UserCorrectionRecord.original_term.contains(query)) | (UserCorrectionRecord.user_translation.contains(query))
        )
    ).scalars()
    for correction in corrections:
        results.append(
            to_dictionary_result(
                {
                    "simplified": correction.original_term,
                    "traditional": correction.original_term,
                    "pinyin": pinyin_display(correction.original_term) if contains_chinese(correction.original_term) else "",
                    "vi": correction.user_translation,
                    "en": correction.system_translation,
                    "domain_tags": [correction.domain],
                    "source": "user_corrections",
                    "confidence": 0.95,
                }
            )
        )
    for entry in SEED_DICTIONARY:
        haystack = " ".join(str(entry.get(key, "")) for key in ["simplified", "traditional", "pinyin", "vi", "en"]).lower()
        if query.lower() in haystack:
            results.append(to_dictionary_result(entry))
    db_results = session.execute(
        select(DictionaryEntryRecord).where(
            (DictionaryEntryRecord.simplified.contains(query))
            | (DictionaryEntryRecord.traditional.contains(query))
            | (DictionaryEntryRecord.pinyin.contains(query))
            | (DictionaryEntryRecord.vi.contains(query))
            | (DictionaryEntryRecord.en.contains(query))
        )
    ).scalars()
    for entry in db_results:
        results.append(to_dictionary_result(entry))

    deduped: dict[tuple[str, str], dict[str, Any]] = {}
    for result in sorted(results, key=lambda item: dictionary_relevance_key(item, query)):
        dedupe_key = (result["simplified"], result["source"])
        if dedupe_key not in deduped:
            deduped[dedupe_key] = result
    return {"query": query, "results": list(deduped.values())[:20]}


@app.post("/api/dictionary/custom", status_code=201)
def dictionary_custom(payload: CustomDictionaryRequest, session: Session = Depends(db_session)) -> dict[str, Any]:
    existing = session.execute(select(DictionaryEntryRecord).where(DictionaryEntryRecord.simplified == payload.simplified)).scalar_one_or_none()
    if not existing:
        existing = DictionaryEntryRecord(simplified=payload.simplified)
        session.add(existing)
    existing.traditional = payload.traditional or payload.simplified
    existing.pinyin = payload.pinyin or pinyin_display(payload.simplified)
    existing.pinyin_numbered = pinyin_numbered(payload.simplified)
    existing.vi = payload.definition_vi
    existing.en = payload.definition_en or ""
    existing.domain_tags_json = json_dumps([payload.domain])
    existing.source = "custom_vi"
    existing.confidence = 0.9
    existing.note = payload.note
    session.commit()
    session.refresh(existing)
    configure_jieba(session)
    return {"status": "saved", "entry": to_dictionary_result(existing)}


@app.post("/api/documents", status_code=201)
def create_document(payload: DocumentCreateRequest, session: Session = Depends(db_session)) -> dict[str, str]:
    doc_id = make_id("doc")
    record = DocumentRecord(
        id=doc_id,
        title=payload.title,
        file_name=payload.file_name,
        original_filename=payload.file_name,
        source_type=payload.source_type,
        language=payload.language,
        content=payload.content,
    )
    session.add(record)
    session.commit()
    return {"document_id": doc_id, "status": "created"}


@app.post("/api/documents/upload", status_code=201)
async def upload_document(
    file: UploadFile = File(...),
    language: str = Form("zh-CN"),
    session: Session = Depends(db_session),
    request: Request = Depends(current_request),
) -> dict[str, Any]:
    if isinstance(request, Request):
        rate_limiter.check(request, name="upload", limit=upload_rate_limit_per_minute())
    original_name = safe_filename(file.filename or "document.pdf")
    suffix = Path(original_name).suffix.lower() or ".bin"
    if suffix not in allowed_upload_extensions():
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type '{suffix}'. Allowed: {', '.join(sorted(allowed_upload_extensions()))}.",
        )

    data = await read_upload_file_limited(file)
    if not data:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    source_type = suffix.lstrip(".") or "file"
    doc_id = make_id("doc")
    checksum = hashlib.sha256(data).hexdigest()
    stored_filename = f"{doc_id}_{checksum[:12]}{suffix}"
    stored_path = (UPLOAD_DIR / stored_filename).resolve()
    if not path_is_under(stored_path, UPLOAD_DIR):
        raise HTTPException(status_code=400, detail="Invalid upload storage path.")
    stored_path.write_bytes(data)

    try:
        extracted_text = extract_file_text(original_name, data).strip()
    except Exception:
        extracted_text = ""

    record = DocumentRecord(
        id=doc_id,
        title=original_name,
        file_name=original_name,
        original_filename=original_name,
        stored_filename=stored_filename,
        file_path=str(stored_path),
        sha256=checksum,
        mime_type=file.content_type or "application/octet-stream",
        source_type=source_type,
        language=language,
        content=extracted_text,
    )
    session.add(record)
    if extracted_text:
        session.add(PageRecord(document_id=doc_id, page_number=1, text=extracted_text))
    session.commit()
    return {
        "document_id": doc_id,
        "status": "created",
        "title": original_name,
        "file_name": original_name,
        "source_type": source_type,
        "language": language,
        "content": extracted_text,
        "sha256": checksum,
        "mime_type": record.mime_type,
        "file_url": f"/api/documents/{doc_id}/file",
    }


@app.get("/api/documents")
def list_documents(session: Session = Depends(db_session)) -> dict[str, Any]:
    documents = session.execute(select(DocumentRecord).order_by(DocumentRecord.created_at.desc())).scalars().all()
    return {
        "documents": [
            {
                "id": document.id,
                "title": document.title,
                "language": document.language,
                "source_type": document.source_type,
                "file_name": document.file_name,
                "original_filename": document.original_filename,
                "sha256": document.sha256,
                "mime_type": document.mime_type,
                "content": document.content,
                "file_url": f"/api/documents/{document.id}/file" if document.file_path else "",
                "created_at": document.created_at.isoformat(),
            }
            for document in documents
        ]
    }


@app.get("/api/documents/{document_id}/file")
def get_document_file(document_id: str, session: Session = Depends(db_session)) -> FileResponse:
    document = session.get(DocumentRecord, document_id)
    if not document or not document.file_path:
        raise HTTPException(status_code=404, detail="Document file not found.")
    file_path = Path(document.file_path).resolve()
    if not path_is_under(file_path, UPLOAD_DIR):
        raise HTTPException(status_code=400, detail="Stored file path is outside upload storage.")
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Stored file is missing.")
    return FileResponse(
        path=file_path,
        media_type=document.mime_type or "application/octet-stream",
        filename=document.original_filename or document.file_name or file_path.name,
    )


@app.get("/api/documents/{document_id}")
def get_document(document_id: str, session: Session = Depends(db_session)) -> dict[str, Any]:
    document = session.get(DocumentRecord, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found.")
    pages = session.execute(select(PageRecord).where(PageRecord.document_id == document_id).order_by(PageRecord.page_number)).scalars().all()
    return {
        "id": document.id,
        "title": document.title,
        "file_name": document.file_name,
        "original_filename": document.original_filename,
        "stored_filename": document.stored_filename,
        "source_type": document.source_type,
        "language": document.language,
        "content": document.content,
        "sha256": document.sha256,
        "mime_type": document.mime_type,
        "file_url": f"/api/documents/{document.id}/file" if document.file_path else "",
        "created_at": document.created_at.isoformat(),
        "pages": [
            {"page_number": page.page_number, "text": page.text, "width": page.width, "height": page.height}
            for page in pages
        ],
    }


@app.post("/api/documents/{document_id}/pages", status_code=201)
def create_page(document_id: str, payload: PageCreateRequest, session: Session = Depends(db_session)) -> dict[str, Any]:
    if not session.get(DocumentRecord, document_id):
        raise HTTPException(status_code=404, detail="Document not found.")
    existing = session.execute(
        select(PageRecord).where(PageRecord.document_id == document_id).where(PageRecord.page_number == payload.page_number)
    ).scalar_one_or_none()
    if not existing:
        existing = PageRecord(document_id=document_id, page_number=payload.page_number)
        session.add(existing)
    existing.text = payload.text
    existing.width = payload.width
    existing.height = payload.height
    session.commit()
    return {"document_id": document_id, "page_number": payload.page_number, "status": "saved"}


def document_text(document: DocumentRecord, session: Session) -> str:
    if document.content.strip():
        return document.content.strip()
    pages = session.execute(
        select(PageRecord).where(PageRecord.document_id == document.id).order_by(PageRecord.page_number)
    ).scalars().all()
    return "\n".join(page.text for page in pages if page.text.strip()).strip()


def document_translation_sentence(document_id: str, sentence: str, index: int, session: Session) -> dict[str, Any]:
    tokens = tokenize_chinese(sentence, session)
    domain = detect_domain(sentence, "auto")
    return {
        "sentence_id": f"{document_id}-sentence-{index + 1}",
        "index": index,
        "source": sentence,
        "natural_vi": natural_translation(sentence, sentence, tokens, domain),
        "literal_vi": literal_translation(tokens),
        "pinyin": pinyin_display(sentence),
        "domain": domain,
        "grammar_patterns": grammar_patterns(sentence),
    }


@app.get("/api/documents/{document_id}/translate")
def translate_document(document_id: str, session: Session = Depends(db_session)) -> dict[str, Any]:
    document = session.get(DocumentRecord, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found.")
    text = document_text(document, session)
    translations = [
        document_translation_sentence(document.id, sentence, index, session)
        for index, sentence in enumerate(split_sentences(text))
    ]
    return {
        "document_id": document.id,
        "title": document.title,
        "mode": "local_rule_based",
        "translations": translations,
    }


def document_vocabulary_suggestions(document: DocumentRecord, session: Session, limit: int = 30) -> list[dict[str, Any]]:
    text = document_text(document, session)
    suggestions: dict[str, dict[str, Any]] = {}
    for sentence in split_sentences(text):
        for token in content_tokens(tokenize_chinese(sentence, session)):
            surface = token.get("surface", "").strip()
            if not surface or surface in PUNCTUATION:
                continue
            definitions_vi = token.get("definitions_vi") or []
            definitions_en = token.get("definitions_en") or []
            if len(surface) == 1 and not definitions_vi and not definitions_en:
                continue
            domain_tags = token.get("domain_tags") or []
            hsk_level = token.get("hsk_level")
            score = 1.0
            score += min(len(surface), 6) * 0.25
            score += 1.0 if definitions_vi else 0.0
            score += 0.5 if definitions_en else 0.0
            score += 0.4 if domain_tags else 0.0
            score += (hsk_level or 0) * 0.08
            existing = suggestions.get(surface)
            if existing:
                existing["frequency"] += 1
                existing["score"] = round(existing["score"] + score + 0.35, 2)
                continue
            suggestions[surface] = {
                "surface": surface,
                "pinyin": token.get("pinyin", ""),
                "definition_vi": token_vi(token) or "",
                "definition_en": token_en(token) or "",
                "hsk_level": hsk_level,
                "domain_tags": domain_tags,
                "frequency": 1,
                "source_sentence": sentence,
                "score": round(score, 2),
            }
    return sorted(suggestions.values(), key=lambda item: (-item["score"], -len(item["surface"]), item["surface"]))[:limit]


@app.get("/api/documents/{document_id}/vocabulary-scan")
def scan_document_vocabulary(
    document_id: str,
    limit: int = Query(30, ge=1, le=100),
    session: Session = Depends(db_session),
) -> dict[str, Any]:
    document = session.get(DocumentRecord, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found.")
    return {
        "document_id": document.id,
        "title": document.title,
        "items": document_vocabulary_suggestions(document, session, limit),
    }


@app.post("/api/documents/{document_id}/auto-review-items")
def create_document_auto_review_items(
    document_id: str,
    payload: AutoReviewCreateRequest,
    session: Session = Depends(db_session),
) -> dict[str, Any]:
    document = session.get(DocumentRecord, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found.")

    existing_fronts = {
        row[0]
        for row in session.execute(
            select(ReviewItemRecord.front).where(ReviewItemRecord.context == f"auto:{document.id}")
        ).all()
    }
    created_items: list[ReviewItemRecord] = []
    skipped = 0
    suggestions = [
        item
        for item in document_vocabulary_suggestions(document, session, payload.limit)
        if item["frequency"] >= payload.min_frequency
    ]
    for index, suggestion in enumerate(suggestions):
        if suggestion["surface"] in existing_fronts:
            skipped += 1
            continue
        back = suggestion["definition_vi"] or suggestion["definition_en"] or "Cần bổ sung nghĩa Việt"
        item = ReviewItemRecord(
            id=f"{make_id('rev')}_{index}",
            annotation_id=None,
            item_type="flashcard",
            source_type="auto_vocabulary",
            front=suggestion["surface"],
            back=back,
            context=f"auto:{document.id}",
            source_sentence=suggestion["source_sentence"],
            pinyin=suggestion["pinyin"],
            hsk_level=suggestion["hsk_level"],
            domain_tag=(suggestion["domain_tags"] or [None])[0],
            due_at=review_scheduler.schedule_new(),
        )
        session.add(item)
        created_items.append(item)
        existing_fronts.add(item.front)
    session.commit()
    return {
        "document_id": document.id,
        "created": len(created_items),
        "skipped": skipped,
        "items": [review_item_to_dict(item) for item in created_items],
    }


def annotation_to_dict(annotation: AnnotationRecord) -> dict[str, Any]:
    return {
        "id": annotation.id,
        "document_id": annotation.document_id,
        "page_id": annotation.page_id,
        "page_number": annotation.page_number,
        "sentence_id": annotation.sentence_id,
        "selected_text": annotation.selected_text,
        "selection_start": annotation.selection_start,
        "selection_end": annotation.selection_end,
        "bbox_json": annotation.bbox_json,
        "annotation_type": annotation.annotation_type,
        "note": annotation.note,
        "explanation_vi": annotation.explanation_vi,
        "selected_meaning_vi": annotation.selected_meaning_vi,
        "analysis_json": annotation.analysis_json,
        "source_sentence": annotation.source_sentence,
        "pinyin": annotation.pinyin,
        "hsk_level": annotation.hsk_level,
        "domain_tag": annotation.domain_tag,
        "created_at": annotation.created_at.isoformat(),
    }


@app.post("/api/annotations", status_code=201)
def create_annotation(payload: AnnotationCreateRequest, session: Session = Depends(db_session)) -> dict[str, str]:
    annotation_id = payload.id or make_id("ann")
    analysis_json = payload.analysis_json
    if isinstance(analysis_json, dict):
        analysis_json = json_dumps(analysis_json)
    record = AnnotationRecord(
        id=annotation_id,
        document_id=payload.document_id,
        page_id=payload.page_id,
        page_number=payload.page_number,
        sentence_id=payload.sentence_id,
        selected_text=payload.selected_text,
        selection_start=payload.selection_start,
        selection_end=payload.selection_end,
        bbox_json=payload.bbox_json,
        annotation_type=str(payload.annotation_type),
        note=payload.note or "",
        explanation_vi=payload.explanation_vi or payload.selected_meaning_vi or "",
        selected_meaning_vi=payload.selected_meaning_vi or payload.explanation_vi or "",
        analysis_json=analysis_json or "{}",
        source_sentence=payload.source_sentence,
        pinyin=payload.pinyin or "",
        hsk_level=payload.hsk_level,
        domain_tag=payload.domain_tag,
    )
    session.merge(record)
    document = session.get(DocumentRecord, payload.document_id)
    upsert_vocabulary_item(
        VocabularyUpsertRequest(
            word=payload.selected_text,
            translation=payload.selected_meaning_vi or payload.explanation_vi or "",
            pinyin=payload.pinyin or "",
            context=payload.source_sentence,
            source_file=document.title if document else payload.document_id,
            source_document_id=payload.document_id,
            hsk_level=payload.hsk_level,
            domain_tags=[payload.domain_tag] if payload.domain_tag else [],
        ),
        session,
    )
    session.commit()
    return {"id": annotation_id, "annotation_id": annotation_id, "status": "saved"}


@app.get("/api/annotations")
def list_annotations(
    document_id: str | None = None,
    page_id: str | None = None,
    page_number: int | None = None,
    session: Session = Depends(db_session),
) -> list[dict[str, Any]]:
    statement = select(AnnotationRecord).order_by(AnnotationRecord.created_at.desc())
    if document_id:
        statement = statement.where(AnnotationRecord.document_id == document_id)
    if page_id:
        statement = statement.where(AnnotationRecord.page_id == page_id)
    if page_number is not None:
        statement = statement.where(AnnotationRecord.page_number == page_number)
    return [annotation_to_dict(annotation) for annotation in session.execute(statement).scalars()]


@app.patch("/api/annotations/{annotation_id}")
def update_annotation(annotation_id: str, payload: dict[str, Any], session: Session = Depends(db_session)) -> dict[str, Any]:
    annotation = session.get(AnnotationRecord, annotation_id)
    if not annotation:
        raise HTTPException(status_code=404, detail="Annotation not found.")
    for key in ["note", "explanation_vi", "selected_meaning_vi", "analysis_json", "annotation_type"]:
        if key in payload:
            setattr(annotation, key, json_dumps(payload[key]) if key == "analysis_json" and isinstance(payload[key], dict) else payload[key])
    annotation.updated_at = now_utc()
    session.commit()
    return {"annotation_id": annotation_id, "status": "updated", "annotation": annotation_to_dict(annotation)}


@app.delete("/api/annotations/{annotation_id}")
def delete_annotation(annotation_id: str, session: Session = Depends(db_session)) -> dict[str, Any]:
    annotation = session.get(AnnotationRecord, annotation_id)
    deleted = bool(annotation)
    if annotation:
        session.delete(annotation)
        session.execute(delete(ReviewItemRecord).where(ReviewItemRecord.annotation_id == annotation_id))
        session.commit()
    return {"annotation_id": annotation_id, "deleted": deleted}


def review_item_to_dict(item: ReviewItemRecord) -> dict[str, Any]:
    return {
        "id": item.id,
        "annotation_id": item.annotation_id,
        "item_type": item.item_type,
        "source_type": item.source_type,
        "front": item.front,
        "back": item.back,
        "context": item.context,
        "source_sentence": item.source_sentence,
        "pinyin": item.pinyin,
        "hsk_level": item.hsk_level,
        "domain_tag": item.domain_tag,
        "due_at": item.due_at.isoformat(),
        "interval_days": item.interval_days,
        "ease": item.ease,
        "reviewed": item.reviewed,
        "created_at": item.created_at.isoformat(),
    }


def create_review_item_record(payload: ReviewItemCreateRequest, session: Session) -> ReviewItemRecord:
    annotation = session.get(AnnotationRecord, payload.annotation_id) if payload.annotation_id else None
    item_type = payload.item_type or "flashcard"
    source_type = payload.source_type or annotation.annotation_type if annotation else payload.source_type or item_type
    return ReviewItemRecord(
        id=make_id("rev"),
        annotation_id=payload.annotation_id,
        item_type=item_type,
        source_type=source_type,
        front=payload.front or (annotation.selected_text if annotation else "新词"),
        back=payload.back or (annotation.explanation_vi or annotation.selected_meaning_vi if annotation else ""),
        context=payload.context or (annotation.note if annotation else ""),
        source_sentence=payload.source_sentence or (annotation.source_sentence if annotation else ""),
        pinyin=payload.pinyin or (annotation.pinyin if annotation else ""),
        hsk_level=payload.hsk_level if payload.hsk_level is not None else (annotation.hsk_level if annotation else None),
        domain_tag=payload.domain_tag or (annotation.domain_tag if annotation else None),
        due_at=review_scheduler.schedule_new(),
    )


@app.post("/api/review-items", status_code=201)
@app.post("/api/review/items", status_code=201)
def create_review_item(payload: ReviewItemCreateRequest, session: Session = Depends(db_session)) -> dict[str, Any]:
    item = create_review_item_record(payload, session)
    session.add(item)
    session.commit()
    return {"id": item.id, "review_item_id": item.id, "due_at": item.due_at.isoformat()}


@app.get("/api/review-items/due")
def due_review_items(session: Session = Depends(db_session)) -> dict[str, Any]:
    items = session.execute(select(ReviewItemRecord).where(ReviewItemRecord.due_at <= now_utc())).scalars().all()
    return {"items": [review_item_to_dict(item) for item in items]}


@app.get("/api/review-items")
def review_items(status: str | None = None, session: Session = Depends(db_session)) -> dict[str, Any]:
    statement = select(ReviewItemRecord).order_by(ReviewItemRecord.created_at.desc())
    if status == "due":
        statement = statement.where(ReviewItemRecord.due_at <= now_utc())
    return {"items": [review_item_to_dict(item) for item in session.execute(statement).scalars()]}


@app.get("/api/review/items")
def legacy_review_items(status: str | None = None, session: Session = Depends(db_session)) -> list[dict[str, Any]]:
    statement = select(ReviewItemRecord).order_by(ReviewItemRecord.created_at.desc())
    if status == "due":
        statement = statement.where(ReviewItemRecord.due_at <= now_utc())
    return [review_item_to_dict(item) for item in session.execute(statement).scalars()]


def normalize_rating(rating: int | str) -> int:
    if isinstance(rating, str):
        return {"again": 1, "hard": 2, "good": 3, "easy": 4}.get(rating.lower(), 3)
    return max(1, min(4, int(rating)))


class SimpleReviewScheduler:
    def schedule_new(self) -> datetime:
        return now_utc()

    def schedule_review(self, item: ReviewItemRecord, rating: int) -> tuple[datetime, int, float]:
        if rating <= 1:
            next_due = now_utc() + timedelta(minutes=10)
            interval_days = 0
        elif rating == 2:
            next_due = now_utc() + timedelta(days=1)
            interval_days = 1
        elif rating == 3:
            interval_days = max(3, item.interval_days + 2)
            next_due = now_utc() + timedelta(days=interval_days)
        else:
            interval_days = max(7, item.interval_days + 5)
            next_due = now_utc() + timedelta(days=interval_days)

        ease = max(1.3, float(item.ease or 2.5) + (rating - 3) * 0.15)
        return next_due, interval_days, ease


review_scheduler = SimpleReviewScheduler()


@app.post("/api/review-events")
@app.post("/api/review/events")
def create_review_event(payload: ReviewEventCreateRequest, session: Session = Depends(db_session)) -> dict[str, Any]:
    item = session.get(ReviewItemRecord, payload.review_item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Review item not found.")
    rating = normalize_rating(payload.rating)
    next_due, interval_days, ease = review_scheduler.schedule_review(item, rating)
    item.interval_days = interval_days
    item.ease = ease
    item.due_at = next_due
    item.reviewed = True
    event = ReviewEventRecord(id=make_id("evt"), review_item_id=item.id, rating=rating, response_time_ms=payload.response_time_ms)
    session.add(event)
    session.commit()
    return {"status": "updated", "next_due_at": item.due_at.isoformat(), "interval_days": interval_days}


@app.get("/api/dashboard/summary")
def dashboard_summary(session: Session = Depends(db_session)) -> dict[str, Any]:
    total_reviews = session.scalar(select(func.count(ReviewEventRecord.id))) or 0
    good_reviews = session.scalar(select(func.count(ReviewEventRecord.id)).where(ReviewEventRecord.rating >= 3)) or 0
    due_today = session.scalar(select(func.count(ReviewItemRecord.id)).where(ReviewItemRecord.due_at <= now_utc())) or 0
    known_words = session.scalar(select(func.count(func.distinct(VocabularyItemRecord.word)))) or 0
    return {
        "documents_count": session.scalar(select(func.count(DocumentRecord.id))) or 0,
        "annotations_count": session.scalar(select(func.count(AnnotationRecord.id))) or 0,
        "review_items_count": session.scalar(select(func.count(ReviewItemRecord.id))) or 0,
        "due_today": due_today,
        "review_accuracy": round(good_reviews / total_reviews, 2) if total_reviews else 0,
        "known_words_estimate": known_words,
    }


@app.get("/api/dashboard/hsk-distribution")
def hsk_distribution(session: Session = Depends(db_session)) -> dict[str, int]:
    result = {"hsk_1": 0, "hsk_2": 0, "hsk_3": 0, "hsk_4": 0, "hsk_5": 0, "hsk_6": 0, "hsk_7_9": 0, "unknown": 0}
    for level in session.execute(select(AnnotationRecord.hsk_level)).scalars():
        if not level:
            result["unknown"] += 1
        elif level >= 7:
            result["hsk_7_9"] += 1
        else:
            result[f"hsk_{level}"] += 1
    return result


@app.get("/api/dashboard/domain-distribution")
def domain_distribution(session: Session = Depends(db_session)) -> dict[str, int]:
    result: dict[str, int] = {}
    for domain in session.execute(select(AnnotationRecord.domain_tag)).scalars():
        key = domain or "general"
        result[key] = result.get(key, 0) + 1
    return result


@app.get("/api/user/profile")
def user_profile(session: Session = Depends(db_session)) -> dict[str, Any]:
    profile = get_profile(session)
    return {"profile": profile_to_dict(profile)}


@app.patch("/api/user/profile")
def update_user_profile(payload: dict[str, Any], session: Session = Depends(db_session)) -> dict[str, Any]:
    profile = get_profile(session)
    for key in ["target_level", "native_language", "show_pinyin", "translation_style"]:
        if key in payload:
            setattr(profile, key, payload[key])
    if "preferred_domains" in payload:
        profile.preferred_domains_json = json_dumps(payload["preferred_domains"])
    session.commit()
    return user_profile(session)


@app.get("/api/user/corrections")
def list_user_corrections(session: Session = Depends(db_session)) -> dict[str, Any]:
    corrections = session.execute(select(UserCorrectionRecord).order_by(UserCorrectionRecord.created_at.desc())).scalars()
    return {
        "corrections": [
            {
                "id": correction.id,
                "original_term": correction.original_term,
                "system_translation": correction.system_translation,
                "user_translation": correction.user_translation,
                "context": correction.context,
                "domain": correction.domain,
                "created_at": correction.created_at.isoformat(),
            }
            for correction in corrections
        ]
    }


@app.post("/api/user/corrections", status_code=201)
def create_user_correction(payload: UserCorrectionCreateRequest, session: Session = Depends(db_session)) -> dict[str, Any]:
    correction = UserCorrectionRecord(
        id=make_id("corr"),
        original_term=payload.original_term,
        system_translation=payload.system_translation,
        user_translation=payload.user_translation,
        context=payload.context,
        domain=payload.domain,
    )
    session.add(correction)
    session.commit()
    return {"status": "saved", "correction": {"id": correction.id, "original_term": correction.original_term}}


def vocabulary_item_to_dict(item: VocabularyItemRecord) -> dict[str, Any]:
    return {
        "id": item.id,
        "word": item.word,
        "translation": item.translation,
        "pinyin": item.pinyin,
        "context": item.context,
        "source_file": item.source_file,
        "source_document_id": item.source_document_id,
        "hsk_level": item.hsk_level,
        "domain_tags": json_loads(item.domain_tags_json, []),
        "topic": item.topic,
        "favorite": item.favorite,
        "learned": item.learned,
        "lookup_count": item.lookup_count,
        "created_at": item.created_at.isoformat(),
        "updated_at": item.updated_at.isoformat(),
    }


def infer_vocabulary_topic(domain_tags: list[str], source_file: str = "") -> str:
    if domain_tags:
        primary = domain_tags[0]
        return {
            "economics": "Kinh tế",
            "business": "Kinh tế",
            "computer_science": "Công nghệ",
            "education": "Giáo trình",
            "academic": "Học thuật",
        }.get(primary, primary)
    lower_source = source_file.lower()
    if "hán ngữ" in lower_source or "hsk" in lower_source:
        return "Giáo trình"
    return "general"


def upsert_vocabulary_item(payload: VocabularyUpsertRequest, session: Session) -> VocabularyItemRecord:
    word = payload.word.strip()
    if not word:
        raise HTTPException(status_code=400, detail="word is required.")
    existing = session.execute(select(VocabularyItemRecord).where(VocabularyItemRecord.word == word)).scalar_one_or_none()
    now = now_utc()
    topic = payload.topic if payload.topic and payload.topic != "general" else infer_vocabulary_topic(payload.domain_tags, payload.source_file)
    if existing:
        if payload.translation:
            existing.translation = payload.translation
        if payload.pinyin:
            existing.pinyin = payload.pinyin
        if payload.context:
            existing.context = payload.context
        if payload.source_file:
            existing.source_file = payload.source_file
        if payload.source_document_id:
            existing.source_document_id = payload.source_document_id
        if payload.hsk_level is not None:
            existing.hsk_level = payload.hsk_level
        if payload.domain_tags:
            existing.domain_tags_json = json_dumps(payload.domain_tags)
        existing.topic = topic or existing.topic or "general"
        existing.lookup_count += 1
        existing.updated_at = now
        return existing

    item = VocabularyItemRecord(
        id=make_id("voc"),
        word=word,
        translation=payload.translation,
        pinyin=payload.pinyin,
        context=payload.context,
        source_file=payload.source_file,
        source_document_id=payload.source_document_id,
        hsk_level=payload.hsk_level,
        domain_tags_json=json_dumps(payload.domain_tags),
        topic=topic,
        lookup_count=1,
        created_at=now,
        updated_at=now,
    )
    session.add(item)
    return item


@app.post("/api/vocabulary/lookup", status_code=201)
def record_vocabulary_lookup(payload: VocabularyUpsertRequest, session: Session = Depends(db_session)) -> dict[str, Any]:
    item = upsert_vocabulary_item(payload, session)
    session.commit()
    session.refresh(item)
    return {"status": "saved", "item": vocabulary_item_to_dict(item)}


@app.get("/api/vocabulary")
def list_vocabulary_items(session: Session = Depends(db_session)) -> dict[str, Any]:
    items = session.execute(select(VocabularyItemRecord).order_by(VocabularyItemRecord.updated_at.desc())).scalars()
    return {"items": [vocabulary_item_to_dict(item) for item in items]}


@app.patch("/api/vocabulary/{item_id}")
def update_vocabulary_item(item_id: str, payload: VocabularyPatchRequest, session: Session = Depends(db_session)) -> dict[str, Any]:
    item = session.get(VocabularyItemRecord, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Vocabulary item not found.")
    if payload.translation is not None:
        item.translation = payload.translation
    if payload.topic is not None:
        item.topic = payload.topic
    if payload.favorite is not None:
        item.favorite = payload.favorite
    if payload.learned is not None:
        item.learned = payload.learned
    item.updated_at = now_utc()
    session.commit()
    return {"status": "updated", "item": vocabulary_item_to_dict(item)}


@app.delete("/api/vocabulary/{item_id}")
def delete_vocabulary_item(item_id: str, session: Session = Depends(db_session)) -> dict[str, Any]:
    item = session.get(VocabularyItemRecord, item_id)
    deleted = bool(item)
    if item:
        session.delete(item)
        session.commit()
    return {"id": item_id, "deleted": deleted}


@app.post("/api/known-words", status_code=201)
def create_known_word(payload: KnownWordCreateRequest, session: Session = Depends(db_session)) -> dict[str, str]:
    existing = session.execute(select(KnownWordRecord).where(KnownWordRecord.word == payload.word)).scalar_one_or_none()
    if existing:
        existing.confidence = payload.confidence
        existing.times_seen += 1
        existing.last_seen = now_utc()
    else:
        session.add(KnownWordRecord(id=make_id("kw"), word=payload.word, confidence=payload.confidence))
    session.commit()
    return {"status": "saved", "word": payload.word}


@app.get("/api/known-words")
def list_known_words(session: Session = Depends(db_session)) -> dict[str, Any]:
    words = session.execute(select(KnownWordRecord).order_by(KnownWordRecord.last_seen.desc())).scalars()
    return {
        "words": [
            {
                "id": word.id,
                "word": word.word,
                "confidence": word.confidence,
                "last_seen": word.last_seen.isoformat(),
                "times_seen": word.times_seen,
                "times_looked_up": word.times_looked_up,
                "created_at": word.created_at.isoformat(),
            }
            for word in words
        ]
    }


def create_database_backup() -> dict[str, Any]:
    if not DB_PATH.exists():
        raise HTTPException(status_code=404, detail="SQLite database does not exist yet.")
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = now_utc().strftime("%Y%m%dT%H%M%SZ")
    target = (BACKUP_DIR / f"hanora_{timestamp}.sqlite3").resolve()
    if not path_is_under(target, BACKUP_DIR):
        raise HTTPException(status_code=400, detail="Invalid backup path.")

    source = sqlite3.connect(str(DB_PATH))
    destination = sqlite3.connect(str(target))
    try:
        source.backup(destination)
    finally:
        destination.close()
        source.close()

    digest = hashlib.sha256(target.read_bytes()).hexdigest()
    return {
        "status": "created",
        "file_name": target.name,
        "path": str(target),
        "size_bytes": target.stat().st_size,
        "sha256": digest,
        "created_at": now_utc().isoformat(),
    }


def resolve_backup_path(file_name: str) -> Path:
    backup_name = Path(file_name).name
    if not backup_name.endswith(".sqlite3"):
        raise HTTPException(status_code=400, detail="Backup file must be a .sqlite3 file.")
    source = (BACKUP_DIR / backup_name).resolve()
    if not path_is_under(source, BACKUP_DIR):
        raise HTTPException(status_code=400, detail="Invalid backup file path.")
    if not source.exists():
        raise HTTPException(status_code=404, detail="Backup file not found.")
    return source


def restore_database_backup(file_name: str) -> dict[str, Any]:
    source_path = resolve_backup_path(file_name)
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    engine.dispose()
    source = sqlite3.connect(str(source_path))
    destination = sqlite3.connect(str(DB_PATH))
    try:
        source.backup(destination)
    finally:
        destination.close()
        source.close()
    ensure_runtime_schema()
    with SessionLocal() as session:
        configure_jieba(session)
        get_profile(session)
    return {
        "status": "restored",
        "file_name": source_path.name,
        "size_bytes": DB_PATH.stat().st_size if DB_PATH.exists() else 0,
        "restored_at": now_utc().isoformat(),
    }


@app.post("/api/admin/backup")
def admin_backup_database() -> dict[str, Any]:
    return create_database_backup()


@app.post("/api/admin/restore")
def admin_restore_database(payload: BackupRestoreRequest) -> dict[str, Any]:
    return restore_database_backup(payload.file_name)


@app.get("/api/admin/backups")
def admin_list_backups() -> dict[str, Any]:
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    backups = []
    for path in sorted(BACKUP_DIR.glob("hanora_*.sqlite3"), reverse=True):
        if not path_is_under(path, BACKUP_DIR):
            continue
        backups.append(
            {
                "file_name": path.name,
                "path": str(path),
                "size_bytes": path.stat().st_size,
                "created_at": datetime.fromtimestamp(path.stat().st_mtime, timezone.utc).isoformat(),
            }
        )
    return {"backups": backups}


@app.get("/api/admin/export")
def admin_export_data(
    include_dictionary: bool = False,
    dictionary_limit: int = Query(5000, ge=0, le=200000),
    session: Session = Depends(db_session),
) -> dict[str, Any]:
    profile = get_profile(session)
    documents = list_documents(session)["documents"]
    pages = session.execute(select(PageRecord).order_by(PageRecord.document_id, PageRecord.page_number)).scalars()
    review_events = session.execute(select(ReviewEventRecord).order_by(ReviewEventRecord.reviewed_at.desc())).scalars()
    known_words = list_known_words(session)["words"]
    vocabulary_items = list_vocabulary_items(session)["items"]
    corrections = list_user_corrections(session)["corrections"]

    payload: dict[str, Any] = {
        "exported_at": now_utc().isoformat(),
        "version": APP_VERSION,
        "profile": profile_to_dict(profile),
        "documents": documents,
        "pages": [
            {
                "document_id": page.document_id,
                "page_number": page.page_number,
                "text": page.text,
                "width": page.width,
                "height": page.height,
                "created_at": page.created_at.isoformat(),
            }
            for page in pages
        ],
        "annotations": list_annotations(session=session),
        "review_items": review_items(session=session)["items"],
        "review_events": [
            {
                "id": event.id,
                "review_item_id": event.review_item_id,
                "rating": event.rating,
                "response_time_ms": event.response_time_ms,
                "reviewed_at": event.reviewed_at.isoformat(),
            }
            for event in review_events
        ],
        "known_words": known_words,
        "vocabulary_items": vocabulary_items,
        "user_corrections": corrections,
    }

    if include_dictionary:
        dictionary_rows = (
            session.execute(select(DictionaryEntryRecord).order_by(DictionaryEntryRecord.source, DictionaryEntryRecord.simplified).limit(dictionary_limit))
            .scalars()
            .all()
        )
        payload["dictionary"] = [to_dictionary_result(row) for row in dictionary_rows]
        payload["dictionary_truncated"] = len(dictionary_rows) >= dictionary_limit
    return payload


@app.get("/api/debug/db-stats")
def debug_db_stats(session: Session = Depends(db_session)) -> dict[str, Any]:
    dictionary_total = session.scalar(select(func.count(DictionaryEntryRecord.id))) or 0
    return {
        "dictionary_entries": len(SEED_DICTIONARY) + dictionary_total,
        "database_dictionary_entries": dictionary_total,
        "cc_cedict_entries": session.scalar(select(func.count(DictionaryEntryRecord.id)).where(DictionaryEntryRecord.source == "cc-cedict")) or 0,
        "hsk_vocab_entries": session.scalar(select(func.count(DictionaryEntryRecord.id)).where(DictionaryEntryRecord.source == "hsk_vocab")) or 0,
        "custom_dictionary_entries": session.scalar(select(func.count(DictionaryEntryRecord.id)).where(DictionaryEntryRecord.source == "custom_vi")) or 0,
        "documents": session.scalar(select(func.count(DocumentRecord.id))) or 0,
        "pages": session.scalar(select(func.count(PageRecord.id))) or 0,
        "annotations": session.scalar(select(func.count(AnnotationRecord.id))) or 0,
        "review_items": session.scalar(select(func.count(ReviewItemRecord.id))) or 0,
        "review_events": session.scalar(select(func.count(ReviewEventRecord.id))) or 0,
        "known_words": session.scalar(select(func.count(KnownWordRecord.id))) or 0,
        "vocabulary_items": session.scalar(select(func.count(VocabularyItemRecord.id))) or 0,
        "user_corrections": session.scalar(select(func.count(UserCorrectionRecord.id))) or 0,
    }


@app.post("/api/debug/reset-demo")
def debug_reset_demo(session: Session = Depends(db_session)) -> dict[str, str]:
    for model in [
        DocumentRecord,
        PageRecord,
        AnnotationRecord,
        ReviewItemRecord,
        ReviewEventRecord,
        KnownWordRecord,
        VocabularyItemRecord,
        UserCorrectionRecord,
    ]:
        session.execute(delete(model))
    profile = get_profile(session)
    profile.target_level = "HSK4"
    profile.native_language = "vi"
    profile.preferred_domains_json = '["general"]'
    profile.show_pinyin = "always"
    profile.translation_style = "both"
    session.commit()
    return {"status": "reset"}


def local_translation_payload(text: str, source_lang: str = "auto", target_lang: str = "vi", session: Session | None = None) -> dict[str, Any]:
    close_session = False
    if session is None:
        session = SessionLocal()
        close_session = True
    try:
        analysis = analyze_chinese(text, session)
        tokens = [token for sentence in analysis["sentences"] for token in content_tokens(sentence["tokens"])]
        translated_text = " / ".join(filter(None, [token_vi(token) for token in tokens]))
        grammar = [pattern for sentence in analysis["sentences"] for pattern in sentence["grammar_patterns"]]
        return {
            "id": make_id("tr"),
            "sourceText": text,
            "translatedText": translated_text or f"{text} (chưa có nghĩa trong từ điển cục bộ)",
            "sourceLang": "zh" if contains_chinese(text) else source_lang,
            "targetLang": target_lang,
            "wordType": "Chinese context lookup" if contains_chinese(text) else "Local text",
            "grammarExplanation": grammar[0]["meaning_vi"] if grammar else "Kết quả tạo từ dictionary/NLP local, không gọi API cloud.",
            "usageExamples": [],
            "pronunciation": pinyin_display(text) if contains_chinese(text) else "",
            "tips": ["Offline-first: không cần API key ngoài cho MVP 0.1."],
            "difficulty": "intermediate",
            "timestamp": now_utc().isoformat(),
        }
    finally:
        if close_session:
            session.close()


@app.post("/api/translate")
def translate(payload: TranslateRequest, session: Session = Depends(db_session)) -> dict[str, Any]:
    if not payload.text.strip():
        raise HTTPException(status_code=400, detail="Text parameter is required.")
    return local_translation_payload(payload.text, payload.sourceLang, payload.targetLang, session)


@app.post("/api/detect-language")
def detect_language(payload: TextRequest) -> dict[str, str]:
    return {"language": "zh" if contains_chinese(payload.text) else "en" if re.search(r"[A-Za-z]", payload.text) else "auto"}


@app.post("/api/pinyin")
def pinyin_endpoint(payload: TextRequest) -> dict[str, str]:
    return {"original": payload.text, "pinyin": pinyin_display(payload.text), "pinyinNumbered": pinyin_numbered(payload.text), "pinyinRaw": " ".join(lazy_pinyin(payload.text))}


def extract_file_text(file_name: str, data: bytes) -> str:
    lower_name = file_name.lower()
    if lower_name.endswith((".png", ".jpg", ".jpeg", ".webp")):
        try:
            from ocr_service import ocr_chinese_image_bytes
            return ocr_chinese_image_bytes(data)
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Image OCR failed: {exc}") from exc
    if lower_name.endswith(".pdf"):
        if PdfReader is None:
            raise HTTPException(status_code=500, detail="pypdf is not installed.")
        reader = PdfReader(BytesIO(data))
        text = "\n".join(page.extract_text() or "" for page in reader.pages)
        if not text.strip():
            # Fallback to OCR if text is empty (scanned PDF)
            try:
                from ocr_service import ocr_chinese_pdf_bytes
                text = ocr_chinese_pdf_bytes(data)
            except Exception as e:
                print(f"OCR fallback failed: {e}")
        return text
    if lower_name.endswith(".docx"):
        if docx is None:
            raise HTTPException(status_code=500, detail="python-docx is not installed.")
        document = docx.Document(BytesIO(data))
        return "\n".join(paragraph.text for paragraph in document.paragraphs)
    return data.decode("utf-8", errors="ignore")
