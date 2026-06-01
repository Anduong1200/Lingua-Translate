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



def test_annotation_review_flow(session) -> None:
    document = create_document(
        DocumentCreateRequest(title="Demo", file_name="demo.pdf", source_type="pdf", language="zh-CN"),
        session,
    )

    annotation = create_annotation(
        AnnotationCreateRequest(
            document_id=document["document_id"],
            page_id="page-1",
            page_number=3,
            selected_text="市场需求",
            source_sentence="由于市场需求下降，该公司调整了生产计划。",
            explanation_vi="nhu cầu thị trường",
            selected_meaning_vi="nhu cầu thị trường",
            pinyin="shì chǎng xū qiú",
            hsk_level=6,
            domain_tag="economics",
            bbox_json='{"left":10,"top":20,"width":120,"height":24}',
        ),
        session,
    )

    review = create_review_item(ReviewItemCreateRequest(annotation_id=annotation["annotation_id"], item_type="flashcard"), session)
    due = due_review_items(session)
    reviewed = create_review_event(ReviewEventCreateRequest(review_item_id=review["review_item_id"], rating="good", response_time_ms=1200), session)

    assert review["review_item_id"]
    assert any(item["id"] == review["review_item_id"] for item in due["items"])
    assert reviewed["status"] == "updated"
    assert reviewed["interval_days"] >= 3



