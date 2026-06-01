from __future__ import annotations

import os
import re
import json
import uuid
import time
import hashlib
import threading
from collections import defaultdict, deque
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from fastapi import Request, HTTPException, UploadFile
from sqlalchemy import create_engine, text as sql_text
from sqlalchemy.orm import DeclarativeBase, sessionmaker, Session
from pypinyin import Style, lazy_pinyin

# Version and Path Settings
APP_VERSION = "0.1.0"
BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "hanora.sqlite3"
UPLOAD_DIR = DATA_DIR / "uploads"
BACKUP_DIR = DATA_DIR / "backups"
GOOGLE_KEY_FILE = DATA_DIR / "google_api_keys.txt"
LOCAL_ENV_FILES = [BASE_DIR / ".env", BASE_DIR.parent / ".env"]
DATABASE_URL = os.environ.get("DATABASE_URL", f"sqlite:///{DB_PATH}")

DATA_DIR.mkdir(parents=True, exist_ok=True)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
BACKUP_DIR.mkdir(parents=True, exist_ok=True)

# Engine & Session Makers
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def db_session() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Common Utility Helpers
def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def make_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def json_loads(value: str | None, fallback: Any) -> Any:
    if not value or not value.strip():
        return fallback
    try:
        return json.loads(value)
    except Exception:
        return fallback


def json_dumps(value: Any) -> str:
    try:
        return json.dumps(value, ensure_ascii=False)
    except Exception:
        return "[]" if isinstance(value, list) else "{}"


def parse_key_list(value: str | None) -> list[str]:
    if not value:
        return []
    cleaned = value.strip()
    if not cleaned:
        return []
    if (cleaned.startswith("[") and cleaned.endswith("]")) or (cleaned.startswith("{") and cleaned.endswith("}")):
        return json_loads(cleaned, [])
    return [item.strip() for item in cleaned.split(",") if item.strip()]


PUNCTUATION = {"。", "，", "、", "！", "？", "；", "：", ".", ",", "!", "?", ";", ":"}

# Pinyin Tone Formatters
def pinyin_display(text: str) -> str:
    return " ".join(lazy_pinyin(text, style=Style.TONE))


def pinyin_numbered(text: str) -> str:
    return " ".join(lazy_pinyin(text, style=Style.TONE3))


# Environment Parsers
def read_local_env_files() -> dict[str, str]:
    values: dict[str, str] = {}
    for env_file in LOCAL_ENV_FILES:
        if not env_file.exists():
            continue
        try:
            for raw_line in env_file.read_text(encoding="utf-8", errors="ignore").splitlines():
                line = raw_line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, value = line.split("=", 1)
                values[key.strip()] = value.strip().strip("\"'")
        except Exception:
            pass
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
    # Dynamic origins from 3000 to 3010
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


def current_request(request: Request) -> Request:
    return request


def ensure_runtime_schema() -> None:
    # Run dynamic schema migrations on SQLite file
    try:
        with engine.connect() as connection:
            document_columns = {row[1] for row in connection.execute(sql_text("PRAGMA table_info(documents)")).fetchall()}
            dictionary_columns = {row[1] for row in connection.execute(sql_text("PRAGMA table_info(dictionary_entries)")).fetchall()}
            vocabulary_columns = {row[1] for row in connection.execute(sql_text("PRAGMA table_info(vocabulary_items)")).fetchall()}
    except Exception:
        return

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


SEED_DICTIONARY: list[dict[str, Any]] = [
    {"simplified": "我", "pinyin": "wǒ", "vi": "tôi", "en": "I; me", "pos": "pronoun", "hsk_level": 1},
    {"simplified": "非常", "pinyin": "fēi cháng", "vi": "rất, vô cùng", "en": "very; extremely", "pos": "adverb", "hsk_level": 2},
    {"simplified": "喜欢", "pinyin": "xǐ huan", "vi": "thích, yêu thích", "en": "to like", "pos": "verb", "hsk_level": 1},
    {"simplified": "学习", "pinyin": "xué xí", "vi": "học tập", "en": "to study; to learn", "pos": "verb", "hsk_level": 1},
    {"simplified": "中文", "pinyin": "zhōng wén", "vi": "tiếng Trung", "en": "Chinese language", "pos": "noun", "hsk_level": 1},
    {"simplified": "虽然", "pinyin": "suī rán", "vi": "mặc dù", "en": "although", "pos": "conjunction", "hsk_level": 4},
    {"simplified": "但是", "pinyin": "dàn shì", "vi": "nhưng", "en": "but; however", "pos": "conjunction", "hsk_level": 2},
    {"simplified": "由于", "pinyin": "yóu yú", "vi": "do, bởi vì", "en": "due to; owing to", "pos": "preposition", "hsk_level": 5, "domain_tags": ["academic", "business"]},
    {"simplified": "because", "pinyin": "yīn wèi", "vi": "bởi vì", "en": "because", "pos": "conjunction", "hsk_level": 2},
    {"simplified": "因为", "pinyin": "yīn wèi", "vi": "bởi vì", "en": "because", "pos": "conjunction", "hsk_level": 2},
    {"simplified": "so", "pinyin": "suǒ yǐ", "vi": "cho nên, vì vậy", "en": "so; therefore", "pos": "conjunction", "hsk_level": 2},
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
