from __future__ import annotations

from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, delete
from sqlalchemy.orm import Session

from db.config import db_session, make_id, now_utc, json_dumps
from models import AnnotationRecord, DocumentRecord, ReviewItemRecord
from schemas import AnnotationCreateRequest, VocabularyUpsertRequest
from routers.user import upsert_vocabulary_item

router = APIRouter(prefix="/api/annotations", tags=["annotations"])


def annotation_to_dict(annotation: AnnotationRecord) -> dict[str, Any]:
    return {
        "id": annotation.id,
        "document_id": annotation.document_id,
        "page_id": annotation.page_id,
        "page_number": annotation.page_number,
        "sentence_id": annotation.sentence_id,
        "selected_text": annotation.selected_text,
        "selection_start": annotation.selection_start,
        "selection_end": annotation.selection_end,
        "bbox_json": annotation.bbox_json,
        "annotation_type": annotation.annotation_type,
        "note": annotation.note,
        "explanation_vi": annotation.explanation_vi,
        "selected_meaning_vi": annotation.selected_meaning_vi,
        "analysis_json": annotation.analysis_json,
        "source_sentence": annotation.source_sentence,
        "pinyin": annotation.pinyin,
        "hsk_level": annotation.hsk_level,
        "domain_tag": annotation.domain_tag,
        "created_at": annotation.created_at.isoformat(),
    }


@router.post("", status_code=201)
def create_annotation(payload: AnnotationCreateRequest, session: Session = Depends(db_session)) -> dict[str, str]:
    annotation_id = payload.id or make_id("ann")
    analysis_json = payload.analysis_json
    if isinstance(analysis_json, dict):
        analysis_json = json_dumps(analysis_json)
    record = AnnotationRecord(
        id=annotation_id,
        document_id=payload.document_id,
        page_id=payload.page_id,
        page_number=payload.page_number,
        sentence_id=payload.sentence_id,
        selected_text=payload.selected_text,
        selection_start=payload.selection_start,
        selection_end=payload.selection_end,
        bbox_json=payload.bbox_json,
        annotation_type=str(payload.annotation_type),
        note=payload.note or "",
        explanation_vi=payload.explanation_vi or payload.selected_meaning_vi or "",
        selected_meaning_vi=payload.selected_meaning_vi or payload.explanation_vi or "",
        analysis_json=analysis_json or "{}",
        source_sentence=payload.source_sentence,
        pinyin=payload.pinyin or "",
        hsk_level=payload.hsk_level,
        domain_tag=payload.domain_tag,
    )
    session.merge(record)
    document = session.get(DocumentRecord, payload.document_id)
    upsert_vocabulary_item(
        VocabularyUpsertRequest(
            word=payload.selected_text,
            translation=payload.selected_meaning_vi or payload.explanation_vi or "",
            pinyin=payload.pinyin or "",
            context=payload.source_sentence,
            source_file=document.title if document else payload.document_id,
            source_document_id=payload.document_id,
            hsk_level=payload.hsk_level,
            domain_tags=[payload.domain_tag] if payload.domain_tag else [],
        ),
        session,
    )
    session.commit()
    return {"id": annotation_id, "annotation_id": annotation_id, "status": "saved"}


@router.get("")
def list_annotations(
    document_id: str | None = None,
    page_id: str | None = None,
    page_number: int | None = None,
    session: Session = Depends(db_session),
) -> list[dict[str, Any]]:
    statement = select(AnnotationRecord).order_by(AnnotationRecord.created_at.desc())
    if document_id:
        statement = statement.where(AnnotationRecord.document_id == document_id)
    if page_id:
        statement = statement.where(AnnotationRecord.page_id == page_id)
    if page_number is not None:
        statement = statement.where(AnnotationRecord.page_number == page_number)
    return [annotation_to_dict(annotation) for annotation in session.execute(statement).scalars()]


@router.patch("/{annotation_id}")
def update_annotation(annotation_id: str, payload: dict[str, Any], session: Session = Depends(db_session)) -> dict[str, Any]:
    annotation = session.get(AnnotationRecord, annotation_id)
    if not annotation:
        raise HTTPException(status_code=404, detail="Annotation not found.")
    for key in ["note", "explanation_vi", "selected_meaning_vi", "analysis_json", "annotation_type"]:
        if key in payload:
            setattr(annotation, key, json_dumps(payload[key]) if key == "analysis_json" and isinstance(payload[key], dict) else payload[key])
    annotation.updated_at = now_utc()
    session.commit()
    return {"annotation_id": annotation_id, "status": "updated", "annotation": annotation_to_dict(annotation)}


@router.delete("/{annotation_id}")
def delete_annotation(annotation_id: str, session: Session = Depends(db_session)) -> dict[str, Any]:
    annotation = session.get(AnnotationRecord, annotation_id)
    deleted = bool(annotation)
    if annotation:
        session.delete(annotation)
        session.execute(delete(ReviewItemRecord).where(ReviewItemRecord.annotation_id == annotation_id))
        session.commit()
    return {"annotation_id": annotation_id, "deleted": deleted}
