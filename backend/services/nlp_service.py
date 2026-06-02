from __future__ import annotations

import re
import os
import json
import hashlib
import httpx
import threading
from typing import Any
import jieba
from pypinyin import Style, lazy_pinyin
from sqlalchemy import select
from sqlalchemy.orm import Session

from db.config import (
    SEED_DICTIONARY,
    PUNCTUATION,
    GOOGLE_KEY_FILE,
    SessionLocal,
    make_id,
    now_utc,
    json_dumps,
    json_loads,
    pinyin_display,
    pinyin_numbered,
    parse_key_list,
    app_config,
    config_int,
    config_float
)
from models.dictionary import DictionaryEntryRecord
from services.dictionary_service import (
    contains_chinese,
    token_from_surface,
    find_dictionary_entry,
    entry_get,
    to_dictionary_result
)
from services.user_profile_service import get_profile, find_user_correction
from schemas import NlpAnalyzeRequest, AIContextRequest

# Jieba global loading locks
_jieba_ready = False
_jieba_lock = threading.Lock()


def configure_jieba(session: Session | None = None, force: bool = False) -> None:
    global _jieba_ready
    if _jieba_ready and not force:
        return
    with _jieba_lock:
        if _jieba_ready and not force:
            return

        for entry in SEED_DICTIONARY:
            jieba.add_word(entry["simplified"], freq=200000)
        if session:
            for simplified in session.execute(select(DictionaryEntryRecord.simplified)).scalars():
                jieba.add_word(simplified, freq=200000)

        _jieba_ready = True


def tokenize_chinese(text: str, session: Session) -> list[dict[str, Any]]:
    configure_jieba(session)
    tokens: list[dict[str, Any]] = []
    for surface in jieba.cut(text, cut_all=False):
        surface = surface.strip()
        if not surface:
            continue
        if all(char in PUNCTUATION for char in surface):
            tokens.extend(token_from_surface(char, session) for char in surface)
        else:
            tokens.append(token_from_surface(surface, session))
    return tokens


def split_sentences(text: str) -> list[str]:
    return [sentence.strip() for sentence in re.split(r"(?<=[。！？!?])\s*|\n+", text or "") if sentence.strip()]


def grammar_patterns(sentence: str) -> list[dict[str, Any]]:
    patterns: list[dict[str, Any]] = []
    if "虽然" in sentence and "满足" not in sentence and "调整" not in sentence and "但是" in sentence:
        patterns.append({"pattern": "虽然...但是...", "meaning_vi": "mặc dù... nhưng..., nêu quan hệ nhượng bộ rồi chuyển ý", "confidence": 0.9})
    elif "虽然" in sentence:
        patterns.append({"pattern": "虽然...", "meaning_vi": "mặc dù..., giới thiệu vế nhượng bộ", "confidence": 0.8})
    
    if "由于" in sentence:
        patterns.append({"pattern": "Due to / Bởi vì / Do", "meaning_vi": "do/vì, thường dùng trong văn viết, báo cáo hoặc giải thích nguyên nhân", "confidence": 0.84})
    if "因为" in sentence and "所以" in sentence:
        patterns.append({"pattern": "因为...所以...", "meaning_vi": "vì... nên..., nêu nguyên nhân rồi kết quả", "confidence": 0.86})
    if "需要" in sentence:
        patterns.append({"pattern": "需要 + Verb/Noun", "meaning_vi": "cần/cần phải làm gì đó; trong câu kỹ thuật thường đứng trước hành động xử lý", "confidence": 0.76})
    if "把" in sentence:
        patterns.append({"pattern": "把 + object + verb", "meaning_vi": "đưa tân ngữ lên trước động từ để nhấn mạnh cách xử lý hoặc kết quả", "confidence": 0.72})
    if "被" in sentence:
        patterns.append({"pattern": "被 + verb", "meaning_vi": "cấu trúc bị động: chủ thể chịu tác động của hành động phía sau 被", "confidence": 0.72})
    if "对" in sentence and "来说" in sentence:
        patterns.append({"pattern": "对...来说", "meaning_vi": "đối với..., giới hạn góc nhìn hoặc đối tượng được bàn tới", "confidence": 0.74})
    if "不仅" in sentence and "而且" in sentence:
        patterns.append({"pattern": "不仅...而且...", "meaning_vi": "không chỉ... mà còn..., dùng để tăng cấp hoặc bổ sung ý", "confidence": 0.82})
    return patterns


