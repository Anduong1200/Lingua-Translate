from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from models.ai_history import AiUserConsentRecord

LOCAL_USER_ID = "local"


def get_ai_user_consent(session: Session, user_id: str = LOCAL_USER_ID) -> AiUserConsentRecord:
    consent = session.get(AiUserConsentRecord, user_id)
    if consent:
        return consent
    consent = AiUserConsentRecord(
        user_id=user_id,
        allow_send_selected_text=False,
        allow_send_page_context=False,
        allow_send_notes=False,
    )
    session.add(consent)
    session.commit()
    session.refresh(consent)
    return consent


def ai_user_consent_to_dict(consent: AiUserConsentRecord) -> dict[str, Any]:
    return {
        "user_id": consent.user_id,
        "allow_send_selected_text": bool(consent.allow_send_selected_text),
        "allow_send_page_context": bool(consent.allow_send_page_context),
        "allow_send_notes": bool(consent.allow_send_notes),
        "created_at": consent.created_at,
    }


def update_ai_user_consent(session: Session, payload: dict[str, Any], user_id: str = LOCAL_USER_ID) -> AiUserConsentRecord:
    consent = get_ai_user_consent(session, user_id)
    for key in ["allow_send_selected_text", "allow_send_page_context", "allow_send_notes"]:
        if key in payload:
            setattr(consent, key, bool(payload[key]))
    session.commit()
    session.refresh(consent)
    return consent


def sanitize_rule_based_for_ai(rule_based: dict[str, Any], selected_text: str, allow_page_context: bool) -> dict[str, Any]:
    if allow_page_context:
        return rule_based

    sanitized = dict(rule_based)
    sanitized["review_suggestions"] = []
    if isinstance(sanitized.get("context"), dict):
        sanitized["context"] = {
            **sanitized["context"],
            "source_sentence": selected_text,
            "paragraph_context": "",
            "page_context": "",
        }
    if isinstance(sanitized.get("selection"), dict):
        sanitized["selection"] = {
            **sanitized["selection"],
            "source_sentence": selected_text,
            "paragraph_context": "",
            "page_context": "",
        }
    return sanitized
