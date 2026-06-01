from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Any
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import select, delete
from sqlalchemy.orm import Session

from db.config import (
    db_session,
    make_id,
    UPLOAD_DIR,
    now_utc,
    json_loads,
    rate_limiter,
    upload_rate_limit_per_minute,
    allowed_upload_extensions,
    safe_filename,
    path_is_under,
    read_upload_file_limited,
    current_request,
    PUNCTUATION,
    pinyin_display
)
from models import (
    DocumentRecord,
    PageRecord,
    AnnotationRecord,
    ReviewItemRecord,
    ReviewEventRecord,
    VocabularyItemRecord
)
from schemas import (
    DocumentCreateRequest,
    PageCreateRequest,
    AutoReviewCreateRequest
)
from services.pdf_service import extract_file_text
from services.nlp_service import (
    tokenize_chinese,
    split_sentences,
    grammar_patterns,
    natural_translation,
    literal_translation,
    detect_domain,
    content_tokens,
    token_vi,
    token_en
)
from services.review_scheduler import review_scheduler
from services.user_profile_service import find_user_correction
from routers.review import review_item_to_dict

router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.post("", status_code=201)
def create_document(payload: DocumentCreateRequest, session: Session = Depends(db_session)) -> dict[str, str]:
    doc_id = make_id("doc")
    record = DocumentRecord(
        id=doc_id,
        title=payload.title,
        file_name=payload.file_name,
        original_filename=payload.file_name,
        source_type=payload.source_type,
        language=payload.language,
        content=payload.content,
    )
    session.add(record)
    session.commit()
    return {"document_id": doc_id, "status": "created"}


@router.post("/upload", status_code=201)
async def upload_document(
    file: UploadFile = File(...),
    language: str = Form("zh-CN"),
    session: Session = Depends(db_session),
    request: Request = Depends(current_request),
) -> dict[str, Any]:
    if isinstance(request, Request):
        rate_limiter.check(request, name="upload", limit=upload_rate_limit_per_minute())
    original_name = safe_filename(file.filename or "document.pdf")
    suffix = Path(original_name).suffix.lower() or ".bin"
    if suffix not in allowed_upload_extensions():
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type '{suffix}'. Allowed: {', '.join(sorted(allowed_upload_extensions()))}.",
        )

    data = await read_upload_file_limited(file)
    if not data:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    source_type = suffix.lstrip(".") or "file"
    doc_id = make_id("doc")
    checksum = hashlib.sha256(data).hexdigest()
    stored_filename = f"{doc_id}_{checksum[:12]}{suffix}"
    stored_path = (UPLOAD_DIR / stored_filename).resolve()
    if not path_is_under(stored_path, UPLOAD_DIR):
        raise HTTPException(status_code=400, detail="Invalid upload storage path.")
    stored_path.write_bytes(data)

    try:
        extracted_text = extract_file_text(original_name, data).strip()
    except Exception:
        extracted_text = ""

    record = DocumentRecord(
        id=doc_id,
        title=original_name,
        file_name=original_name,
        original_filename=original_name,
        stored_filename=stored_filename,
        file_path=str(stored_path),
        sha256=checksum,
        mime_type=file.content_type or "application/octet-stream",
        source_type=source_type,
        language=language,
        content=extracted_text,
    )
    session.add(record)
    if extracted_text:
        session.add(PageRecord(document_id=doc_id, page_number=1, text=extracted_text))
    session.commit()
    return {
        "document_id": doc_id,
        "status": "created",
        "title": original_name,
        "file_name": original_name,
        "source_type": source_type,
        "language": language,
        "content": extracted_text,
        "sha256": checksum,
        "mime_type": record.mime_type,
        "file_url": f"/api/documents/{doc_id}/file",
    }


@router.get("")
def list_documents(session: Session = Depends(db_session)) -> dict[str, Any]:
    documents = session.execute(select(DocumentRecord).order_by(DocumentRecord.created_at.desc())).scalars().all()
    return {
        "documents": [
            {
                "id": document.id,
                "title": document.title,
                "language": document.language,
                "source_type": document.source_type,
                "file_name": document.file_name,
                "original_filename": document.original_filename,
                "sha256": document.sha256,
                "mime_type": document.mime_type,
                "content": document.content,
                "file_url": f"/api/documents/{document.id}/file" if document.file_path else "",
                "created_at": document.created_at.isoformat(),
            }
            for document in documents
        ]
    }


@router.get("/{document_id}/file")
def get_document_file(document_id: str, session: Session = Depends(db_session)) -> FileResponse:
    document = session.get(DocumentRecord, document_id)
    if not document or not document.file_path:
        raise HTTPException(status_code=404, detail="Document file not found.")
    file_path = Path(document.file_path).resolve()
    if not path_is_under(file_path, UPLOAD_DIR):
        raise HTTPException(status_code=400, detail="Stored file path is outside upload storage.")
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Stored file is missing.")
    return FileResponse(
        path=file_path,
        media_type=document.mime_type or "application/octet-stream",
        filename=document.original_filename or document.file_name or file_path.name,
    )


