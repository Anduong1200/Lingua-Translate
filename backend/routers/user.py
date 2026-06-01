from __future__ import annotations

from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from db.config import db_session, make_id, now_utc, json_dumps, json_loads
from models import UserProfileRecord, UserCorrectionRecord, VocabularyItemRecord, KnownWordRecord
from schemas import UserCorrectionCreateRequest, VocabularyUpsertRequest, VocabularyPatchRequest, KnownWordCreateRequest
from services.user_profile_service import get_profile, profile_to_dict

router = APIRouter(tags=["user"])


@router.get("/api/user/profile")
def user_profile(session: Session = Depends(db_session)) -> dict[str, Any]:
    profile = get_profile(session)
    return {"profile": profile_to_dict(profile)}


@router.patch("/api/user/profile")
def update_user_profile(payload: dict[str, Any], session: Session = Depends(db_session)) -> dict[str, Any]:
    profile = get_profile(session)
    for key in ["target_level", "native_language", "show_pinyin", "translation_style"]:
        if key in payload:
            setattr(profile, key, payload[key])
    if "preferred_domains" in payload:
        profile.preferred_domains_json = json_dumps(payload["preferred_domains"])
    session.commit()
    return user_profile(session)


@router.get("/api/user/corrections")
def list_user_corrections(session: Session = Depends(db_session)) -> dict[str, Any]:
    corrections = session.execute(select(UserCorrectionRecord).order_by(UserCorrectionRecord.created_at.desc())).scalars()
    return {
        "corrections": [
            {
                "id": correction.id,
                "original_term": correction.original_term,
                "system_translation": correction.system_translation,
                "user_translation": correction.user_translation,
                "context": correction.context,
                "domain": correction.domain,
                "created_at": correction.created_at.isoformat(),
            }
            for correction in corrections
        ]
    }


@router.post("/api/user/corrections", status_code=201)
def create_user_correction(payload: UserCorrectionCreateRequest, session: Session = Depends(db_session)) -> dict[str, Any]:
    correction = UserCorrectionRecord(
        id=make_id("corr"),
        original_term=payload.original_term,
        system_translation=payload.system_translation,
        user_translation=payload.user_translation,
        context=payload.context,
        domain=payload.domain,
    )
    session.add(correction)
    session.commit()
    return {"status": "saved", "correction": {"id": correction.id, "original_term": correction.original_term}}


def vocabulary_item_to_dict(item: VocabularyItemRecord) -> dict[str, Any]:
    return {
        "id": item.id,
        "word": item.word,
        "translation": item.translation,
        "pinyin": item.pinyin,
        "context": item.context,
        "source_file": item.source_file,
        "source_document_id": item.source_document_id,
        "hsk_level": item.hsk_level,
        "domain_tags": json_loads(item.domain_tags_json, []),
        "topic": item.topic,
        "favorite": item.favorite,
        "learned": item.learned,
        "lookup_count": item.lookup_count,
        "created_at": item.created_at.isoformat(),
        "updated_at": item.updated_at.isoformat(),
    }


def infer_vocabulary_topic(domain_tags: list[str], source_file: str = "") -> str:
    if domain_tags:
        primary = domain_tags[0]
        return {
            "economics": "Kinh tế",
            "business": "Kinh tế",
            "computer_science": "Công nghệ",
            "education": "Giáo trình",
            "academic": "Học thuật",
        }.get(primary, primary)
    lower_source = source_file.lower()
    if "hán ngữ" in lower_source or "hsk" in lower_source:
        return "Giáo trình"
    return "general"


