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
import services.ai.orchestrator
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



def test_contextual_nlp_analyze(session) -> None:
    payload = NlpAnalyzeRequest(
        selected_text="系统",
        source_sentence="计算机系统需要处理大量数据。",
        paragraph_context="计算机系统需要处理大量数据。",
        page_context="计算机系统需要处理大量数据。",
        domain_mode="computer_science",
        user_level="HSK4",
    )

    result = nlp_analyze(payload, session)

    assert result["selection"]["domain_mode"] == "computer_science"
    assert result["translations"]["natural_vi"] == "hệ thống máy tính"
    assert result["quick_meaning"]["pinyin"] == "xì tǒng"



def test_google_ai_context_uses_rotating_keys_without_exposing_secret(session, monkeypatch) -> None:
    monkeypatch.setattr(services.ai.client, "load_google_api_keys", lambda: ["key-one", "key-two"])
    services.ai.client.google_key_pool._index = 0
    used_keys: list[str] = []

    def fake_post_google_generate_content(api_key: str, model: str, prompt: str, temperature: float) -> dict[str, Any]:
        used_keys.append(api_key)
        assert "市场需求下降" in prompt
        return {
            "candidates": [
                {
                    "content": {
                        "parts": [
                            {
                                "text": (
                                    '{"natural_vi":"nhu cầu thị trường giảm","literal_vi":"nhu cầu thị trường / giảm",'
                                    '"context_explanation_vi":"Selection là cụm chủ-vị trong vế nguyên nhân.",'
                                    '"grammar_notes":[],"nuance_vi":"kinh tế","domain":"economics",'
                                    '"review_suggestions":[],"personalization":{"level_adjustment_vi":"HSK4","show_pinyin":true},'
                                    '"confidence":0.91}'
                                )
                            }
                        ]
                    }
                }
            ],
            "usageMetadata": {"totalTokenCount": 12},
        }

    monkeypatch.setattr(services.ai.orchestrator, "post_google_generate_content", fake_post_google_generate_content)

    payload = AIContextRequest(
        selected_text="市场需求下降",
        source_sentence="由于市场需求下降，该公司调整了生产计划。",
        paragraph_context="由于市场需求下降，该公司调整了生产计划。",
        page_context="由于市场需求下降，该公司调整了生产计划。",
        domain_mode="economics",
        user_level="HSK4",
    )
    first = ai_context_reading(payload, session)
    second = ai_context_reading(payload, session)

    assert used_keys == ["key-one", "key-two"]
    assert first["ai"]["status"] == "ok"
    assert first["ai"]["response"]["natural_vi"] == "nhu cầu thị trường giảm"
    assert first["ai"]["key_fingerprint"] == services.ai.client.secret_fingerprint("key-one")
    assert "key-one" not in str(first)
    assert "key-two" not in str(second)

    status = ai_status()
    assert status["configured_keys"] == 2
    assert status["enabled"] is True

