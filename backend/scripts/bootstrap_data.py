from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from models import DictionaryEntryRecord
from db.config import SessionLocal
from routers.admin import debug_db_stats
from scripts.import_cc_cedict import import_cc_cedict
from scripts.import_hsk_vocab import import_hsk
from scripts.import_trungviet_dict import (
    enrich_existing_dictionary,
    import_hsk_csvs,
    import_phrases_csvs,
    parse_stardict,
)


def first_existing(candidates: list[Path]) -> Path | None:
    return next((path for path in candidates if path.exists()), None)


def default_cedict_path() -> Path | None:
    env_path = os.environ.get("CEDICT_PATH")
    if env_path:
        return Path(env_path)
    root = Path(__file__).resolve().parents[2]
    return first_existing(
        [
            root / "data" / "raw" / "cedict" / "cedict_ts.u8",
            root / "data" / "raw" / "cedict_ts.u8",
        ]
    )


def default_hsk_path() -> Path | None:
    env_path = os.environ.get("HSK_VOCAB_PATH")
    if env_path:
        return Path(env_path)
    root = Path(__file__).resolve().parents[2]
    return first_existing([root / "data" / "raw" / "hsk"])


def default_phrase_path() -> Path | None:
    env_path = os.environ.get("PHRASE_PATH") or os.environ.get("PHRASE_DIR")
    if env_path:
        return Path(env_path)
    root = Path(__file__).resolve().parents[2]
    return first_existing([root / "data" / "raw" / "phrase"])


def default_stardict_dir() -> Path | None:
    env_path = os.environ.get("TRUNGVIET_STARDICT_DIR")
    if env_path:
        return Path(env_path)
    root = Path(__file__).resolve().parents[2]
    return first_existing(
        [
            root / "data" / "raw" / "TrungViet" / "TrungViet",
            root / "data" / "raw" / "trungviet",
        ]
    )


def count_by_source(source: str) -> int:
    with SessionLocal() as session:
        return session.query(DictionaryEntryRecord).filter(DictionaryEntryRecord.source == source).count()


def resolve_hsk_files(path: Path) -> list[Path]:
    if path.is_dir():
        return sorted(item for item in path.glob("*") if item.suffix.lower() in {".pdf", ".csv", ".txt", ".tsv"})
    return [path]


def main() -> None:
    parser = argparse.ArgumentParser(description="Bootstrap local dictionary data for Hanora MVP.")
    parser.add_argument("--cedict", type=Path, default=None, help="Path to cedict_ts.u8.")
    parser.add_argument("--hsk", type=Path, default=None, help="Path to HSK vocabulary folder or file.")
    parser.add_argument("--phrase", type=Path, default=None, help="Path to phrase CSV folder.")
    parser.add_argument("--stardict-dir", type=Path, default=None, help="Path containing star_trungviet.idx and star_trungviet.dict.")
    parser.add_argument("--force", action="store_true", help="Run imports even when source rows already exist.")
    args = parser.parse_args()

    cedict_path = args.cedict or default_cedict_path()
    hsk_path = args.hsk or default_hsk_path()
    phrase_path = args.phrase or default_phrase_path()
    stardict_dir = args.stardict_dir or default_stardict_dir()
    results: dict[str, object] = {}

    if cedict_path and cedict_path.exists():
        if args.force or count_by_source("cc-cedict") == 0:
            imported, skipped, errors = import_cc_cedict(cedict_path, "cc-cedict")
            results["cc_cedict"] = {"path": str(cedict_path), "imported": imported, "skipped": skipped, "errors": errors}
        else:
            results["cc_cedict"] = {"path": str(cedict_path), "status": "skipped_existing"}
    else:
        results["cc_cedict"] = {"status": "not_found", "hint": "Set CEDICT_PATH or pass --cedict path/to/cedict_ts.u8."}

    if hsk_path and hsk_path.exists():
        if args.force or count_by_source("hsk_vocab") == 0:
            files = resolve_hsk_files(hsk_path)
            imported = import_hsk(files, None)
            results["hsk_vocab"] = {"path": str(hsk_path), "files": len(files), "imported": imported}
        else:
            results["hsk_vocab"] = {"path": str(hsk_path), "status": "skipped_existing"}
    else:
        results["hsk_vocab"] = {"status": "not_found", "hint": "Set HSK_VOCAB_PATH or pass --hsk path/to/hsk_folder."}

    if stardict_dir and (stardict_dir / "star_trungviet.idx").exists() and (stardict_dir / "star_trungviet.dict").exists():
        with SessionLocal() as session:
            stardict = parse_stardict(stardict_dir / "star_trungviet.idx", stardict_dir / "star_trungviet.dict")
            enriched = enrich_existing_dictionary(session, stardict)
            hsk_enriched = 0
            if hsk_path and hsk_path.exists() and (args.force or count_by_source("hsk_vocab") == 0):
                hsk_enriched = import_hsk_csvs(session, hsk_path if hsk_path.is_dir() else hsk_path.parent, stardict)
            phrase_imported = 0
            if phrase_path and phrase_path.exists() and (args.force or count_by_source("phrase_entries") == 0):
                phrase_imported = import_phrases_csvs(session, phrase_path, stardict)
            results["trungviet"] = {
                "path": str(stardict_dir),
                "enriched": enriched,
                "hsk_imported": hsk_enriched,
                "phrases_imported": phrase_imported,
            }
    else:
        results["trungviet"] = {
            "status": "not_found",
            "hint": "Set TRUNGVIET_STARDICT_DIR or add data/raw/TrungViet/TrungViet.",
        }

    with SessionLocal() as session:
        results["db_stats"] = debug_db_stats(session)
    print(results)


if __name__ == "__main__":
    main()
