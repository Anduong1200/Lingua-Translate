from __future__ import annotations

import re
from typing import Any
from sqlalchemy import select
from sqlalchemy.orm import Session
from db.config import (
    SEED_DICTIONARY,
    PUNCTUATION,
    json_loads,
    pinyin_display,
    pinyin_numbered
)
from models.dictionary import DictionaryEntryRecord


def contains_chinese(text: str) -> bool:
    return bool(re.search(r"[\u4e00-\u9fff]", text or ""))


def split_definitions(value: str | list[str] | None) -> list[str]:
    if not value:
        return []
    if isinstance(value, list):
        return value
    return [item.strip() for item in re.split(r"[;；/]", value) if item.strip()]


def entry_get(entry: dict[str, Any] | DictionaryEntryRecord, key: str, default: Any = None) -> Any:
    if isinstance(entry, dict):
        return entry.get(key, default)
    if key == "domain_tags":
        return json_loads(entry.domain_tags_json, [])
    return getattr(entry, key, default)


def to_dictionary_result(entry: dict[str, Any] | DictionaryEntryRecord) -> dict[str, Any]:
    simplified = entry_get(entry, "simplified", "")
    display = entry_get(entry, "pinyin") or (pinyin_display(simplified) if contains_chinese(simplified) else "")
    definitions_vi = split_definitions(entry_get(entry, "vi") or entry_get(entry, "definition_vi") or entry_get(entry, "definitions_vi"))
    definitions_en = split_definitions(entry_get(entry, "en") or entry_get(entry, "definitions_en"))
    return {
        "simplified": simplified,
        "traditional": entry_get(entry, "traditional") or simplified,
        "pinyin": entry_get(entry, "pinyin") or display,
        "pinyin_numbered": entry_get(entry, "pinyin_numbered") or pinyin_numbered(simplified),
        "pinyin_display": display,
        "definitions_en": definitions_en,
        "definitions_vi": definitions_vi,
        "hsk_level": entry_get(entry, "hsk_level"),
        "domain_tags": entry_get(entry, "domain_tags", []) or [],
        "source": entry_get(entry, "source", "hanora_seed_vi"),
        "confidence": entry_get(entry, "confidence", 0.8),
        "note": entry_get(entry, "note", ""),
        "pos": entry_get(entry, "pos"),
    }


def seed_entry(surface: str) -> dict[str, Any] | None:
    return next((entry for entry in SEED_DICTIONARY if entry["simplified"] == surface or entry.get("traditional") == surface), None)


def db_entry(surface: str, session: Session) -> DictionaryEntryRecord | None:
    matches = session.execute(
        select(DictionaryEntryRecord).where(
            (DictionaryEntryRecord.simplified == surface) | (DictionaryEntryRecord.traditional == surface)
        )
    ).scalars().all()
    source_priority = {
        "custom_vi": 0,
        "domain_dictionary": 1,
        "phrase_entries": 2,
        "hsk_vocab": 3,
        "cc-cedict": 4,
    }
    return sorted(matches, key=lambda entry: source_priority.get(entry.source, 10))[0] if matches else None


def dictionary_source_priority(source: str | None) -> int:
    return {
        "user_corrections": 0,
        "custom_vi": 1,
        "hanora_seed_vi": 2,
        "domain_dictionary": 3,
        "phrase_entries": 4,
        "hsk_vocab": 5,
        "cc-cedict": 6,
    }.get(source or "", 10)


def dictionary_relevance_key(entry: dict[str, Any], query: str) -> tuple[int, int, float, int, str]:
    simplified = str(entry.get("simplified") or "")
    traditional = str(entry.get("traditional") or "")
    haystack = " ".join(str(entry.get(key, "")) for key in ["simplified", "traditional", "pinyin", "vi", "en"]).lower()
    lowered = query.lower()
    if simplified == query or traditional == query:
        relevance = 0
    elif simplified.startswith(query) or traditional.startswith(query):
        relevance = 1
    elif query in simplified or query in traditional:
        relevance = 2
    elif lowered in haystack:
        relevance = 3
    else:
        relevance = 4
    return (
        relevance,
        dictionary_source_priority(entry.get("source")),
        -float(entry.get("confidence") or 0),
        len(simplified),
        simplified,
    )


def find_dictionary_entry(surface: str, session: Session) -> dict[str, Any] | DictionaryEntryRecord | None:
    database_entry = db_entry(surface, session)
    seed = seed_entry(surface)
    if not seed:
        return database_entry
    if not database_entry:
        return seed
    if database_entry.source in {"hsk_vocab", "cc-cedict", "phrase_entries"} and entry_get(seed, "vi"):
        return seed
    return database_entry


def token_from_surface(surface: str, session: Session) -> dict[str, Any]:
    entry = find_dictionary_entry(surface, session)
    if not entry:
        is_punct = surface in PUNCTUATION
        return {
            "surface": surface,
            "normalized": surface,
            "pinyin": pinyin_display(surface) if contains_chinese(surface) else "",
            "pos": "punctuation" if is_punct else None,
            "hsk_level": None,
            "definitions_vi": [],
            "definitions_en": [] if is_punct else ["No local dictionary match yet"],
            "definitions": []
            if is_punct
            else [
                {"lang": "en", "value": "No local dictionary match yet", "source": "local_fallback", "confidence": 0.25},
            ],
            "domain_tags": [],
            "confidence": 1 if is_punct else 0.35,
        }

    result = to_dictionary_result(entry)
    definitions = [
        *[
            {"lang": "vi", "value": value, "source": result["source"], "confidence": result["confidence"]}
            for value in result["definitions_vi"]
        ],
        *[
            {"lang": "en", "value": value, "source": result["source"], "confidence": min(result["confidence"], 0.76)}
            for value in result["definitions_en"]
        ],
    ]
    return {
        "surface": result["simplified"],
        "normalized": result["simplified"],
        "pinyin": result["pinyin_display"],
        "pos": result["pos"],
        "hsk_level": result["hsk_level"],
        "definitions_vi": result["definitions_vi"],
        "definitions_en": result["definitions_en"],
        "definitions": definitions,
        "domain_tags": result["domain_tags"],
        "confidence": result["confidence"],
    }
