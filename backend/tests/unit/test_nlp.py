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
from db.config import make_id, now_utc
from models.ai_history import AiRequestRecord
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
    ContextTranslateRequest,
    QuizGenerateRequest,
    TranslateRequest,
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
    nlp_translate_context,
    nlp_quiz,
    translate,
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
    assert "hệ thống" in result["translations"]["natural_vi"]
    assert result["quick_meaning"]["pinyin"] == "xì tǒng"


def test_context_translate_returns_sentence_paragraph_and_context(session) -> None:
    text = "无论你是经济领域的专家，还是计算机科学的学生，都可以找到适合你的学习材料。"
    payload = ContextTranslateRequest(
        selected_text=text,
        source_sentence=text,
        paragraph_context=text,
        page_context=text,
        domain_mode="auto",
        user_level="HSK4",
        scope="context",
    )

    result = nlp_translate_context(payload, session)

    assert "bất kể" in result["sentence"]["natural_vi"]
    assert result["paragraph"]["sentences"][0]["source"] == text
    assert result["context"]["role_vi"] == "Đơn vị được chọn trong câu"
    assert result["grammar"]["patterns"][0]["pattern"] == "无论...还是...都..."


def test_translate_endpoint_prefers_natural_sentence_translation(session) -> None:
    text = "无论你是经济领域的专家，还是计算机科学的学生，都可以找到适合你的学习材料。"

    result = translate(TranslateRequest(text=text, sourceLang="zh", targetLang="vi"), session)

    assert "bất kể" in result["translatedText"]
    assert " / " in result["translatedText"]
    assert result["grammarExplanation"].startswith("dù là")


def test_nlp_quiz_uses_backend_dictionary_questions(session) -> None:
    text = "计算机系统需要处理大量数据。"
    payload = QuizGenerateRequest(
        text=text,
        page_context=text,
        domain_mode="computer_science",
        user_level="HSK4",
        limit=4,
    )

    result = nlp_quiz(payload, session)

    assert result["mode"] == "backend_nlp_quiz"
    assert result["questions"]
    assert any(question["type"] in {"meaning", "pinyin", "grammar", "translation"} for question in result["questions"])
    assert all(len(question["options"]) == 4 for question in result["questions"])



def test_google_ai_context_uses_rotating_keys_without_exposing_secret(session, monkeypatch) -> None:
    monkeypatch.setattr(services.ai.client, "load_google_api_keys", lambda: ["key-one", "key-two"])
    services.ai.client.google_key_pool._index = 0
    consent = get_ai_user_consent(session)
    consent.allow_send_selected_text = True
    session.commit()
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


def test_google_ai_context_respects_selected_text_consent(session, monkeypatch) -> None:
    monkeypatch.setattr(services.ai.client, "load_google_api_keys", lambda: ["key-one"])
    called = False

    def fake_post_google_generate_content(api_key: str, model: str, prompt: str, temperature: float) -> dict[str, Any]:
        nonlocal called
        called = True
        return {}

    monkeypatch.setattr(services.ai.orchestrator, "post_google_generate_content", fake_post_google_generate_content)

    consent = get_ai_user_consent(session)
    consent.allow_send_selected_text = False
    session.commit()

    payload = AIContextRequest(
        selected_text="市场需求",
        source_sentence="由于市场需求下降，该公司调整了生产计划。",
        paragraph_context="PRIVATE_PARAGRAPH",
        page_context="PRIVATE_PAGE",
        domain_mode="economics",
        user_level="HSK4",
    )
    result = ai_context_reading(payload, session)

    assert result["ai"]["status"] == "disabled_by_consent"
    assert result["ai"]["enabled"] is False
    assert called is False


def test_google_ai_context_sanitizes_page_context_without_consent(session, monkeypatch) -> None:
    monkeypatch.setattr(services.ai.client, "load_google_api_keys", lambda: ["key-one"])
    prompts: list[str] = []

    def fake_post_google_generate_content(api_key: str, model: str, prompt: str, temperature: float) -> dict[str, Any]:
        prompts.append(prompt)
        return {
            "candidates": [
                {
                    "content": {
                        "parts": [
                            {
                                "text": (
                                    '{"natural_vi":"nhu cầu thị trường","literal_vi":"thị trường / nhu cầu",'
                                    '"context_explanation_vi":"Selection là cụm danh từ.",'
                                    '"grammar_notes":[],"nuance_vi":"kinh tế","domain":"economics",'
                                    '"review_suggestions":[],"confidence":0.86}'
                                )
                            }
                        ]
                    }
                }
            ],
            "usageMetadata": {"totalTokenCount": 10},
        }

    monkeypatch.setattr(services.ai.orchestrator, "post_google_generate_content", fake_post_google_generate_content)

    consent = get_ai_user_consent(session)
    consent.allow_send_selected_text = True
    consent.allow_send_page_context = False
    session.commit()

    payload = AIContextRequest(
        selected_text="市场需求",
        source_sentence="由于市场需求下降，该公司调整了生产计划。",
        paragraph_context="PRIVATE_PARAGRAPH_CONTEXT",
        page_context="PRIVATE_PAGE_CONTEXT",
        domain_mode="economics",
        user_level="HSK4",
    )
    result = ai_context_reading(payload, session)

    assert result["ai"]["status"] == "ok"
    assert prompts
    assert "PRIVATE_PARAGRAPH_CONTEXT" not in prompts[0]
    assert "PRIVATE_PAGE_CONTEXT" not in prompts[0]
    assert "由于市场需求下降" not in prompts[0]
    assert "市场需求" in prompts[0]


def test_google_ai_context_respects_daily_budget(session, monkeypatch) -> None:
    monkeypatch.setenv("AI_DAILY_REQUEST_LIMIT", "1")
    monkeypatch.setattr(services.ai.client, "load_google_api_keys", lambda: ["key-one"])
    called = False

    def fake_post_google_generate_content(api_key: str, model: str, prompt: str, temperature: float) -> dict[str, Any]:
        nonlocal called
        called = True
        return {}

    monkeypatch.setattr(services.ai.orchestrator, "post_google_generate_content", fake_post_google_generate_content)

    consent = get_ai_user_consent(session)
    consent.allow_send_selected_text = True
    session.add(
        AiRequestRecord(
            id=make_id("ai_req"),
            task_type="context_reading",
            model="gemini-2.5-flash",
            status="ok",
            latency_ms=12,
            input_token_estimate=10,
            output_token_estimate=4,
            created_at=now_utc().isoformat(),
        )
    )
    session.commit()

    payload = AIContextRequest(
        selected_text="市场需求",
        source_sentence="由于市场需求下降，该公司调整了生产计划。",
        domain_mode="economics",
        user_level="HSK4",
    )
    result = ai_context_reading(payload, session)

    assert result["ai"]["status"] == "daily_request_budget_exceeded"
    assert result["ai"]["enabled"] is False
    assert result["ai"]["budget"]["daily_request_count"] == 1
    assert called is False

