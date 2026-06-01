from __future__ import annotations

import re
from pathlib import Path
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from db.config import (
    db_session,
    BASE_DIR,
    SEED_DICTIONARY,
    json_dumps,
    pinyin_display,
    pinyin_numbered
)
from models import DictionaryEntryRecord, UserCorrectionRecord
from schemas import DictionaryImportRequest, CustomDictionaryRequest
from services.dictionary_service import (
    contains_chinese,
    to_dictionary_result,
    dictionary_relevance_key
)
from services.nlp_service import configure_jieba

router = APIRouter(prefix="/api/dictionary", tags=["dictionary"])


def parse_cedict_line(line: str, source: str) -> dict[str, Any] | None:
    if not line or line.startswith("#"):
        return None
    match = re.match(r"^(\S+)\s+(\S+)\s+\[([^\]]+)\]\s+\/(.+)\/$", line)
    if not match:
        return None
    traditional, simplified, raw_pinyin, definitions = match.groups()
    return {
        "traditional": traditional,
        "simplified": simplified,
        "pinyin": raw_pinyin.lower(),
        "pinyin_numbered": raw_pinyin.lower(),
        "vi": "",
        "en": "; ".join([item for item in definitions.split("/") if item]),
        "source": source,
        "confidence": 0.7,
    }


@router.post("/import")
def dictionary_import(payload: DictionaryImportRequest, session: Session = Depends(db_session)) -> dict[str, int]:
    resolved = Path(payload.file_path)
    if not resolved.is_absolute():
        resolved = (BASE_DIR / payload.file_path).resolve()
    if not resolved.exists():
        raise HTTPException(status_code=404, detail=f"Dictionary file not found: {resolved}")

    imported = skipped = errors = 0
    for line in resolved.read_text(encoding="utf-8").splitlines():
        stripped_line = line.strip()
        try:
            entry = parse_cedict_line(stripped_line, payload.source)
            if not entry:
                skipped += 1
                continue
            existing = session.execute(
                select(DictionaryEntryRecord)
                .where(DictionaryEntryRecord.simplified == entry["simplified"])
                .where(DictionaryEntryRecord.source == payload.source)
            ).scalar_one_or_none()
            if not existing:
                existing = DictionaryEntryRecord(simplified=entry["simplified"])
                session.add(existing)
            existing.traditional = entry["traditional"]
            existing.pinyin = entry["pinyin"]
            existing.pinyin_numbered = entry["pinyin_numbered"]
            existing.vi = entry["vi"]
            existing.en = entry["en"]
            existing.source = entry["source"]
            existing.source_version = resolved.name
            existing.license = "CC-CEDICT" if payload.source == "cc-cedict" else ""
            existing.raw_line = stripped_line
            existing.confidence = entry["confidence"]
            imported += 1
        except Exception:
            errors += 1
    session.commit()
    configure_jieba(session, force=True)
    return {"imported": imported, "skipped": skipped, "errors": errors}


@router.get("/search")
def dictionary_search(q: str = Query(...), session: Session = Depends(db_session)) -> dict[str, Any]:
    query = q.strip()
    if not query:
        raise HTTPException(status_code=400, detail="q query parameter is required.")

    results: list[dict[str, Any]] = []
    corrections = session.execute(
        select(UserCorrectionRecord).where(
            (UserCorrectionRecord.original_term.contains(query)) | (UserCorrectionRecord.user_translation.contains(query))
        )
    ).scalars()
    for correction in corrections:
        results.append(
            to_dictionary_result(
                {
                    "simplified": correction.original_term,
                    "traditional": correction.original_term,
                    "pinyin": pinyin_display(correction.original_term) if contains_chinese(correction.original_term) else "",
                    "vi": correction.user_translation,
                    "en": correction.system_translation,
                    "domain_tags": [correction.domain],
                    "source": "user_corrections",
                    "confidence": 0.95,
                }
            )
        )
    for entry in SEED_DICTIONARY:
        haystack = " ".join(str(entry.get(key, "")) for key in ["simplified", "traditional", "pinyin", "vi", "en"]).lower()
        if query.lower() in haystack:
            results.append(to_dictionary_result(entry))
    db_results = session.execute(
        select(DictionaryEntryRecord).where(
            (DictionaryEntryRecord.simplified.contains(query))
            | (DictionaryEntryRecord.traditional.contains(query))
            | (DictionaryEntryRecord.pinyin.contains(query))
            | (DictionaryEntryRecord.vi.contains(query))
            | (DictionaryEntryRecord.en.contains(query))
        )
    ).scalars()
    for entry in db_results:
        results.append(to_dictionary_result(entry))

    deduped: dict[tuple[str, str], dict[str, Any]] = {}
    for result in sorted(results, key=lambda item: dictionary_relevance_key(item, query)):
        dedupe_key = (result["simplified"], result["source"])
        if dedupe_key not in deduped:
            deduped[dedupe_key] = result
    return {"query": query, "results": list(deduped.values())[:20]}


@router.post("/custom", status_code=201)
def dictionary_custom(payload: CustomDictionaryRequest, session: Session = Depends(db_session)) -> dict[str, Any]:
    existing = session.execute(select(DictionaryEntryRecord).where(DictionaryEntryRecord.simplified == payload.simplified)).scalar_one_or_none()
    if not existing:
        existing = DictionaryEntryRecord(simplified=payload.simplified)
        session.add(existing)
    existing.traditional = payload.traditional or payload.simplified
    existing.pinyin = payload.pinyin or pinyin_display(payload.simplified)
    existing.pinyin_numbered = pinyin_numbered(payload.simplified)
    existing.vi = payload.definition_vi
    existing.en = payload.definition_en or ""
    existing.domain_tags_json = json_dumps([payload.domain])
    existing.source = "custom_vi"
    existing.confidence = 0.9
    existing.note = payload.note
    session.commit()
    session.refresh(existing)
    configure_jieba(session, force=True)
    return {"status": "saved", "entry": to_dictionary_result(existing)}
