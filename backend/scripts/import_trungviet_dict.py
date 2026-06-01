from __future__ import annotations

import csv
import os
import re
import struct
import sys
from pathlib import Path

# Insert backend dir to path for imports
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from models import DictionaryEntryRecord
from db.config import SessionLocal, json_dumps, pinyin_display, pinyin_numbered
from services.nlp_service import configure_jieba


def parse_stardict(idx_path: Path, dict_path: Path) -> dict[str, str]:
    """
    Parses a StarDict idx and dict pair and returns a dict mapping Chinese terms to definitions.
    """
    print(f"[*] Parsing StarDict: {idx_path.name}...")
    dictionary = {}
    with idx_path.open("rb") as f_idx, dict_path.open("rb") as f_dict:
        idx_data = f_idx.read()
        offset = 0
        total_bytes = len(idx_data)
        
        while offset < total_bytes:
            null_idx = idx_data.find(b"\x00", offset)
            if null_idx == -1:
                break
            
            try:
                word = idx_data[offset:null_idx].decode("utf-8")
            except UnicodeDecodeError:
                word = idx_data[offset:null_idx].decode("utf-8", errors="ignore")
                
            offset = null_idx + 1
            if offset + 8 > total_bytes:
                break
                
            data_offset, data_size = struct.unpack(">II", idx_data[offset:offset+8])
            offset += 8
            
            f_dict.seek(data_offset)
            definition_bytes = f_dict.read(data_size)
            try:
                definition = definition_bytes.decode("utf-8")
            except UnicodeDecodeError:
                definition = definition_bytes.decode("utf-8", errors="ignore")
                
            dictionary[word.strip()] = definition.strip()
            
    print(f"[+] Loaded {len(dictionary)} entries from StarDict.")
    return dictionary


def clean_stardict_definition(raw: str) -> str:
    """
    Cleans up raw StarDict definition text to make it readable in short card summaries.
    """
    if not raw:
        return ""
    # Replace carriage returns and format lists nicely
    cleaned = raw.replace("\r", "").strip()
    # Normalize multiple newlines/tabs
    cleaned = re.sub(r"\n+", "; ", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned)
    # Remove leading dashes/bullet points
    cleaned = re.sub(r"^-\s*", "", cleaned)
    cleaned = re.sub(r"\s*-\s*", "; ", cleaned)
    return cleaned


def enrich_existing_dictionary(session, stardict: dict[str, str]) -> int:
    """
    Iterates over existing DB records with empty 'vi' fields and populates them.
    """
    print("[*] Checking existing database entries to enrich empty Vietnamese fields...")
    records = session.query(DictionaryEntryRecord).filter(
        (DictionaryEntryRecord.vi == "") | (DictionaryEntryRecord.vi == None)
    ).all()
    
    print(f"[*] Found {len(records)} entries lacking Vietnamese definitions.")
    enriched = 0
    
    for record in records:
        term = record.simplified
        if term in stardict:
            record.vi = clean_stardict_definition(stardict[term])
            record.confidence = max(record.confidence, 0.85)
            enriched += 1
            
    session.commit()
    print(f"[+] Successfully enriched {enriched} database entries with Vietnamese definitions.")
    return enriched


def extract_hsk_level(file_name: str) -> int | None:
    match = re.search(r"hsk\s*(\d)", file_name.lower())
    if match:
        return int(match.group(1))
    if "7-9" in file_name:
        return 7
    return None


def import_hsk_csvs(session, hsk_dir: Path, stardict: dict[str, str]) -> int:
    """
    Imports HSK words from CSV files in D:\exe\hsk
    """
    if not hsk_dir.exists():
        print(f"[-] HSK Directory not found: {hsk_dir}")
        return 0
        
    csv_files = sorted(hsk_dir.glob("*.csv"))
    print(f"[*] Found {len(csv_files)} HSK CSV files under {hsk_dir}.")
    imported = 0
    
    for path in csv_files:
        level = extract_hsk_level(path.name)
        source_name = f"hsk_vocab_l{level}" if level else "hsk_vocab"
        print(f"[*] Importing {path.name} (HSK Level: {level or 'Unknown'})...")
        
        with path.open(encoding="utf-8-sig", newline="") as f:
            reader = csv.DictReader(f)
            for row in reader:
                term = (row.get("phrase") or row.get("simplified") or row.get("word") or "").strip()
                if not term:
                    continue
                    
                # Look up Vietnamese definition
                vi_def = clean_stardict_definition(stardict.get(term, ""))
                if not vi_def:
                    vi_def = f"Cần bổ sung nghĩa tiếng Việt cho '{term}'"
                    
                existing = session.query(DictionaryEntryRecord).filter(
                    DictionaryEntryRecord.simplified == term,
                    DictionaryEntryRecord.source == "hsk_vocab"
                ).first()
                
                if not existing:
                    existing = DictionaryEntryRecord(
                        simplified=term,
                        traditional=term,
                        source="hsk_vocab",
                        confidence=0.82
                    )
                    session.add(existing)
                    
                existing.pinyin = row.get("pronunciation") or row.get("pinyin") or pinyin_display(term)
                existing.pinyin_numbered = pinyin_numbered(term)
                existing.en = (row.get("en") or "").strip()
                existing.vi = vi_def
                if level:
                    existing.hsk_level = level
                existing.domain_tags_json = json_dumps(["hsk"])
                existing.source_version = path.name
                existing.license = "HSK Local Vocabulary Seeder"
                imported += 1
                
                if imported % 1000 == 0:
                    session.commit()
                    
    session.commit()
    print(f"[+] Imported/updated {imported} HSK vocabulary entries.")
    return imported


