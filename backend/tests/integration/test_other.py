from pathlib import Path
import sys
from typing import Any

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import main as backend_main  # noqa: E402
from fastapi import HTTPException
from db.config import SessionLocal
import db.config
import services.ai.client
import services.nlp_service
import routers.admin
import routers.documents
import routers.ai
import routers.nlp
from services.ai.consent import get_ai_user_consent
from schemas import (
    AIContextRequest,
    AnnotationCreateRequest,
    AutoReviewCreateRequest,
    DocumentCreateRequest,
    ReviewEventCreateRequest,
    ReviewItemCreateRequest,
    UserCorrectionCreateRequest,
    NlpAnalyzeRequest,
    VocabularyPatchRequest,
    VocabularyUpsertRequest,
    KnownWordCreateRequest,
)
from routers.admin import (
    health,
    health_deep,
    system_config,
    admin_backup_database,
    restore_database_backup,
    admin_export_data,
    debug_reset_demo,
)
from routers.ai import (
    ai_status,
    ai_context_reading,
)
from routers.nlp import (
    nlp_analyze,
)
from routers.documents import (
    create_document,
    delete_document,
    get_document_file,
    list_documents,
    scan_document_vocabulary,
    translate_document,
    upload_document,
    create_document_auto_review_items,
    refresh_document_ocr,
)
from routers.dictionary import dictionary_search
from routers.annotations import create_annotation
from routers.review import (
    create_review_item,
    create_review_event,
    due_review_items,
)
from routers.user import (
    create_user_correction,
    list_known_words,
    record_vocabulary_lookup,
    list_vocabulary_items,
    update_vocabulary_item,
    delete_vocabulary_item,
    create_known_word,
)
from starlette.requests import Request


@pytest.fixture()
def session():
    db = SessionLocal()
    debug_reset_demo(db)
    try:
        yield db
    finally:
        db.close()


def resolve_immediate_coroutine(coro: Any) -> Any:
    try:
        coro.send(None)
    except StopIteration as exc:
        return exc.value
    raise AssertionError("Coroutine unexpectedly suspended.")


def make_request(host: str = "testclient") -> Request:
    return Request({"type": "http", "method": "POST", "path": "/", "headers": [], "client": (host, 12345)})


class DummyUploadFile:
    filename = "sample.txt"
    content_type = "text/plain"

    def __init__(self) -> None:
        self.sent = False

    async def read(self, size: int | None = None) -> bytes:
        if self.sent:
            return b""
        self.sent = True
        return "市场需求下降".encode("utf-8")


class UnsupportedUploadFile:
    filename = "../sample.exe"
    content_type = "application/octet-stream"

    def __init__(self) -> None:
        self.sent = False

    async def read(self, size: int | None = None) -> bytes:
        if self.sent:
            return b""
        self.sent = True
        return b"not allowed"


class LargeUploadFile:
    filename = "large.txt"
    content_type = "text/plain"

    def __init__(self) -> None:
        self.sent = False

    async def read(self, size: int | None = None) -> bytes:
        if self.sent:
            return b""
        self.sent = True
        return b"x" * (1024 * 1024 + 1)



def test_health() -> None:
    assert health()["status"] == "ok"



def test_deep_health_and_system_config_are_sanitized(session) -> None:
    deep = health_deep(session)
    config = system_config()

    assert deep["status"] == "ok"
    assert deep["checks"]["database"]["ok"] is True
    assert "http://127.0.0.1:3000" in config["frontend_origins"]
    assert "allowed_extensions" in config["upload"]
    assert ("AI" + "za") not in str(config)



def test_hsk_import_does_not_hide_seed_vietnamese_meaning(session) -> None:
    analyzed = nlp_analyze(
        NlpAnalyzeRequest(
            selected_text="市场需求下降",
            source_sentence="由于市场需求下降，该公司调整了生产计划。",
            paragraph_context="由于市场需求下降，该公司调整了生产计划。",
            page_context="由于市场需求下降，该公司调整了生产计划。",
            domain_mode="economics",
            user_level="HSK4",
        ),
        session,
    )

    assert "nhu cầu thị trường" in analyzed["translations"]["natural_vi"]
    assert "giảm" in analyzed["translations"]["literal_vi"]



