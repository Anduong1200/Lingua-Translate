from __future__ import annotations

import argparse
import csv
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from main import DictionaryEntryRecord, SessionLocal, configure_jieba, json_dumps, pinyin_display, pinyin_numbered


def import_vi_overrides(path: Path) -> int:
    imported = 0
    with path.open(encoding="utf-8-sig", newline="") as handle, SessionLocal() as session:
        for row in csv.DictReader(handle):
            term = (row.get("simplified") or row.get("term") or row.get("word") or "").strip()
            meaning_vi = (row.get("vi") or row.get("meaning_vi") or row.get("definition_vi") or "").strip()
            if not term or not meaning_vi:
                continue
            existing = (
                session.query(DictionaryEntryRecord)
                .filter(DictionaryEntryRecord.simplified == term, DictionaryEntryRecord.source == "custom_vi")
                .one_or_none()
            )
            if not existing:
                existing = DictionaryEntryRecord(simplified=term, source="custom_vi")
                session.add(existing)
            existing.traditional = row.get("traditional") or term
            existing.pinyin = row.get("pinyin") or pinyin_display(term)
            existing.pinyin_numbered = pinyin_numbered(term)
            existing.vi = meaning_vi
            existing.en = row.get("en") or row.get("meaning_en") or ""
            existing.domain_tags_json = json_dumps([row.get("domain") or "general"])
            existing.note = row.get("note") or ""
            existing.confidence = float(row.get("confidence") or 0.92)
            imported += 1
        session.commit()
        configure_jieba(session)
    return imported


def main() -> None:
    parser = argparse.ArgumentParser(description="Import Vietnamese dictionary overrides.")
    parser.add_argument("path", type=Path)
    args = parser.parse_args()
    print({"imported": import_vi_overrides(args.path)})


if __name__ == "__main__":
    main()