def upsert_vocabulary_item(payload: VocabularyUpsertRequest, session: Session) -> VocabularyItemRecord:
    word = payload.word.strip()
    if not word:
        raise HTTPException(status_code=400, detail="word is required.")
    existing = session.execute(select(VocabularyItemRecord).where(VocabularyItemRecord.word == word)).scalar_one_or_none()
    now = now_utc()
    topic = payload.topic if payload.topic and payload.topic != "general" else infer_vocabulary_topic(payload.domain_tags, payload.source_file)
    if existing:
        if payload.translation:
            existing.translation = payload.translation
        if payload.pinyin:
            existing.pinyin = payload.pinyin
        if payload.context:
            existing.context = payload.context
        if payload.source_file:
            existing.source_file = payload.source_file
        if payload.source_document_id:
            existing.source_document_id = payload.source_document_id
        if payload.hsk_level is not None:
            existing.hsk_level = payload.hsk_level
        if payload.domain_tags:
            existing.domain_tags_json = json_dumps(payload.domain_tags)
        existing.topic = topic or existing.topic or "general"
        existing.lookup_count += 1
        existing.updated_at = now
        return existing

    item = VocabularyItemRecord(
        id=make_id("voc"),
        word=word,
        translation=payload.translation,
        pinyin=payload.pinyin,
        context=payload.context,
        source_file=payload.source_file,
        source_document_id=payload.source_document_id,
        hsk_level=payload.hsk_level,
        domain_tags_json=json_dumps(payload.domain_tags),
        topic=topic,
        lookup_count=1,
        created_at=now,
        updated_at=now,
    )
    session.add(item)
    return item


@router.post("/api/vocabulary/lookup", status_code=201)
def record_vocabulary_lookup(payload: VocabularyUpsertRequest, session: Session = Depends(db_session)) -> dict[str, Any]:
    item = upsert_vocabulary_item(payload, session)
    session.commit()
    session.refresh(item)
    return {"status": "saved", "item": vocabulary_item_to_dict(item)}


@router.get("/api/vocabulary")
def list_vocabulary_items(session: Session = Depends(db_session)) -> dict[str, Any]:
    items = session.execute(select(VocabularyItemRecord).order_by(VocabularyItemRecord.updated_at.desc())).scalars()
    return {"items": [vocabulary_item_to_dict(item) for item in items]}


@router.patch("/api/vocabulary/{item_id}")
def update_vocabulary_item(item_id: str, payload: VocabularyPatchRequest, session: Session = Depends(db_session)) -> dict[str, Any]:
    item = session.get(VocabularyItemRecord, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Vocabulary item not found.")
    if payload.translation is not None:
        item.translation = payload.translation
    if payload.topic is not None:
        item.topic = payload.topic
    if payload.favorite is not None:
        item.favorite = payload.favorite
    if payload.learned is not None:
        item.learned = payload.learned
    item.updated_at = now_utc()
    session.commit()
    return {"status": "updated", "item": vocabulary_item_to_dict(item)}


@router.delete("/api/vocabulary/{item_id}")
def delete_vocabulary_item(item_id: str, session: Session = Depends(db_session)) -> dict[str, Any]:
    item = session.get(VocabularyItemRecord, item_id)
    deleted = bool(item)
    if item:
        session.delete(item)
        session.commit()
    return {"id": item_id, "deleted": deleted}


@router.post("/api/known-words", status_code=201)
def create_known_word(payload: KnownWordCreateRequest, session: Session = Depends(db_session)) -> dict[str, str]:
    existing = session.execute(select(KnownWordRecord).where(KnownWordRecord.word == payload.word)).scalar_one_or_none()
    if existing:
        existing.confidence = payload.confidence
        existing.times_seen += 1
        existing.last_seen = now_utc()
    else:
        session.add(KnownWordRecord(id=make_id("kw"), word=payload.word, confidence=payload.confidence))
    session.commit()
    return {"status": "saved", "word": payload.word}


@router.get("/api/known-words")
def list_known_words(session: Session = Depends(db_session)) -> dict[str, Any]:
    words = session.execute(select(KnownWordRecord).order_by(KnownWordRecord.last_seen.desc())).scalars()
    return {
        "words": [
            {
                "id": word.id,
                "word": word.word,
                "confidence": word.confidence,
                "last_seen": word.last_seen.isoformat(),
                "times_seen": word.times_seen,
                "times_looked_up": word.times_looked_up,
                "created_at": word.created_at.isoformat(),
            }
            for word in words
        ]
    }
