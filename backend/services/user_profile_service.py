from __future__ import annotations

from typing import Any
from sqlalchemy import select
from sqlalchemy.orm import Session
from db.config import json_loads
from models.user import UserProfileRecord, UserCorrectionRecord


def find_user_correction(selected_text: str, domain: str, session: Session) -> UserCorrectionRecord | None:
    return session.execute(
        select(UserCorrectionRecord)
        .where(UserCorrectionRecord.original_term == selected_text)
        .where((UserCorrectionRecord.domain == domain) | (UserCorrectionRecord.domain == "general"))
        .order_by(UserCorrectionRecord.created_at.desc())
    ).scalars().first()


def get_profile(session: Session) -> UserProfileRecord:
    profile = session.get(UserProfileRecord, 1)
    if profile:
        return profile
    profile = UserProfileRecord(id=1)
    session.add(profile)
    session.commit()
    session.refresh(profile)
    return profile


def profile_to_dict(profile: UserProfileRecord) -> dict[str, Any]:
    return {
        "target_level": profile.target_level,
        "native_language": profile.native_language,
        "preferred_domains": json_loads(profile.preferred_domains_json, ["general"]),
        "show_pinyin": profile.show_pinyin,
        "translation_style": profile.translation_style,
    }
