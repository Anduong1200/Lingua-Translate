from __future__ import annotations

from datetime import timedelta
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from db.config import (
    ai_circuit_breaker_error_limit,
    ai_circuit_breaker_window_minutes,
    ai_daily_request_limit,
    ai_daily_token_limit,
    ai_max_prompt_chars,
    now_utc,
)
from models.ai_history import AiRequestRecord


def estimate_token_count(text: str) -> int:
    if not text:
        return 0
    # Conservative local estimate. Real provider usage is stored after the call.
    return max(1, len(text) // 4)


def get_ai_budget_summary(session: Session) -> dict[str, Any]:
    today_prefix = now_utc().date().isoformat()
    todays_records = session.execute(
        select(AiRequestRecord).where(AiRequestRecord.created_at.like(f"{today_prefix}%"))
    ).scalars()

    billable_statuses = {"pending", "ok", "error"}
    daily_request_count = 0
    daily_token_estimate = 0
    for record in todays_records:
        if record.status not in billable_statuses:
            continue
        daily_request_count += 1
        daily_token_estimate += int(record.input_token_estimate or 0) + int(record.output_token_estimate or 0)

    cutoff = (now_utc() - timedelta(minutes=ai_circuit_breaker_window_minutes())).isoformat()
    recent_error_count = session.scalar(
        select(func.count(AiRequestRecord.id))
        .where(AiRequestRecord.status == "error")
        .where(AiRequestRecord.created_at >= cutoff)
    )

    error_count = int(recent_error_count or 0)
    error_limit = ai_circuit_breaker_error_limit()
    return {
        "daily_request_limit": ai_daily_request_limit(),
        "daily_request_count": daily_request_count,
        "daily_token_limit": ai_daily_token_limit(),
        "daily_token_estimate": daily_token_estimate,
        "max_prompt_chars": ai_max_prompt_chars(),
        "circuit_breaker_error_limit": error_limit,
        "circuit_breaker_window_minutes": ai_circuit_breaker_window_minutes(),
        "recent_error_count": error_count,
        "circuit_open": error_limit > 0 and error_count >= error_limit,
    }


def check_ai_budget(prompt: str, session: Session) -> dict[str, Any]:
    summary = get_ai_budget_summary(session)
    estimated_prompt_tokens = estimate_token_count(prompt)

    max_chars = int(summary["max_prompt_chars"])
    if max_chars > 0 and len(prompt) > max_chars:
        return {
            "allowed": False,
            "status": "prompt_too_large",
            "message": f"AI prompt exceeds max prompt characters ({max_chars}).",
            "estimated_prompt_tokens": estimated_prompt_tokens,
            "budget": summary,
        }

    if summary["circuit_open"]:
        return {
            "allowed": False,
            "status": "circuit_open",
            "message": "AI circuit breaker is open because recent provider errors exceeded the configured limit.",
            "estimated_prompt_tokens": estimated_prompt_tokens,
            "budget": summary,
        }

    request_limit = int(summary["daily_request_limit"])
    if request_limit > 0 and int(summary["daily_request_count"]) >= request_limit:
        return {
            "allowed": False,
            "status": "daily_request_budget_exceeded",
            "message": f"AI daily request budget exceeded ({request_limit}).",
            "estimated_prompt_tokens": estimated_prompt_tokens,
            "budget": summary,
        }

    token_limit = int(summary["daily_token_limit"])
    if token_limit > 0 and int(summary["daily_token_estimate"]) + estimated_prompt_tokens > token_limit:
        return {
            "allowed": False,
            "status": "daily_token_budget_exceeded",
            "message": f"AI daily token budget exceeded ({token_limit}).",
            "estimated_prompt_tokens": estimated_prompt_tokens,
            "budget": summary,
        }

    return {
        "allowed": True,
        "status": "ok",
        "message": "",
        "estimated_prompt_tokens": estimated_prompt_tokens,
        "budget": summary,
    }
