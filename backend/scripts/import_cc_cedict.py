from __future__ import annotations

import argparse
import sys
from pathlib import Path
import sqlite3

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from db.config import DB_PATH, now_utc
from services.nlp_service import configure_jieba
from routers.dictionary import parse_cedict_line


def import_cc_cedict(path: Path, source: str) -> tuple[int, int, int]:
    imported = skipped = errors = 0
    db = sqlite3.connect(DB_PATH)

    # Delete existing entries from this source
    db.execute("DELETE FROM dictionary_entries WHERE source=?", (source,))

    now = now_utc().isoformat()
    records = []
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            stripped_line = line.strip()
            if not stripped_line or stripped_line.startswith("#"):
                continue
            try:
                entry = parse_cedict_line(stripped_line, source)
                if not entry:
                    skipped += 1
                    continue
                records.append((
                    now,
                    entry["simplified"], entry["traditional"], entry["pinyin"], entry["pinyin_numbered"],
                    "", entry["en"], source, 0.7, path.name, "CC-CEDICT" if source == "cc-cedict" else "",
                    stripped_line, "[]", ""
                ))
                imported += 1

                if len(records) >= 5000:
                    db.executemany('''
                        INSERT INTO dictionary_entries (
                            created_at,
                            simplified, traditional, pinyin, pinyin_numbered, vi, en, source, confidence,
                            source_version, license, raw_line, domain_tags_json, note
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', records)
                    records = []
            except Exception:
                errors += 1

    if records:
        db.executemany('''
            INSERT INTO dictionary_entries (
                created_at,
                simplified, traditional, pinyin, pinyin_numbered, vi, en, source, confidence,
                source_version, license, raw_line, domain_tags_json, note
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', records)
    db.commit()
    db.close()

    from db.config import SessionLocal
    with SessionLocal() as session:
        configure_jieba(session)

    return imported, skipped, errors


def main() -> None:
    parser = argparse.ArgumentParser(description="Import CC-CEDICT into Hanora SQLite dictionary.")
    parser.add_argument("path", type=Path)
    parser.add_argument("--source", default="cc-cedict")
    args = parser.parse_args()
    imported, skipped, errors = import_cc_cedict(args.path, args.source)
    print({"imported": imported, "skipped": skipped, "errors": errors})


if __name__ == "__main__":
    main()
