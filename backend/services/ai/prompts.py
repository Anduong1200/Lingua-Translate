import json
from typing import Any
from db.config import json_dumps

def build_context_reading_prompt(
    selected_text: str, 
    source_sentence: str, 
    paragraph_context: str, 
    domain: str, 
    user_level: str,
    local_evidence: dict[str, Any]
) -> str:
    context = {
        "selected_text": selected_text,
        "source_sentence": source_sentence,
        "paragraph_context": paragraph_context,
        "domain": domain,
        "user_level": user_level,
        "local_evidence": local_evidence,
    }
    
    return (
        "Bạn là AI context reading layer cho app học đọc tiếng Trung của người Việt.\n"
        "Nhiệm vụ: giải thích selection trong ngữ cảnh, không dịch từng chữ máy móc, không bịa nghĩa ngoài dữ liệu nếu không chắc chắn.\n"
        "Ưu tiên nghĩa tiếng Việt trong local_evidence, domain, câu gốc và trình độ HSK của user.\n"
        "Tuyệt đối chỉ trả về JSON hợp lệ, không markdown, không text dư thừa.\n"
        "Schema JSON bắt buộc:\n"
        "{\n"
        '  "natural_vi": "bản dịch tự nhiên của selection trong ngữ cảnh",\n'
        '  "literal_vi": "bản dịch sát cấu trúc",\n'
        '  "context_explanation_vi": "giải thích vai trò của selection trong câu",\n'
        '  "grammar_notes": [{"pattern": "...", "meaning_vi": "...", "evidence": "..."}],\n'
        '  "nuance_vi": "sắc thái/ngữ vực/domain nếu có",\n'
        '  "domain": "tên domain",\n'
        '  "review_suggestions": [{"type": "cloze", "front": "...", "back": "...", "reason_vi": "..."}],\n'
        '  "confidence": 0.0\n'
        "}\n\n"
        f"Ngữ cảnh cục bộ:\n{json_dumps(context)}"
    )
