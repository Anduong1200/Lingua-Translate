from pathlib import Path
import sys
from typing import Any

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import main as backend_main  # noqa: E402
from fastapi import HTTPException
from db.config import SessionLocal
import db.config
import services.nlp_service
import routers.admin
import routers.documents
import routers.ai
import routers.nlp
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



def test_user_correction_takes_priority_in_analyze_and_search(session) -> None:
    create_user_correction(
        UserCorrectionCreateRequest(
            original_term="系统",
            system_translation="hệ thống",
            user_translation="hệ thống nghiệp vụ",
            context="业务系统需要处理大量数据。",
            domain="computer_science",
        ),
        session,
    )

    analyzed = nlp_analyze(
        NlpAnalyzeRequest(
            selected_text="系统",
            source_sentence="业务系统需要处理大量数据。",
            paragraph_context="业务系统需要处理大量数据。",
            page_context="业务系统需要处理大量数据。",
            domain_mode="computer_science",
            user_level="HSK4",
        ),
        session,
    )
    assert analyzed["quick_meaning"]["definitions_vi"][0] == "hệ thống nghiệp vụ"
    assert analyzed["translations"]["natural_vi"] == "hệ thống nghiệp vụ"

    search = dictionary_search(q="系统", session=session)
    assert search["results"][0]["source"] == "user_corrections"
    assert search["results"][0]["definitions_vi"] == ["hệ thống nghiệp vụ"]



def test_known_words_can_be_marked_and_listed(session) -> None:
    response = create_known_word(KnownWordCreateRequest(word="市场需求", confidence=0.9), session)
    listed = list_known_words(session)

    assert response["status"] == "saved"
    assert listed["words"][0]["word"] == "市场需求"
    assert listed["words"][0]["confidence"] == 0.9



def test_vocabulary_lookup_history_can_be_favorited_and_deleted(session) -> None:
    saved = record_vocabulary_lookup(
        VocabularyUpsertRequest(
            word="市场需求",
            translation="nhu cầu thị trường",
            pinyin="shì chǎng xū qiú",
            context="由于市场需求下降，该公司调整了生产计划。",
            source_file="demo.pdf",
            source_document_id="doc_demo",
            hsk_level=6,
            domain_tags=["economics"],
        ),
        session,
    )
    record_vocabulary_lookup(
        VocabularyUpsertRequest(word="市场需求", translation="nhu cầu thị trường", domain_tags=["economics"]),
        session,
    )

    listed = list_vocabulary_items(session)
    item_id = saved["item"]["id"]
    updated = update_vocabulary_item(item_id, VocabularyPatchRequest(favorite=True, learned=True, topic="Kinh tế"), session)
    deleted = delete_vocabulary_item(item_id, session)

    assert listed["items"][0]["lookup_count"] == 2
    assert listed["items"][0]["topic"] == "Kinh tế"
    assert updated["item"]["favorite"] is True
    assert updated["item"]["learned"] is True
    assert deleted["deleted"] is True



