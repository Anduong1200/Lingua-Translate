from __future__ import annotations

import sqlite3
import hashlib
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import select, func, text as sql_text, delete
from sqlalchemy.orm import Session

from db.config import (
    db_session,
    SessionLocal,
    engine,
    make_id,
    now_utc,
    json_dumps,
    APP_VERSION,
    DB_PATH,
    BACKUP_DIR,
    UPLOAD_DIR,
    DATA_DIR,
    SEED_DICTIONARY,
    app_env,
    configured_cors_origins,
    max_upload_bytes,
    allowed_upload_extensions,
    upload_rate_limit_per_minute,
    ai_rate_limit_per_minute,
    runtime_config_warnings,
    path_is_under,
    pinyin_display,
    ensure_runtime_schema
)
from models import (
    DictionaryEntryRecord,
    DocumentRecord,
    PageRecord,
    AnnotationRecord,
    ReviewItemRecord,
    ReviewEventRecord,
    KnownWordRecord,
    VocabularyItemRecord,
    UserCorrectionRecord
)
from schemas import BackupRestoreRequest
from services.nlp_service import configure_jieba
from services.ai.client import google_key_status
from services.user_profile_service import get_profile

router = APIRouter(tags=["admin"])

def check_ai_status() -> dict[str, Any]:
    status = google_key_status()
    return {
        **status,
        "status": "ok" if status["enabled"] else "missing_api_key",
    }

@router.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "version": APP_VERSION}


@router.get("/api/health/deep")
def health_deep(session: Session = Depends(db_session)) -> dict[str, Any]:
    checks: dict[str, Any] = {
        "database": {"ok": False, "path": str(DB_PATH), "size_bytes": DB_PATH.stat().st_size if DB_PATH.exists() else 0},
        "uploads": {"ok": UPLOAD_DIR.exists(), "path": str(UPLOAD_DIR)},
        "backups": {"ok": BACKUP_DIR.exists(), "path": str(BACKUP_DIR)},
        "dictionary": {"ok": False, "entries": 0, "cc_cedict_entries": 0, "hsk_vocab_entries": 0},
        "ai": check_ai_status(),
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


@router.get("/api/system/info")
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


@router.get("/api/system/config")
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
        "ai": check_ai_status(),
        "warnings": runtime_config_warnings(),
    }


def create_database_backup() -> dict[str, Any]:
    if not DB_PATH.exists():
        raise HTTPException(status_code=404, detail="SQLite database does not exist yet.")
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = now_utc().strftime("%Y%m%dT%H%M%SZ")
    target = (BACKUP_DIR / f"hanora_{timestamp}.sqlite3").resolve()
    if not path_is_under(target, BACKUP_DIR):
        raise HTTPException(status_code=400, detail="Invalid backup path.")

    try:
        source = sqlite3.connect(str(DB_PATH))
        destination = sqlite3.connect(str(target))
        try:
            source.backup(destination)
        finally:
            destination.close()
            source.close()
    except Exception:
        import shutil
        shutil.copyfile(str(DB_PATH), str(target))

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
    try:
        source = sqlite3.connect(str(source_path))
        destination = sqlite3.connect(str(DB_PATH))
        try:
            source.backup(destination)
        finally:
            destination.close()
            source.close()
    except Exception:
        import shutil
        shutil.copyfile(str(source_path), str(DB_PATH))
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


@router.post("/api/admin/backup")
def admin_backup_database() -> dict[str, Any]:
    return create_database_backup()


@router.post("/api/admin/restore")
def admin_restore_database(payload: BackupRestoreRequest) -> dict[str, Any]:
    return restore_database_backup(payload.file_name)


@router.get("/api/admin/backups")
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


@router.get("/api/admin/export")
def admin_export_data(
    include_dictionary: bool = False,
    dictionary_limit: int = Query(5000, ge=0, le=200000),
    session: Session = Depends(db_session),
) -> dict[str, Any]:
    from routers.documents import list_documents
    from routers.annotations import list_annotations
    from routers.review import legacy_review_items
    from routers.user import list_known_words, list_vocabulary_items, list_user_corrections, profile_to_dict
    from services.dictionary_service import to_dictionary_result

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
        "review_items": legacy_review_items(session=session),
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


@router.get("/api/debug/db-stats")
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


@router.post("/api/debug/reset-demo")
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
