from __future__ import annotations

import argparse
import csv
import re
import sys
import unicodedata
from pathlib import Path

from pypdf import PdfReader

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from models import DictionaryEntryRecord
from db.config import SessionLocal, json_dumps, pinyin_display, pinyin_numbered
from services.nlp_service import configure_jieba

PINYIN_TONE_MARKS = "āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜńňǹḿ"
EN_POS_MARKERS = {
    "adjective",
    "adverb",
    "auxiliary",
    "classifier",
    "conjunction",
    "interjection",
    "measure",
    "noun",
    "number",
    "particle",
    "prefix",
    "preposition",
    "pronoun",
    "suffix",
    "verb",
}
CN_POS_MARKERS = tuple("动名形副介连助数代量叹拟")


def normalize_text(value: str) -> str:
    return unicodedata.normalize("NFKC", value or "").replace("⼉", "儿")


def contains_tone_mark(value: str) -> bool:
    return any(char in PINYIN_TONE_MARKS for char in value)


def looks_like_pinyin(value: str) -> bool:
    return bool(re.fullmatch(r"[A-Za-züÜv:āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜńňǹḿ'’.-]+", value))


def extract_level_from_name(path: Path, default_level: int | None) -> int | None:
    name = path.stem.lower()
    if re.search(r"(?:level|l)[\s_-]*7[\s_-]*(?:-|to)?[\s_-]*9", name):
        return 7
    match = re.search(r"(?:level|l|hsk)[\s_-]*(\d)", name)
    return int(match.group(1)) if match else default_level


def row_from_pdf_line(line: str) -> dict[str, str] | None:
    line = re.sub(r"\s+", " ", normalize_text(line).strip())
    if not re.match(r"^\d+\s+", line):
        return None

    parts = line.split()
    if len(parts) < 3:
        return None

    term = parts[1].strip()
    if not re.search(r"[\u3400-\u9fff]", term):
        return None

    pinyin_parts: list[str] = []
    tail_start = 2
    for index, part in enumerate(parts[2:], start=2):
        marker = part.strip("(),;:").lower()
        if marker in EN_POS_MARKERS or part.startswith(CN_POS_MARKERS):
            tail_start = index
            break
        if not looks_like_pinyin(part):
            tail_start = index
            break
        if pinyin_parts and not contains_tone_mark(part) and part.lower() not in {"de", "le", "ma", "ba", "ne", "zi", "men"}:
            tail_start = index
            break
        pinyin_parts.append(part)
        tail_start = index + 1

    if not pinyin_parts:
        return None

    tail = " ".join(parts[tail_start:]).strip()
    pos = ""
    meaning_en = tail
    if tail:
        first_tail = tail.split()[0]
        if first_tail.lower().strip("(),;:") in EN_POS_MARKERS or first_tail.startswith(CN_POS_MARKERS):
            pos = first_tail
            meaning_en = " ".join(tail.split()[1:]).strip()

    return {
        "simplified": term,
        "pinyin": " ".join(pinyin_parts),
        "pos": pos,
        "en": meaning_en,
    }


def rows_from_file(path: Path) -> list[dict[str, str]]:
    if path.suffix.lower() == ".csv":
        with path.open(encoding="utf-8-sig", newline="") as handle:
            return [{key: normalize_text(value) for key, value in dict(row).items()} for row in csv.DictReader(handle)]

    rows: list[dict[str, str]] = []
    if path.suffix.lower() == ".pdf":
        reader = PdfReader(str(path))
        text = "\n".join(page.extract_text() or "" for page in reader.pages)
    else:
        text = path.read_text(encoding="utf-8", errors="ignore")

    text = normalize_text(text)
    for line in text.splitlines():
        row = row_from_pdf_line(line)
        if row:
            rows.append(row)
            continue

        terms = re.findall(r"[\u3400-\u9fff]{1,12}", line)
        for term in terms:
            rows.append({"simplified": term})
    return rows


def import_hsk(paths: list[Path], default_level: int | None) -> int:
    imported = 0
    with SessionLocal() as session:
        for path in paths:
            path_level = extract_level_from_name(path, default_level)
            for row in rows_from_file(path):
                simplified = (row.get("simplified") or row.get("word") or row.get("term") or row.get("汉字") or "").strip()
                if not simplified:
                    continue
                existing = (
                    session.query(DictionaryEntryRecord)
                    .filter(DictionaryEntryRecord.simplified == simplified, DictionaryEntryRecord.source == "hsk_vocab")
                    .one_or_none()
                )
                if not existing:
                    existing = DictionaryEntryRecord(simplified=simplified, source="hsk_vocab")
                    session.add(existing)
                existing.pinyin = row.get("pinyin") or pinyin_display(simplified)
                existing.pinyin_numbered = pinyin_numbered(simplified)
                existing.vi = row.get("vi") or row.get("meaning_vi") or ""
                existing.en = row.get("en") or row.get("meaning_en") or ""
                existing.pos = row.get("pos") or existing.pos
                existing.hsk_level = int(row.get("hsk_level") or row.get("level") or path_level or 0) or None
                existing.domain_tags_json = json_dumps(["hsk"])
                existing.confidence = 0.82
                existing.source_version = path.name
                existing.license = "HSK vocabulary source"
                existing.raw_line = str(row)
                imported += 1
        session.commit()
        configure_jieba(session)
    return imported


def main() -> None:
    parser = argparse.ArgumentParser(description="Import HSK vocabulary files into Hanora SQLite dictionary.")
    parser.add_argument("paths", nargs="+", type=Path)
    parser.add_argument("--level", type=int, default=None)
    args = parser.parse_args()
    files = []
    for path in args.paths:
        files.extend(sorted(path.glob("*")) if path.is_dir() else [path])
    print({"imported": import_hsk(files, args.level)})


if __name__ == "__main__":
    main()