def test_document_upload_persists_file_and_metadata(session) -> None:
    payload = resolve_immediate_coroutine(upload_document(file=DummyUploadFile(), language="zh-CN", session=session))

    assert payload["document_id"]
    assert payload["file_url"] == f"/api/documents/{payload['document_id']}/file"
    assert payload["sha256"]

    documents = list_documents(session)["documents"]
    saved = next(item for item in documents if item["id"] == payload["document_id"])
    assert saved["file_url"] == payload["file_url"]
    assert saved["sha256"] == payload["sha256"]

    file_response = get_document_file(payload["document_id"], session)
    stored_path = Path(str(file_response.path))
    assert stored_path.exists()
    assert stored_path.read_bytes() == "市场需求下降".encode("utf-8")


def test_document_ocr_refresh_updates_content_and_pages(session, monkeypatch) -> None:
    payload = resolve_immediate_coroutine(upload_document(file=DummyUploadFile(), language="zh-CN", session=session))
    monkeypatch.setattr(routers.documents, "extract_file_text", lambda _name, _data: "第一页 市场需求\f第二页 计算机系统")

    refreshed = refresh_document_ocr(payload["document_id"], session)
    saved = next(item for item in list_documents(session)["documents"] if item["id"] == payload["document_id"])

    assert refreshed["status"] == "ocr_ready"
    assert refreshed["page_count"] == 2
    assert saved["content"] == "第一页 市场需求\f第二页 计算机系统"



def test_document_translation_and_vocabulary_automation(session) -> None:
    document = create_document(
        DocumentCreateRequest(
            title="Economics Demo",
            file_name="demo.txt",
            source_type="txt",
            language="zh-CN",
            content="由于市场需求下降，该公司调整了生产计划。",
        ),
        session,
    )

    translated = translate_document(document["document_id"], session)
    scanned = scan_document_vocabulary(document["document_id"], limit=10, session=session)
    auto_reviews = create_document_auto_review_items(
        document["document_id"],
        AutoReviewCreateRequest(limit=10, min_frequency=1),
        session,
    )
    due = due_review_items(session)

    assert translated["mode"] == "local_rule_based"
    assert "nhu cầu thị trường" in translated["translations"][0]["natural_vi"]
    assert any(item["surface"] == "市场需求" for item in scanned["items"])
    assert auto_reviews["created"] > 0
    assert any(item["front"] == "市场需求" for item in due["items"])



def test_delete_document_cleans_dependent_learning_data(session) -> None:
    document = create_document(
        DocumentCreateRequest(
            title="Delete Demo",
            file_name="delete.txt",
            source_type="txt",
            language="zh-CN",
            content="由于市场需求下降，该公司调整了生产计划。",
        ),
        session,
    )
    annotation = create_annotation(
        AnnotationCreateRequest(
            document_id=document["document_id"],
            page_id="page-1",
            selected_text="市场需求",
            source_sentence="由于市场需求下降，该公司调整了生产计划。",
            selected_meaning_vi="nhu cầu thị trường",
            pinyin="shì chǎng xū qiú",
        ),
        session,
    )
    review = create_review_item(ReviewItemCreateRequest(annotation_id=annotation["annotation_id"]), session)
    create_review_event(ReviewEventCreateRequest(review_item_id=review["review_item_id"], rating="good"), session)
    record_vocabulary_lookup(
        VocabularyUpsertRequest(
            word="市场需求",
            translation="nhu cầu thị trường",
            source_document_id=document["document_id"],
        ),
        session,
    )

    deleted = delete_document(document["document_id"], session)

    assert deleted["status"] == "deleted"
    assert deleted["deleted_annotations"] == 1
    assert deleted["deleted_review_items"] == 1
    assert deleted["deleted_review_events"] == 1
    assert deleted["deleted_vocabulary_items"] == 1
    assert all(item["id"] != document["document_id"] for item in list_documents(session)["documents"])



