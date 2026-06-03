from __future__ import annotations

import re
from typing import Any
from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.orm import Session
from pypinyin import Style, lazy_pinyin

from db.config import db_session, current_request, rate_limiter, ai_rate_limit_per_minute, pinyin_display, pinyin_numbered
from schemas import NlpAnalyzeRequest, AIContextRequest, TextRequest, TranslateRequest, ContextTranslateRequest, QuizGenerateRequest
from services.nlp_service import (
    build_contextual_analysis,
    analyze_chinese,
    tokenize_chinese,
    local_translation_payload,
    translate_context_payload,
    generate_quiz_payload,
)
from services.ai.orchestrator import handle_context_reading
from services.dictionary_service import contains_chinese

router = APIRouter(tags=["nlp"])





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
        analysis["ai_context"] = handle_context_reading(payload, analysis, session)
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


@router.post("/api/nlp/translate-context")
def nlp_translate_context(payload: ContextTranslateRequest, session: Session = Depends(db_session)) -> dict[str, Any]:
    text = (payload.selected_text or payload.source_sentence or payload.paragraph_context or payload.page_context or payload.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text parameter is required.")
    result = translate_context_payload(payload, session)
    result["scope"] = payload.scope
    return result


@router.post("/api/nlp/quiz")
def nlp_quiz(payload: QuizGenerateRequest, session: Session = Depends(db_session)) -> dict[str, Any]:
    text = (payload.page_context or payload.paragraph_context or payload.source_sentence or payload.text or payload.selected_text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text parameter is required.")
    return generate_quiz_payload(payload, session, payload.limit)


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