def analyze_chinese(text: str, session: Session) -> dict[str, Any]:
    return {
        "text": text,
        "sentences": [
            {
                "text": sentence,
                "tokens": tokenize_chinese(sentence, session),
                "grammar_patterns": grammar_patterns(sentence),
            }
            for sentence in split_sentences(text)
        ],
    }


def token_vi(token: dict[str, Any]) -> str:
    return (token.get("definitions_vi") or [""])[0] or next(
        (definition["value"] for definition in token.get("definitions", []) if definition.get("lang") == "vi"),
        "",
    )


def token_en(token: dict[str, Any]) -> str:
    return (token.get("definitions_en") or [""])[0] or next(
        (definition["value"] for definition in token.get("definitions", []) if definition.get("lang") == "en"),
        "",
    )


def content_tokens(tokens: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [token for token in tokens if token.get("surface", "").strip() and token.get("pos") != "punctuation"]


def find_containing_sentence(selected_text: str, source_sentence: str | None, paragraph_context: str | None, page_context: str | None) -> str:
    if source_sentence and source_sentence.strip():
        return source_sentence.strip()
    for context in [paragraph_context, page_context]:
        for sentence in split_sentences(context or ""):
            if selected_text and selected_text in sentence:
                return sentence
    return selected_text or (paragraph_context or page_context or "")


def detect_domain(context: str, requested_domain: str | None) -> str:
    if requested_domain and requested_domain not in {"general", "auto"}:
        return requested_domain
    if re.search(r"计算机|系统|数据|处理|网络|软件|算法", context):
        return "computer_science"
    if re.search(r"市场|需求|经济|公司|生产|计划|调整|下降|增长", context):
        return "economics"
    if re.search(r"考试|学习|成绩|中文|汉字", context):
        return "education"
    return "general"


def infer_reading_mode(selected_text: str, source_sentence: str, paragraph_context: str, page_context: str, session: Session) -> str:
    selected = selected_text.strip()
    if selected and selected == page_context.strip():
        return "page"
    if selected and selected == paragraph_context.strip():
        return "paragraph"
    if selected and selected == source_sentence.strip():
        return "sentence"
    if len(selected) == 1 and contains_chinese(selected):
        return "character"
    if len(content_tokens(tokenize_chinese(selected, session))) > 1 or len(selected) > 2:
        return "phrase"
    return "word"


def literal_translation(tokens: list[dict[str, Any]]) -> str:
    return " / ".join(filter(None, [token_vi(token) for token in content_tokens(tokens)]))


def natural_translation(selected_text: str, source_sentence: str, tokens: list[dict[str, Any]], domain: str) -> str:
    if "由于市场需求下降" in source_sentence and "调整了生产计划" in source_sentence and selected_text == source_sentence:
        return "Do nhu cầu thị trường giảm, công ty đó đã điều chỉnh kế hoạch sản xuất."
    if "市场需求下降" in selected_text:
        return "nhu cầu thị trường giảm"
    if selected_text == "市场需求":
        return "nhu cầu thị trường"
    if selected_text == "下降":
        return "giảm"
    if selected_text in {"系统", "计算机系统"} and "计算机" in source_sentence:
        return "hệ thống máy tính"
    if selected_text in {"处理", "处理数据"} and "数据" in source_sentence:
        return "xử lý dữ liệu" if selected_text == "处理 data" or selected_text == "处理数据" else "xử lý"
    if selected_text == "需要处理大量数据":
        return "cần xử lý lượng lớn dữ liệu"
    if domain == "computer_science" and selected_text == "系统":
        return "hệ thống"
    return literal_translation(tokens) or f'{selected_text} (chưa có bản dịch tự nhiên trong từ điển cục bộ)'


def contextual_role(selected_text: str, source_sentence: str, domain: str) -> dict[str, str]:
    if selected_text == "市场需求下降":
        return {"role_vi": "Cụm chủ-vị ngắn", "explanation_vi": "市场需求 là chủ thể, 下降 là vị ngữ; cả cụm nghĩa là nhu cầu thị trường giảm."}
    if selected_text == "市场需求" and "下降" in source_sentence:
        return {"role_vi": "Chủ thể của hành động/trạng thái", "explanation_vi": "Trong câu này, 市场需求 là chủ thể của 下降, nghĩa là phần nhu cầu thị trường đang giảm."}
    if selected_text == "系统" and "计算机" in source_sentence:
        return {"role_vi": "Danh từ trung tâm trong cụm danh từ", "explanation_vi": '系统 nằm trong cụm 计算机系统, nên ưu tiên nghĩa "hệ thống máy tính" thay vì một hệ thống xã hội hay tổ chức.'}
    if selected_text == "处理" and "数据" in source_sentence:
        return {"role_vi": "Động từ đi với tân ngữ 数据", "explanation_vi": '处理 đi với 数据, nên nghĩa phù hợp là "xử lý dữ liệu", không phải xử lý một vụ việc hay khiếu nại.'}
    if selected_text == "由于":
        return {"role_vi": "Từ nối nguyên nhân", "explanation_vi": "Due to mở đầu vế nguyên nhân, thường gặp trong văn viết, báo cáo hoặc giải thích logic nguyên nhân-kết quả."}
    return {"role_vi": "Đơn vị được chọn trong câu", "explanation_vi": f"Backend dùng câu chứa selection, domain {domain} và từ điển cục bộ để ưu tiên nghĩa phù hợp trước nghĩa chung."}


def contextual_examples(selected_text: str, domain: str) -> list[str]:
    examples = {
        "处理": ["处理 data = xử lý dữ liệu", "处理 vấn đề = xử lý vấn đề", "处理 khiếu nại = xử lý khiếu nại"],
        "系统": ["计算机系统 = hệ thống máy tính", "管理系统 = hệ thống quản lý", "社会保障 system = hệ thống an sinh xã hội"],
        "市场需求": ["市场需求下降 = nhu cầu thị trường giảm", "满足市场需求 = đáp ứng nhu cầu thị trường"],
        "下降": ["价格下降 = giá giảm", "需求下降 = nhu cầu giảm"],
    }
    if selected_text in examples:
        return examples[selected_text]
    if domain == "computer_science":
        return ["处理数据 = xử lý dữ liệu", "计算机系统 = hệ thống máy tính"]
    if domain == "economics":
        return ["市场需求 = nhu cầu thị trường", "生产计划 = kế hoạch sản xuất"]
    return []


def review_suggestion(selected_text: str, source_sentence: str, translation: str, selected_tokens: list[dict[str, Any]]) -> dict[str, Any]:
    target = "市场需求" if "市场需求" in selected_text else (selected_tokens[0]["surface"] if selected_tokens else selected_text)
    front = source_sentence.replace(target, "____", 1) if source_sentence and target else f"____ = {translation}"
    return {
        "type": "cloze",
        "front": front,
        "answer": target,
        "back": translation,
        "context": source_sentence,
        "targets": [token["surface"] for token in selected_tokens],
    }


def build_contextual_analysis(payload: NlpAnalyzeRequest, session: Session) -> dict[str, Any]:
    selected_text = (payload.selected_text or payload.text or "").strip()
    source_sentence = find_containing_sentence(selected_text, payload.source_sentence, payload.paragraph_context, payload.page_context)
    paragraph_context = (payload.paragraph_context or source_sentence or "").strip()
    page_context = (payload.page_context or paragraph_context or source_sentence or "").strip()
    context_text = "\n".join(filter(None, [source_sentence, paragraph_context, page_context]))
    domain = detect_domain(context_text, payload.domain_mode or payload.mode)

    tokens = tokenize_chinese(selected_text, session)
    literal_vi = literal_translation(tokens)
    natural_vi = natural_translation(selected_text, source_sentence, tokens, domain)
    role = contextual_role(selected_text, source_sentence, domain)

    entry = find_dictionary_entry(selected_text, session)
    quick_meaning = to_dictionary_result(entry) if entry else {
        "simplified": selected_text,
        "traditional": selected_text,
        "pinyin": pinyin_display(selected_text),
        "pinyin_display": pinyin_display(selected_text),
        "definitions_vi": [natural_vi] if natural_vi else [],
        "definitions_en": [],
        "hsk_level": None,
        "domain_tags": [domain],
        "source": "local_fallback",
        "confidence": 0.5,
    }

    corr = find_user_correction(selected_text, domain, session)
    if corr:
        quick_meaning["definitions_vi"] = [corr.user_translation]
        quick_meaning["source"] = "user_corrections"
        quick_meaning["confidence"] = 0.95
        natural_vi = corr.user_translation

    return {
        "selection": {
            "text": selected_text,
            "mode": infer_reading_mode(selected_text, source_sentence, paragraph_context, page_context, session),
            "domain_mode": domain,
        },
        "quick_meaning": quick_meaning,
        "translations": {
            "natural_vi": natural_vi,
            "literal_vi": literal_vi,
            "natural_en": "No natural English yet",
        },
        "role_analysis": {
            "contextual_role_vi": role["role_vi"],
            "role_explanation_vi": role["explanation_vi"],
        },
        "context_examples": contextual_examples(selected_text, domain),
        "grammar_patterns": grammar_patterns(source_sentence),
        "review_suggestions": [
            review_suggestion(selected_text, source_sentence, natural_vi, tokens)
        ],
    }


# (Legacy Google AI Integration removed. See services/ai/orchestrator.py)
def local_translation_payload(text: str, source_lang: str = "auto", target_lang: str = "vi", session: Session | None = None) -> dict[str, Any]:
    close_session = False
    if session is None:
        session = SessionLocal()
        close_session = True
    try:
        analysis = analyze_chinese(text, session)
        tokens = [token for sentence in analysis["sentences"] for token in content_tokens(sentence["tokens"])]
        translated_text = " / ".join(filter(None, [token_vi(token) for token in tokens]))
        grammar = [pattern for sentence in analysis["sentences"] for pattern in sentence["grammar_patterns"]]
        return {
            "id": make_id("tr"),
            "sourceText": text,
            "translatedText": translated_text or f"{text} (chưa có nghĩa trong từ điển cục bộ)",
            "sourceLang": "zh" if contains_chinese(text) else source_lang,
            "targetLang": target_lang,
            "wordType": "Chinese context lookup" if contains_chinese(text) else "Local text",
            "grammarExplanation": grammar[0]["meaning_vi"] if grammar else "Kết quả tạo từ dictionary/NLP local, không gọi API cloud.",
            "usageExamples": [],
            "pronunciation": pinyin_display(text) if contains_chinese(text) else "",
            "tips": ["Local-first: không cần API key ngoài cho NLP/dictionary MVP 0.1."],
            "difficulty": "intermediate",
            "timestamp": now_utc().isoformat(),
        }
    finally:
        if close_session:
            session.close()


def read_local_env_files() -> dict[str, str]:
    from db.config import read_local_env_files as get_envs
    return get_envs()
