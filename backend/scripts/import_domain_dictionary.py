from __future__ import annotations

import argparse
import csv
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from main import DictionaryEntryRecord, SessionLocal, configure_jieba, json_dumps, pinyin_display, pinyin_numbered


def import_domain_dictionary(path: Path, domain: str) -> int:
    imported = 0
    with path.open(encoding="utf-8-sig", newline="") as handle, SessionLocal() as session:
        for row in csv.DictReader(handle):
            simplified = (row.get("simplified") or row.get("term") or row.get("word") or "").strip()
            if not simplified:
                continue
            existing = (
                session.query(DictionaryEntryRecord)
                .filter(DictionaryEntryRecord.simplified == simplified, DictionaryEntryRecord.source == "domain_dictionary")
                .one_or_none()
            )
            if not existing:
                existing = DictionaryEntryRecord(simplified=simplified, source="domain_dictionary")
                session.add(existing)
            existing.traditional = row.get("traditional") or simplified
            existing.pinyin = row.get("pinyin") or pinyin_display(simplified)
            existing.pinyin_numbered = pinyin_numbered(simplified)
            existing.vi = row.get("vi") or row.get("meaning_vi") or ""
            existing.en = row.get("en") or row.get("meaning_en") or ""
            existing.domain_tags_json = json_dumps([row.get("domain") or domain])
            existing.confidence = float(row.get("confidence") or 0.88)
            imported += 1
        session.commit()
        configure_jieba(session)
    return imported


def main() -> None:
    parser = argparse.ArgumentParser(description="Import CSV domain dictionary into Hanora SQLite dictionary.")
    parser.add_argument("path", type=Path)
    parser.add_argument("--domain", default="general")
    args = parser.parse_args()
    print({"imported": import_domain_dictionary(args.path, args.domain)})


if __name__ == "__main__":
    main()