def import_phrases_csvs(session, phrase_dir: Path, stardict: dict[str, str]) -> int:
    """
    Imports 56,000 common phrases from CSV files in D:\exe\phrase
    """
    if not phrase_dir.exists():
        print(f"[-] Phrase Directory not found: {phrase_dir}")
        return 0
        
    csv_files = sorted(phrase_dir.glob("*.csv"))
    print(f"[*] Found {len(csv_files)} Phrase CSV files under {phrase_dir}.")
    imported = 0
    
    for path in csv_files:
        print(f"[*] Importing {path.name}...")
        with path.open(encoding="utf-8-sig", newline="") as f:
            reader = csv.DictReader(f)
            for row in reader:
                term = (row.get("phrase") or row.get("simplified") or row.get("word") or "").strip()
                if not term:
                    continue
                    
                # Look up Vietnamese definition
                vi_def = clean_stardict_definition(stardict.get(term, ""))
                if not vi_def:
                    # Skip phrases with no Vietnamese definition to keep dictionary dense and high quality
                    continue
                    
                existing = session.query(DictionaryEntryRecord).filter(
                    DictionaryEntryRecord.simplified == term,
                    DictionaryEntryRecord.source == "phrase_entries"
                ).first()
                
                if not existing:
                    existing = DictionaryEntryRecord(
                        simplified=term,
                        traditional=term,
                        source="phrase_entries",
                        confidence=0.88
                    )
                    session.add(existing)
                    
                existing.pinyin = row.get("pronunciation") or row.get("pinyin") or pinyin_display(term)
                existing.pinyin_numbered = pinyin_numbered(term)
                existing.en = (row.get("en") or "").strip()
                existing.vi = vi_def
                existing.domain_tags_json = json_dumps(["phrase"])
                existing.source_version = path.name
                existing.license = "Common Phrase List Seeder"
                imported += 1
                
                if imported % 2000 == 0:
                    session.commit()
                    print(f"    - Processed {imported} phrases...")
                    
    session.commit()
    print(f"[+] Imported {imported} common phrases successfully.")
    return imported


def main():
    print("="*50)
    print("Hanora Chinese-Vietnamese Local Seeding System")
    print("="*50)
    
    stardict_idx = Path("D:\\exe\\TrungViet\\TrungViet\\star_trungviet.idx")
    stardict_dict = Path("D:\\exe\\TrungViet\\TrungViet\\star_trungviet.dict")
    hsk_dir = Path("D:\\exe\\hsk")
    phrase_dir = Path("D:\\exe\\phrase")
    
    if not stardict_idx.exists() or not stardict_dict.exists():
        print(f"[!] StarDict files not found at: {stardict_idx.parent}")
        print("Please check your file paths.")
        sys.exit(1)
        
    stardict = parse_stardict(stardict_idx, stardict_dict)
    
    with SessionLocal() as session:
        # 1. Enrich existing rows (CC-CEDICT and existing HSK)
        enrich_existing_dictionary(session, stardict)
        
        # 2. Import levels from HSK CSVs
        import_hsk_csvs(session, hsk_dir, stardict)
        
        # 3. Import 56,000 phrases matching StarDict
        import_phrases_csvs(session, phrase_dir, stardict)
        
        # 4. Trigger JIEBA dictionary rebuild
        print("[*] Rebuilding JIEBA segmenter dictionary mapping...")
        configure_jieba(session, force=True)
        print("[+] JIEBA segmenter dictionary successfully updated!")
        
    print("="*50)
    print("[+] Seeding Complete! Hanora is now fully stabilized.")
    print("="*50)


if __name__ == "__main__":
    main()
