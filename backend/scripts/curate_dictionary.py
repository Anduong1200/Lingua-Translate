import sys
from pathlib import Path
import json

# Setup import path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(backend_dir))

from sqlalchemy import select
from db.config import SessionLocal
from models.dictionary import DictionaryEntryRecord

CURATED_TERMS = {
    "处理": "xử lý / giải quyết",
    "数据": "dữ liệu",
    "系统": "hệ thống",
    "需要": "cần / cần phải",
    "大量": "lượng lớn / rất nhiều",
    "下降": "giảm / sụt giảm",
    "调整": "điều chỉnh",
    "市场需求": "nhu cầu thị trường",
    "生产计划": "kế hoạch sản xuất",
    "计算机系统": "hệ thống máy tính",
}

def apply_curated_terms():
    with SessionLocal() as session:
        for term, meaning in CURATED_TERMS.items():
            # Check if curated entry already exists
            stmt = select(DictionaryEntryRecord).where(
                (DictionaryEntryRecord.simplified == term) & 
                (DictionaryEntryRecord.source == "curated_vi")
            )
            existing = session.execute(stmt).scalar_one_or_none()
            
            if existing:
                existing.vi = meaning
            else:
                # Get pinyin from existing entry if available
                pinyin_val = ""
                existing_entry = session.execute(
                    select(DictionaryEntryRecord).where(DictionaryEntryRecord.simplified == term).limit(1)
                ).scalar_one_or_none()
                if existing_entry:
                    pinyin_val = existing_entry.pinyin
                
                new_entry = DictionaryEntryRecord(
                    simplified=term,
                    traditional=term,
                    pinyin=pinyin_val,
                    vi=meaning,
                    source="curated_vi",
                    confidence=1.0,
                    domain_tags_json="[]"
                )
                session.add(new_entry)
                
        session.commit()
        print(f"Successfully curated {len(CURATED_TERMS)} core terms.")

if __name__ == "__main__":
    apply_curated_terms()
