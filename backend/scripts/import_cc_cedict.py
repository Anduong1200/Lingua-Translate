from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from main import DictionaryEntryRecord, SessionLocal, configure_jieba, parse_cedict_line


def import_cc_cedict(path: Path, source: str) -> tuple[int, int, int]:
    imported = skipped = errors = 0
    with SessionLocal() as session:
        for line in path.read_text(encoding="utf-8").splitlines():
            try:
                entry = parse_cedict_line(line.strip(), source)
                if not entry:
                    skipped += 1
                    continue
                existing = (
                    session.query(DictionaryEntryRecord)
                    .filter(DictionaryEntryRecord.simplified == entry["simplified"], DictionaryEntryRecord.source == source)
                    .one_or_none()
                )
                if not existing:
                    existing = DictionaryEntryRecord(simplified=entry["simplified"], source=source)
                    session.add(existing)
                existing.traditional = entry["traditional"]
                existing.pinyin = entry["pinyin"]
                existing.pinyin_numbered = entry["pinyin_numbered"]
                existing.vi = ""
                existing.en = entry["en"]
                existing.confidence = 0.7
                imported += 1
            except Exception:
                errors += 1
        session.commit()
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
