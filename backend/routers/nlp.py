from __future__ import annotations

import re
from typing import Any
from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.orm import Session
from pypinyin import Style, lazy_pinyin

from db.config import db_session, current_request, rate_limiter, ai_rate_limit_per_minute, pinyin_display, pinyin_numbered
from schemas import NlpAnalyzeRequest, AIContextRequest, TextRequest, TranslateRequest
from services.nlp_service import (
    ai_status_payload,
    build_contextual_analysis,
    analyze_chinese,
    generate_google_ai_context,
    tokenize_chinese,
    local_translation_payload
)
from services.dictionary_service import contains_chinese

router = APIRouter(tags=["nlp"])


@router.get("/api/ai/status")
def ai_status() -> dict[str, Any]:
    return ai_status_payload()


@router.post("/api/ai/context-reading")
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


@router.post("/api/nlp/analyze")
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


@router.post("/api/nlp/segment")
def nlp_segment(payload: TextRequest, session: Session = Depends(db_session)) -> dict[str, list[str]]:
    return {"tokens": [token["surface"] for token in tokenize_chinese(payload.text, session)]}


@router.post("/api/nlp/pinyin")
def nlp_pinyin(payload: TextRequest) -> dict[str, str]:
    return {"text": payload.text, "pinyin": pinyin_display(payload.text)}


@router.post("/api/translate")
def translate(payload: TranslateRequest, session: Session = Depends(db_session)) -> dict[str, Any]:
    if not payload.text.strip():
        raise HTTPException(status_code=400, detail="Text parameter is required.")
    return local_translation_payload(payload.text, payload.sourceLang, payload.targetLang, session)


@router.post("/api/detect-language")
def detect_language(payload: TextRequest) -> dict[str, str]:
    return {"language": "zh" if contains_chinese(payload.text) else "en" if re.search(r"[A-Za-z]", payload.text) else "auto"}


@router.post("/api/pinyin")
def pinyin_endpoint(payload: TextRequest) -> dict[str, str]:
    return {
        "original": payload.text,
        "pinyin": pinyin_display(payload.text),
        "pinyinNumbered": pinyin_numbered(payload.text),
        "pinyinRaw": " ".join(lazy_pinyin(payload.text))
    }