def test_document_upload_rejects_unsupported_file_type(session) -> None:
    with pytest.raises(HTTPException) as exc:
        resolve_immediate_coroutine(upload_document(file=UnsupportedUploadFile(), language="zh-CN", session=session))

    assert exc.value.status_code == 415



def test_document_upload_enforces_size_limit(session, monkeypatch) -> None:
    monkeypatch.setenv("MAX_UPLOAD_BYTES", "1048576")
    with pytest.raises(HTTPException) as exc:
        resolve_immediate_coroutine(upload_document(file=LargeUploadFile(), language="zh-CN", session=session))

    assert exc.value.status_code == 413



def test_admin_backup_and_export_are_sanitized(session, monkeypatch, tmp_path) -> None:
    monkeypatch.setattr(db.config, "BACKUP_DIR", tmp_path)
    monkeypatch.setattr(routers.admin, "BACKUP_DIR", tmp_path)
    document = create_document(DocumentCreateRequest(title="Demo", file_name="demo.pdf", source_type="pdf", language="zh-CN"), session)
    create_annotation(
        AnnotationCreateRequest(
            document_id=document["document_id"],
            selected_text="市场需求",
            selected_meaning_vi="nhu cầu thị trường",
        ),
        session,
    )

    backup = admin_backup_database()
    exported = admin_export_data(session=session)
    assert backup["status"] == "created"
    assert Path(backup["path"]).exists()
    assert Path(backup["path"]).is_relative_to(tmp_path)
    assert exported["documents"][0]["id"] == document["document_id"]
    assert exported["annotations"][0]["selected_text"] == "市场需求"
    assert ("AI" + "za") not in str(exported)



def test_admin_restore_replaces_database_from_safe_backup(session, monkeypatch, tmp_path) -> None:
    monkeypatch.setattr(db.config, "BACKUP_DIR", tmp_path)
    monkeypatch.setattr(routers.admin, "BACKUP_DIR", tmp_path)
    document = create_document(DocumentCreateRequest(title="Restore Demo", file_name="restore.pdf", source_type="pdf"), session)
    backup = admin_backup_database()
    debug_reset_demo(session)
    session.close()

    restored = restore_database_backup(backup["file_name"])

    with SessionLocal() as restored_session:
        documents = list_documents(restored_session)["documents"]
    assert restored["status"] == "restored"
    assert any(item["id"] == document["document_id"] for item in documents)



def test_upload_rate_limit_returns_429(session, monkeypatch) -> None:
    monkeypatch.setenv("UPLOAD_RATE_LIMIT_PER_MINUTE", "1")
    new_limiter = db.config.InMemoryRateLimiter()
    monkeypatch.setattr(db.config, "rate_limiter", new_limiter)
    monkeypatch.setattr(routers.documents, "rate_limiter", new_limiter)
    request = make_request("rate-limit-upload")

    resolve_immediate_coroutine(upload_document(file=DummyUploadFile(), language="zh-CN", session=session, request=request))
    with pytest.raises(HTTPException) as exc:
        resolve_immediate_coroutine(upload_document(file=DummyUploadFile(), language="zh-CN", session=session, request=request))

    assert exc.value.status_code == 429



def test_ai_rate_limit_returns_429(session, monkeypatch) -> None:
    monkeypatch.setenv("AI_RATE_LIMIT_PER_MINUTE", "1")
    monkeypatch.setattr(services.ai.client, "load_google_api_keys", lambda: [])
    consent = get_ai_user_consent(session)
    consent.allow_send_selected_text = True
    session.commit()
    new_limiter = db.config.InMemoryRateLimiter()
    monkeypatch.setattr(db.config, "rate_limiter", new_limiter)
    monkeypatch.setattr(routers.ai, "rate_limiter", new_limiter)
    request = make_request("rate-limit-ai")
    payload = AIContextRequest(selected_text="市场需求")

    first = ai_context_reading(payload, session, request)
    with pytest.raises(HTTPException) as exc:
        ai_context_reading(payload, session, request)

    assert first["ai"]["status"] == "missing_api_key"
    assert exc.value.status_code == 429



