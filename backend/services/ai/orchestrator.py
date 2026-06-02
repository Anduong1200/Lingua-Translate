import time
from typing import Any
from sqlalchemy.orm import Session
from db.config import make_id
from models.ai_history import AiRequestRecord
from schemas import NlpAnalyzeRequest, AIContextRequest
from services.ai.client import get_google_api_key, post_google_generate_content, secret_fingerprint, validate_model
from services.ai.budget import check_ai_budget
from services.ai.consent import get_ai_user_consent, sanitize_rule_based_for_ai
from services.ai.prompts import build_context_reading_prompt
from services.ai.response_schema import extract_gemini_text, parse_ai_json

def handle_context_reading(payload: AIContextRequest | NlpAnalyzeRequest, rule_based: dict[str, Any], session: Session) -> dict[str, Any]:
    start_time = time.time()
    task_type = "context_reading"
    
    model = payload.model if isinstance(payload, AIContextRequest) and getattr(payload, "model", None) else "gemini-2.5-flash"
    temperature = payload.temperature if isinstance(payload, AIContextRequest) and getattr(payload, "temperature", None) else 0.2

    selected_text = (getattr(payload, "selected_text", None) or payload.text or "").strip()
    consent = get_ai_user_consent(session)
    if selected_text and not consent.allow_send_selected_text:
        return {
            "enabled": False,
            "provider": "google_gemini",
            "status": "disabled_by_consent",
            "message": "AI context is disabled because selected text sharing is not allowed.",
            "consent": {
                "allow_send_selected_text": bool(consent.allow_send_selected_text),
                "allow_send_page_context": bool(consent.allow_send_page_context),
                "allow_send_notes": bool(consent.allow_send_notes),
            },
        }

    source_sentence = getattr(payload, "source_sentence", "") or ""
    paragraph_context = getattr(payload, "paragraph_context", "") or ""
    if not consent.allow_send_page_context:
        source_sentence = selected_text
        paragraph_context = ""
        rule_based = sanitize_rule_based_for_ai(rule_based, selected_text, allow_page_context=False)
    domain = getattr(payload, "domain_mode", "general")
    user_level = getattr(payload, "user_level", "HSK4")
    
    prompt = build_context_reading_prompt(
        selected_text=selected_text,
        source_sentence=source_sentence,
        paragraph_context=paragraph_context,
        domain=domain,
        user_level=user_level,
        local_evidence=rule_based
    )

    request_id = make_id("ai_req")
    model_name = validate_model(model)
    budget_result = check_ai_budget(prompt, session)
    if not budget_result["allowed"]:
        req_record = AiRequestRecord(
            id=request_id,
            task_type=task_type,
            model=model_name,
            status=budget_result["status"],
            latency_ms=int((time.time() - start_time) * 1000),
            input_token_estimate=budget_result["estimated_prompt_tokens"],
        )
        session.add(req_record)
        session.commit()
        return {
            "enabled": False,
            "provider": "google_gemini",
            "model": model_name,
            "status": budget_result["status"],
            "message": budget_result["message"],
            "budget": budget_result["budget"],
            "request_id": request_id,
        }

    try:
        api_key, key_index = get_google_api_key()
    except ValueError as e:
        return {
            "enabled": False,
            "provider": "google_gemini",
            "status": "missing_api_key",
            "message": str(e),
        }

    req_record = AiRequestRecord(
        id=request_id,
        task_type=task_type,
        model=model_name,
        status="pending",
        latency_ms=0,
        input_token_estimate=budget_result["estimated_prompt_tokens"],
    )
    session.add(req_record)
    session.commit()

    try:
        response_json = post_google_generate_content(api_key, req_record.model, prompt, temperature)
        text = extract_gemini_text(response_json)
        parsed = parse_ai_json(text)
        
        usage = response_json.get("usageMetadata", {})
        req_record.status = "ok"
        req_record.input_token_estimate = usage.get("promptTokenCount")
        req_record.output_token_estimate = usage.get("candidatesTokenCount")
        
    except Exception as e:
        req_record.status = "error"
        session.commit()
        return {
            "enabled": True,
            "provider": "google_gemini",
            "model": req_record.model,
            "status": "error",
            "key_index": key_index,
            "key_fingerprint": secret_fingerprint(api_key),
            "message": str(e)
        }
    finally:
        req_record.latency_ms = int((time.time() - start_time) * 1000)
        session.commit()

    return {
        "enabled": True,
        "provider": "google_gemini",
        "model": req_record.model,
        "status": "ok",
        "key_index": key_index,
        "key_fingerprint": secret_fingerprint(api_key),
        "response": parsed,
        "usage": usage,
        "request_id": request_id
    }
