from fastapi import APIRouter, Depends, Body, Request
from sqlalchemy.orm import Session

from db.config import ai_rate_limit_per_minute, current_request, db_session, rate_limiter
from schemas import NlpAnalyzeRequest, AIContextRequest
from services.nlp_service import build_contextual_analysis
from services.ai.orchestrator import handle_context_reading
from services.ai.client import google_key_status
from services.ai.budget import get_ai_budget_summary
from services.ai.consent import ai_user_consent_to_dict, get_ai_user_consent, update_ai_user_consent

router = APIRouter(prefix="/api/ai", tags=["ai"])

@router.post("/context-reading")
def ai_context_reading(
    payload: AIContextRequest = Body(...),
    db: Session = Depends(db_session),
    request: Request | None = Depends(current_request),
):
    """
    Optional AI Layer: Cung cấp giải nghĩa ngữ cảnh chuyên sâu dựa trên JSON cấu trúc.
    """
    if isinstance(request, Request):
        rate_limiter.check(request, name="ai", limit=ai_rate_limit_per_minute())

    # 1. Chạy deterministic rule-based NLP trước
    nlp_req = NlpAnalyzeRequest(
        text=payload.text,
        selected_text=payload.selected_text,
        source_sentence=payload.source_sentence,
        paragraph_context=payload.paragraph_context,
        page_context=payload.page_context,
        mode="auto",
        domain_mode=payload.domain_mode,
        user_level=payload.user_level,
    )
    rule_based = build_contextual_analysis(nlp_req, db)

    # 2. Giao cho AI Orchestrator xử lý
    result = handle_context_reading(payload, rule_based, db)
    return {
        "rule_based": rule_based,
        "ai": result,
    }

@router.get("/status")
def ai_status():
    """
    Kiểm tra trạng thái kết nối Google Gemini API (Single Key / BYOK).
    """
    status = google_key_status()
    if not status["enabled"]:
        status["message"] = "Missing Google Gemini API key. Set GOOGLE_API_KEYS, GOOGLE_API_KEY, or backend/data/google_api_keys.txt."
    return status


@router.get("/consent")
def ai_consent(db: Session = Depends(db_session)) -> dict[str, object]:
    return {"consent": ai_user_consent_to_dict(get_ai_user_consent(db))}


@router.patch("/consent")
def patch_ai_consent(payload: dict[str, object], db: Session = Depends(db_session)) -> dict[str, object]:
    return {"consent": ai_user_consent_to_dict(update_ai_user_consent(db, payload))}


@router.get("/budget")
def ai_budget(db: Session = Depends(db_session)) -> dict[str, object]:
    return {"budget": get_ai_budget_summary(db)}
