from pathlib import Path
import sys
from typing import Any

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import main as backend_main  # noqa: E402
from main import (  # noqa: E402
    AIContextRequest,
    AnnotationCreateRequest,
    AutoReviewCreateRequest,
    DocumentCreateRequest,
    ReviewEventCreateRequest,
    ReviewItemCreateRequest,
    SessionLocal,
    UserCorrectionCreateRequest,
    admin_backup_database,
    admin_export_data,
    ai_context_reading,
    ai_status,
    create_annotation,
    create_document,
    create_review_event,
    create_review_item,
    create_user_correction,
    debug_reset_demo,
    dictionary_search,
    due_review_items,
    health_deep,
    get_document_file,
    health,
    list_known_words,
    list_documents,
    nlp_analyze,
    NlpAnalyzeRequest,
    scan_document_vocabulary,
    translate_document,
    upload_document,
    system_config,
    create_document_auto_review_items,
    restore_database_backup,
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


def test_dictionary_search(session) -> None:
    result = dictionary_search(q="市场需求", session=session)

    assert any(item["simplified"] == "市场需求" for item in result["results"])


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

    assert analyzed["translations"]["natural_vi"] == "nhu cầu thị trường giảm"
    assert "giảm" in analyzed["translations"]["literal_vi"]


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
    response = backend_main.create_known_word(backend_main.KnownWordCreateRequest(word="市场需求", confidence=0.9), session)
    listed = list_known_words(session)

    assert response["status"] == "saved"
    assert listed["words"][0]["word"] == "市场需求"
    assert listed["words"][0]["confidence"] == 0.9


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
    assert translated["translations"][0]["natural_vi"] == "Do nhu cầu thị trường giảm, công ty đó đã điều chỉnh kế hoạch sản xuất."
    assert any(item["surface"] == "市场需求" for item in scanned["items"])
    assert auto_reviews["created"] > 0
    assert any(item["front"] == "市场需求" for item in due["items"])


def test_document_upload_rejects_unsupported_file_type(session) -> None:
    with pytest.raises(backend_main.HTTPException) as exc:
        resolve_immediate_coroutine(upload_document(file=UnsupportedUploadFile(), language="zh-CN", session=session))

    assert exc.value.status_code == 415


def test_document_upload_enforces_size_limit(session, monkeypatch) -> None:
    monkeypatch.setenv("MAX_UPLOAD_BYTES", "1048576")
    with pytest.raises(backend_main.HTTPException) as exc:
        resolve_immediate_coroutine(upload_document(file=LargeUploadFile(), language="zh-CN", session=session))

    assert exc.value.status_code == 413


def test_admin_backup_and_export_are_sanitized(session, monkeypatch, tmp_path) -> None:
    monkeypatch.setattr(backend_main, "BACKUP_DIR", tmp_path)
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
    monkeypatch.setattr(backend_main, "BACKUP_DIR", tmp_path)
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
    monkeypatch.setattr(backend_main, "rate_limiter", backend_main.InMemoryRateLimiter())
    request = make_request("rate-limit-upload")

    resolve_immediate_coroutine(upload_document(file=DummyUploadFile(), language="zh-CN", session=session, request=request))
    with pytest.raises(backend_main.HTTPException) as exc:
        resolve_immediate_coroutine(upload_document(file=DummyUploadFile(), language="zh-CN", session=session, request=request))

    assert exc.value.status_code == 429


def test_ai_rate_limit_returns_429(session, monkeypatch) -> None:
    monkeypatch.setenv("AI_RATE_LIMIT_PER_MINUTE", "1")
    monkeypatch.setattr(backend_main, "load_google_api_keys", lambda: [])
    monkeypatch.setattr(backend_main, "rate_limiter", backend_main.InMemoryRateLimiter())
    request = make_request("rate-limit-ai")
    payload = AIContextRequest(selected_text="市场需求")

    first = ai_context_reading(payload, session, request)
    with pytest.raises(backend_main.HTTPException) as exc:
        ai_context_reading(payload, session, request)

    assert first["ai"]["status"] == "missing_api_key"
    assert exc.value.status_code == 429


def test_google_ai_context_uses_rotating_keys_without_exposing_secret(session, monkeypatch) -> None:
    monkeypatch.setattr(backend_main, "load_google_api_keys", lambda: ["key-one", "key-two"])
    backend_main.google_key_pool._index = 0
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

    monkeypatch.setattr(backend_main, "post_google_generate_content", fake_post_google_generate_content)

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
    assert first["ai"]["key_fingerprint"] == backend_main.secret_fingerprint("key-one")
    assert "key-one" not in str(first)
    assert "key-two" not in str(second)

    status = ai_status()
    assert status["configured_keys"] == 2
    assert status["enabled"] is True
