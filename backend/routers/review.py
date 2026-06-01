from __future__ import annotations

from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from db.config import db_session, make_id, now_utc
from models import (
    AnnotationRecord,
    ReviewItemRecord,
    ReviewEventRecord,
    DocumentRecord,
    VocabularyItemRecord
)
from schemas import ReviewItemCreateRequest, ReviewEventCreateRequest
from services.review_scheduler import review_scheduler, rating_to_int

router = APIRouter(tags=["review"])


def review_item_to_dict(item: ReviewItemRecord) -> dict[str, Any]:
    return {
        "id": item.id,
        "annotation_id": item.annotation_id,
        "item_type": item.item_type,
        "source_type": item.source_type,
        "front": item.front,
        "back": item.back,
        "context": item.context,
        "source_sentence": item.source_sentence,
        "pinyin": item.pinyin,
        "hsk_level": item.hsk_level,
        "domain_tag": item.domain_tag,
        "due_at": item.due_at.isoformat(),
        "interval_days": item.interval_days,
        "ease": item.ease,
        "reviewed": item.reviewed,
        "created_at": item.created_at.isoformat(),
    }


def create_review_item_record(payload: ReviewItemCreateRequest, session: Session) -> ReviewItemRecord:
    annotation = session.get(AnnotationRecord, payload.annotation_id) if payload.annotation_id else None
    item_type = payload.item_type or "flashcard"
    source_type = payload.source_type or annotation.annotation_type if annotation else payload.source_type or item_type
    return ReviewItemRecord(
        id=make_id("rev"),
        annotation_id=payload.annotation_id,
        item_type=item_type,
        source_type=source_type,
        front=payload.front or (annotation.selected_text if annotation else "新词"),
        back=payload.back or (annotation.explanation_vi or annotation.selected_meaning_vi if annotation else ""),
        context=payload.context or (annotation.note if annotation else ""),
        source_sentence=payload.source_sentence or (annotation.source_sentence if annotation else ""),
        pinyin=payload.pinyin or (annotation.pinyin if annotation else ""),
        hsk_level=payload.hsk_level if payload.hsk_level is not None else (annotation.hsk_level if annotation else None),
        domain_tag=payload.domain_tag or (annotation.domain_tag if annotation else None),
        due_at=review_scheduler.schedule_new(),
    )


@router.post("/api/review-items", status_code=201)
@router.post("/api/review/items", status_code=201)
def create_review_item(payload: ReviewItemCreateRequest, session: Session = Depends(db_session)) -> dict[str, Any]:
    item = create_review_item_record(payload, session)
    session.add(item)
    session.commit()
    return {"id": item.id, "review_item_id": item.id, "due_at": item.due_at.isoformat()}


@router.get("/api/review-items/due")
def due_review_items(session: Session = Depends(db_session)) -> dict[str, Any]:
    items = session.execute(select(ReviewItemRecord).where(ReviewItemRecord.due_at <= now_utc())).scalars().all()
    return {"items": [review_item_to_dict(item) for item in items]}


@router.get("/api/review-items")
def review_items(status: str | None = None, session: Session = Depends(db_session)) -> dict[str, Any]:
    statement = select(ReviewItemRecord).order_by(ReviewItemRecord.created_at.desc())
    if status == "due":
        statement = statement.where(ReviewItemRecord.due_at <= now_utc())
    return {"items": [review_item_to_dict(item) for item in session.execute(statement).scalars()]}


@router.get("/api/review/items")
def legacy_review_items(status: str | None = None, session: Session = Depends(db_session)) -> list[dict[str, Any]]:
    statement = select(ReviewItemRecord).order_by(ReviewItemRecord.created_at.desc())
    if status == "due":
        statement = statement.where(ReviewItemRecord.due_at <= now_utc())
    return [review_item_to_dict(item) for item in session.execute(statement).scalars()]


@router.post("/api/review-events")
@router.post("/api/review/events")
def create_review_event(payload: ReviewEventCreateRequest, session: Session = Depends(db_session)) -> dict[str, Any]:
    item = session.get(ReviewItemRecord, payload.review_item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Review item not found.")
    rating = rating_to_int(payload.rating)
    next_due, interval_days, ease = review_scheduler.schedule_review(item, rating)
    item.interval_days = interval_days
    item.ease = ease
    item.due_at = next_due
    item.reviewed = True
    event = ReviewEventRecord(id=make_id("evt"), review_item_id=item.id, rating=rating, response_time_ms=payload.response_time_ms)
    session.add(event)
    session.commit()
    return {"status": "updated", "next_due_at": item.due_at.isoformat(), "interval_days": interval_days}


@router.get("/api/dashboard/summary")
def dashboard_summary(session: Session = Depends(db_session)) -> dict[str, Any]:
    total_reviews = session.scalar(select(func.count(ReviewEventRecord.id))) or 0
    good_reviews = session.scalar(select(func.count(ReviewEventRecord.id)).where(ReviewEventRecord.rating >= 3)) or 0
    due_today = session.scalar(select(func.count(ReviewItemRecord.id)).where(ReviewItemRecord.due_at <= now_utc())) or 0
    known_words = session.scalar(select(func.count(func.distinct(VocabularyItemRecord.word)))) or 0
    return {
        "documents_count": session.scalar(select(func.count(DocumentRecord.id))) or 0,
        "annotations_count": session.scalar(select(func.count(AnnotationRecord.id))) or 0,
        "review_items_count": session.scalar(select(func.count(ReviewItemRecord.id))) or 0,
        "due_today": due_today,
        "review_accuracy": round(good_reviews / total_reviews, 2) if total_reviews else 0,
        "known_words_estimate": known_words,
    }


@router.get("/api/dashboard/hsk-distribution")
def hsk_distribution(session: Session = Depends(db_session)) -> dict[str, int]:
    result = {"hsk_1": 0, "hsk_2": 0, "hsk_3": 0, "hsk_4": 0, "hsk_5": 0, "hsk_6": 0, "hsk_7_9": 0, "unknown": 0}
    for level in session.execute(select(AnnotationRecord.hsk_level)).scalars():
        if not level:
            result["unknown"] += 1
        elif level >= 7:
            result["hsk_7_9"] += 1
        else:
            result[f"hsk_{level}"] += 1
    return result


@router.get("/api/dashboard/domain-distribution")
def domain_distribution(session: Session = Depends(db_session)) -> dict[str, int]:
    result: dict[str, int] = {}
    for domain in session.execute(select(AnnotationRecord.domain_tag)).scalars():
        key = domain or "general"
        result[key] = result.get(key, 0) + 1
    return result