@router.get("/{document_id}")
def get_document(document_id: str, session: Session = Depends(db_session)) -> dict[str, Any]:
    document = session.get(DocumentRecord, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found.")
    pages = session.execute(select(PageRecord).where(PageRecord.document_id == document_id).order_by(PageRecord.page_number)).scalars().all()
    return {
        "id": document.id,
        "title": document.title,
        "file_name": document.file_name,
        "original_filename": document.original_filename,
        "stored_filename": document.stored_filename,
        "source_type": document.source_type,
        "language": document.language,
        "content": document.content,
        "sha256": document.sha256,
        "mime_type": document.mime_type,
        "file_url": f"/api/documents/{document.id}/file" if document.file_path else "",
        "created_at": document.created_at.isoformat(),
        "pages": [
            {"page_number": page.page_number, "text": page.text, "width": page.width, "height": page.height}
            for page in pages
        ],
    }


@router.delete("/{document_id}")
def delete_document(document_id: str, session: Session = Depends(db_session)) -> dict[str, Any]:
    document = session.get(DocumentRecord, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found.")

    file_path = Path(document.file_path).resolve() if document.file_path else None
    annotations = session.execute(select(AnnotationRecord.id).where(AnnotationRecord.document_id == document_id)).all()
    annotation_ids = [row[0] for row in annotations]
    review_ids: list[str] = []
    if annotation_ids:
        review_ids.extend(
            row[0]
            for row in session.execute(
                select(ReviewItemRecord.id).where(ReviewItemRecord.annotation_id.in_(annotation_ids))
            ).all()
        )
    review_ids.extend(
        row[0]
        for row in session.execute(
            select(ReviewItemRecord.id).where(ReviewItemRecord.context == f"auto:{document_id}")
        ).all()
    )

    deleted_events = 0
    deleted_review_items = 0
    if review_ids:
        deleted_events = session.execute(delete(ReviewEventRecord).where(ReviewEventRecord.review_item_id.in_(review_ids))).rowcount or 0
        deleted_review_items = session.execute(delete(ReviewItemRecord).where(ReviewItemRecord.id.in_(review_ids))).rowcount or 0

    deleted_annotations = session.execute(delete(AnnotationRecord).where(AnnotationRecord.document_id == document_id)).rowcount or 0
    deleted_pages = session.execute(delete(PageRecord).where(PageRecord.document_id == document_id)).rowcount or 0
    deleted_vocabulary = session.execute(delete(VocabularyItemRecord).where(VocabularyItemRecord.source_document_id == document_id)).rowcount or 0
    session.delete(document)
    session.commit()

    file_deleted = False
    if file_path and path_is_under(file_path, UPLOAD_DIR) and file_path.exists():
        file_path.unlink()
        file_deleted = True

    return {
        "status": "deleted",
        "document_id": document_id,
        "deleted_pages": deleted_pages,
        "deleted_annotations": deleted_annotations,
        "deleted_review_items": deleted_review_items,
        "deleted_review_events": deleted_events,
        "deleted_vocabulary_items": deleted_vocabulary,
        "file_deleted": file_deleted,
    }


@router.post("/{document_id}/pages", status_code=201)
def create_page(document_id: str, payload: PageCreateRequest, session: Session = Depends(db_session)) -> dict[str, Any]:
    if not session.get(DocumentRecord, document_id):
        raise HTTPException(status_code=404, detail="Document not found.")
    existing = session.execute(
        select(PageRecord).where(PageRecord.document_id == document_id).where(PageRecord.page_number == payload.page_number)
    ).scalar_one_or_none()
    if not existing:
        existing = PageRecord(document_id=document_id, page_number=payload.page_number)
        session.add(existing)
    existing.text = payload.text
    existing.width = payload.width
    existing.height = payload.height
    session.commit()
    return {"document_id": document_id, "page_number": payload.page_number, "status": "saved"}


def document_text(document: DocumentRecord, session: Session) -> str:
    if document.content.strip():
        return document.content.strip()
    pages = session.execute(
        select(PageRecord).where(PageRecord.document_id == document.id).order_by(PageRecord.page_number)
    ).scalars().all()
    return "\n".join(page.text for page in pages if page.text.strip()).strip()


def document_translation_sentence(document_id: str, sentence: str, index: int, session: Session) -> dict[str, Any]:
    tokens = tokenize_chinese(sentence, session)
    domain = detect_domain(sentence, "auto")
    return {
        "sentence_id": f"{document_id}-sentence-{index + 1}",
        "index": index,
        "source": sentence,
        "natural_vi": natural_translation(sentence, sentence, tokens, domain),
        "literal_vi": literal_translation(tokens),
        "pinyin": pinyin_display(sentence),
        "domain": domain,
        "grammar_patterns": grammar_patterns(sentence),
    }


@router.get("/{document_id}/translate")
def translate_document(document_id: str, session: Session = Depends(db_session)) -> dict[str, Any]:
    document = session.get(DocumentRecord, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found.")
    text = document_text(document, session)
    translations = [
        document_translation_sentence(document.id, sentence, index, session)
        for index, sentence in enumerate(split_sentences(text))
    ]
    return {
        "document_id": document.id,
        "title": document.title,
        "mode": "local_rule_based",
        "translations": translations,
    }


def document_vocabulary_suggestions(document: DocumentRecord, session: Session, limit: int = 30) -> list[dict[str, Any]]:
    text = document_text(document, session)
    suggestions: dict[str, dict[str, Any]] = {}
    for sentence in split_sentences(text):
        for token in content_tokens(tokenize_chinese(sentence, session)):
            surface = token.get("surface", "").strip()
            if not surface or surface in PUNCTUATION:
                continue
            definitions_vi = token.get("definitions_vi") or []
            definitions_en = token.get("definitions_en") or []
            if len(surface) == 1 and not definitions_vi and not definitions_en:
                continue
            domain_tags = token.get("domain_tags") or []
            hsk_level = token.get("hsk_level")
            score = 1.0
            score += min(len(surface), 6) * 0.25
            score += 1.0 if definitions_vi else 0.0
            score += 0.5 if definitions_en else 0.0
            score += 0.4 if domain_tags else 0.0
            score += (hsk_level or 0) * 0.08
            
            # Check user correction first
            corr = find_user_correction(surface, (domain_tags or [None])[0] or "general", session)
            if corr:
                definitions_vi = [corr.user_translation]
                
            existing = suggestions.get(surface)
            if existing:
                existing["frequency"] += 1
                existing["score"] = round(existing["score"] + score + 0.35, 2)
                continue
            suggestions[surface] = {
                "surface": surface,
                "pinyin": token.get("pinyin", ""),
                "definition_vi": (definitions_vi[0] if definitions_vi else "") or token_vi(token) or "",
                "definition_en": token_en(token) or "",
                "hsk_level": hsk_level,
                "domain_tags": domain_tags,
                "frequency": 1,
                "source_sentence": sentence,
                "score": round(score, 2),
            }
    return sorted(suggestions.values(), key=lambda item: (-item["score"], -len(item["surface"]), item["surface"]))[:limit]


@router.get("/{document_id}/vocabulary-scan")
def scan_document_vocabulary(
    document_id: str,
    limit: int = Query(30, ge=1, le=100),
    session: Session = Depends(db_session),
) -> dict[str, Any]:
    document = session.get(DocumentRecord, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found.")
    return {
        "document_id": document.id,
        "title": document.title,
        "items": document_vocabulary_suggestions(document, session, limit),
    }


@router.post("/{document_id}/auto-review-items")
def create_document_auto_review_items(
    document_id: str,
    payload: AutoReviewCreateRequest,
    session: Session = Depends(db_session),
) -> dict[str, Any]:
    document = session.get(DocumentRecord, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found.")

    existing_fronts = {
        row[0]
        for row in session.execute(
            select(ReviewItemRecord.front).where(ReviewItemRecord.context == f"auto:{document.id}")
        ).all()
    }
    created_items: list[ReviewItemRecord] = []
    skipped = 0
    suggestions = [
        item
        for item in document_vocabulary_suggestions(document, session, payload.limit)
        if item["frequency"] >= payload.min_frequency
    ]
    for index, suggestion in enumerate(suggestions):
        if suggestion["surface"] in existing_fronts:
            skipped += 1
            continue
        back = suggestion["definition_vi"] or suggestion["definition_en"] or "Cần bổ sung nghĩa Việt"
        item = ReviewItemRecord(
            id=f"{make_id('rev')}_{index}",
            annotation_id=None,
            item_type="flashcard",
            source_type="auto_vocabulary",
            front=suggestion["surface"],
            back=back,
            context=f"auto:{document.id}",
            source_sentence=suggestion["source_sentence"],
            pinyin=suggestion["pinyin"],
            hsk_level=suggestion["hsk_level"],
            domain_tag=(suggestion["domain_tags"] or [None])[0],
            due_at=review_scheduler.schedule_new(),
        )
        session.add(item)
        created_items.append(item)
        existing_fronts.add(item.front)
    session.commit()
    return {
        "document_id": document.id,
        "created": len(created_items),
        "skipped": skipped,
        "items": [review_item_to_dict(item) for item in created_items],
    }
