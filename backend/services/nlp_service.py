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


def split_paragraphs(text: str) -> list[str]:
    cleaned = (text or "").replace("\r", "").strip()
    if not cleaned:
        return []
    paragraphs = [paragraph.strip() for paragraph in re.split(r"\n{2,}", cleaned) if paragraph.strip()]
    return paragraphs or [cleaned]


def grammar_patterns(sentence: str) -> list[dict[str, Any]]:
    patterns: list[dict[str, Any]] = []
    if "虽然" in sentence and "满足" not in sentence and "调整" not in sentence and "但是" in sentence:
        patterns.append({"pattern": "虽然...但是...", "meaning_vi": "mặc dù... nhưng..., nêu quan hệ nhượng bộ rồi chuyển ý", "confidence": 0.9})
    elif "虽然" in sentence:
        patterns.append({"pattern": "虽然...", "meaning_vi": "mặc dù..., giới thiệu vế nhượng bộ", "confidence": 0.8})
    
    if "由于" in sentence:
        patterns.append({"pattern": "Due to / Bởi vì / Do", "meaning_vi": "do/vì, thường dùng trong văn viết, báo cáo hoặc giải thích nguyên nhân", "confidence": 0.84})
    if "无论" in sentence and "还是" in sentence and "都" in sentence:
        patterns.append({"pattern": "无论...还是...都...", "meaning_vi": "dù là... hay là... thì đều..., dùng để bao quát nhiều trường hợp rồi đưa ra kết luận chung", "confidence": 0.88})
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
    # First try Vietnamese
    vi_def = (token.get("definitions_vi") or [""])[0] or next(
        (definition["value"] for definition in token.get("definitions", []) if definition.get("lang") == "vi"),
        "",
    )
    if vi_def:
        return vi_def
    
    # Fallback to English
    en_def = (token.get("definitions_en") or [""])[0] or next(
        (definition["value"] for definition in token.get("definitions", []) if definition.get("lang") == "en"),
        "",
    )
    return en_def

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


def translation_unit(text: str, session: Session, source_sentence: str | None = None, domain_mode: str | None = "auto") -> dict[str, Any]:
    source = (text or "").strip()
    if not source:
        return {
            "source": "",
            "dictionary_vi": "",
            "ai_natural_vi": None,
            "natural_vi": None,
            "literal_vi": "",
            "pinyin": "",
            "domain": "general",
            "grammar_patterns": [],
        }

    context = "\n".join(filter(None, [source_sentence or "", source]))
    domain = detect_domain(context, domain_mode)
    tokens = tokenize_chinese(source, session)
    return {
        "source": source,
        "dictionary_vi": dictionary_translation(source, source_sentence or source, tokens, domain),
        "ai_natural_vi": None,
        "natural_vi": None,
        "literal_vi": literal_translation(tokens),
        "pinyin": pinyin_display(source),
        "domain": domain,
        "grammar_patterns": grammar_patterns(source_sentence or source),
    }


def translate_paragraph(paragraph: str, session: Session, domain_mode: str | None = "auto") -> dict[str, Any]:
    sentences = split_sentences(paragraph)
    translated_sentences = [
        translation_unit(sentence, session, source_sentence=sentence, domain_mode=domain_mode)
        for sentence in sentences
    ]
    return {
        "source": paragraph.strip(),
        "dictionary_vi": " ".join(item.get("dictionary_vi", "") for item in translated_sentences if item.get("dictionary_vi")).strip(),
        "ai_natural_vi": None,
        "natural_vi": None,
        "literal_vi": " / ".join(item["literal_vi"] for item in translated_sentences if item["literal_vi"]).strip(),
        "sentences": translated_sentences,
    }


def paragraph_for_selection(selected_text: str, paragraph_context: str | None, page_context: str | None, source_sentence: str) -> str:
    selected = (selected_text or "").strip()
    if paragraph_context and paragraph_context.strip():
        return paragraph_context.strip()
    for paragraph in split_paragraphs(page_context or ""):
        if selected and selected in paragraph:
            return paragraph
        if source_sentence and source_sentence in paragraph:
            return paragraph
    return source_sentence or selected


def dictionary_translation(selected_text: str, source_sentence: str, tokens: list[dict[str, Any]], domain: str) -> str:
    # In a real environment, this should either call an LLM (Gemini) or rely on the dictionary.
    # Since we are operating locally without mock strings, we just use the dictionary's literal translation.
    return literal_translation(tokens) or f'{selected_text} (chưa có bản dịch tự nhiên trong từ điển cục bộ)'


def contextual_role(selected_text: str, source_sentence: str, domain: str) -> dict[str, str]:
    # Removed mock contextual roles. In a fully real environment, this is either parsed by LLM
    # or returned generically.
    return {"role_vi": "Đơn vị được chọn trong câu", "explanation_vi": f"Backend dùng câu chứa selection, domain {domain} và từ điển cục bộ để ưu tiên nghĩa phù hợp trước nghĩa chung."}


def contextual_examples(selected_text: str, domain: str) -> list[str]:
    # Removed mock contextual examples.
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
    dictionary_vi = dictionary_translation(selected_text, source_sentence, tokens, domain)
    role = contextual_role(selected_text, source_sentence, domain)

    entry = find_dictionary_entry(selected_text, session)
    quick_meaning = to_dictionary_result(entry) if entry else {
        "simplified": selected_text,
        "traditional": selected_text,
        "pinyin": pinyin_display(selected_text),
        "pinyin_display": pinyin_display(selected_text),
        "definitions_vi": [dictionary_vi] if dictionary_vi else [],
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
        dictionary_vi = corr.user_translation

    return {
        "status": "dictionary_fallback_only",
        "selection": {
            "text": selected_text,
            "selected_text": selected_text,
            "source_sentence": source_sentence,
            "mode": infer_reading_mode(selected_text, source_sentence, paragraph_context, page_context, session),
            "domain_mode": domain,
        },
        "quick_meaning": quick_meaning,
        "translations": {
            "literal_vi": literal_vi,
            "dictionary_vi": dictionary_vi,
            "ai_natural_vi": None,
            "natural_vi": None,
            "natural_en": "No natural English yet",
        },
        "role_analysis": {
            "contextual_role_vi": role["role_vi"],
            "role_explanation_vi": role["explanation_vi"],
        },
        "context": {
            "domain": domain,
            "source_sentence": source_sentence,
            "role_vi": role["role_vi"],
            "explanation_vi": role["explanation_vi"],
            "confidence": quick_meaning.get("confidence", 0.5),
        },
        "grammar": {
            "patterns": grammar_patterns(source_sentence),
            "explanation_vi": "; ".join(pattern["meaning_vi"] for pattern in grammar_patterns(source_sentence)) or role["explanation_vi"],
        },
        "context_examples": contextual_examples(selected_text, domain),
        "grammar_patterns": grammar_patterns(source_sentence),
        "review_suggestions": [
            review_suggestion(selected_text, source_sentence, dictionary_vi, tokens)
        ],
    }


def translate_context_payload(payload: NlpAnalyzeRequest, session: Session) -> dict[str, Any]:
    selected_text = (payload.selected_text or payload.text or "").strip()
    source_sentence = find_containing_sentence(selected_text, payload.source_sentence, payload.paragraph_context, payload.page_context)
    paragraph_context = paragraph_for_selection(selected_text, payload.paragraph_context, payload.page_context, source_sentence)
    page_context = (payload.page_context or paragraph_context or source_sentence or selected_text).strip()
    context_text = "\n".join(filter(None, [selected_text, source_sentence, paragraph_context]))
    domain = detect_domain(context_text, payload.domain_mode or payload.mode)
    contextual = build_contextual_analysis(
        NlpAnalyzeRequest(
            selected_text=selected_text or source_sentence,
            source_sentence=source_sentence,
            paragraph_context=paragraph_context,
            page_context=page_context,
            domain_mode=domain,
            user_level=payload.user_level,
        ),
        session,
    )

    sentence = translation_unit(source_sentence, session, source_sentence=source_sentence, domain_mode=domain)
    paragraph = translate_paragraph(paragraph_context, session, domain_mode=domain)
    selection = translation_unit(selected_text or source_sentence, session, source_sentence=source_sentence, domain_mode=domain)

    return {
        "mode": "backend_nlp_context_translate",
        "domain": domain,
        "selection": selection,
        "sentence": sentence,
        "paragraph": paragraph,
        "context": contextual["context"],
        "grammar": contextual["grammar"],
        "context_examples": contextual["context_examples"],
        "review_suggestions": contextual["review_suggestions"],
    }


def unique_options(options: list[str], correct: str, limit: int = 4) -> list[str]:
    rows: list[str] = []
    for option in [correct, *options]:
        clean = (option or "").strip()
        if clean and clean not in rows:
            rows.append(clean)
        if len(rows) >= limit:
            break
    while len(rows) < limit:
        rows.append(f"Gợi ý khác {len(rows)}")
    return rows


def rotate_answer(options: list[str], index: int) -> tuple[list[str], int]:
    answer_index = index % len(options)
    rotated = options[:]
    rotated[0], rotated[answer_index] = rotated[answer_index], rotated[0]
    return rotated, answer_index


def generate_quiz_payload(payload: NlpAnalyzeRequest, session: Session, limit: int = 6) -> dict[str, Any]:
    text = (payload.page_context or payload.paragraph_context or payload.source_sentence or payload.text or payload.selected_text or "").strip()
    if not text:
        return {"mode": "backend_nlp_quiz", "source": "", "questions": []}

    analysis = analyze_chinese(text, session)
    sentence_units = [
        translation_unit(sentence["text"], session, source_sentence=sentence["text"], domain_mode=payload.domain_mode or payload.mode)
        for sentence in analysis["sentences"]
    ]
    rows: list[dict[str, Any]] = []
    for sentence in analysis["sentences"]:
        for token in content_tokens(sentence["tokens"]):
            meaning = token_vi(token)
            if not meaning or "No local dictionary" in meaning:
                continue
            rows.append({
                "surface": token["surface"],
                "pinyin": token.get("pinyin", ""),
                "meaning": meaning,
                "sentence": sentence["text"],
            })

    deduped_rows = list({row["surface"]: row for row in rows}.values())
    meaning_options = [row["meaning"] for row in deduped_rows]
    pinyin_options = [row["pinyin"] for row in deduped_rows if row["pinyin"]]
    questions: list[dict[str, Any]] = []

    for row in deduped_rows:
        if len(questions) >= limit:
            break
        options, answer_index = rotate_answer(unique_options([item for item in meaning_options if item != row["meaning"]], row["meaning"]), len(questions))
        questions.append({
            "type": "meaning",
            "question": f'Trong câu "{row["sentence"]}", nghĩa phù hợp của "{row["surface"]}" là gì?',
            "options": options,
            "answerIndex": answer_index,
            "explanation": f'{row["surface"]} ({row["pinyin"]}) = {row["meaning"]}',
            "source_sentence": row["sentence"],
            "target": row["surface"],
        })

        if row["pinyin"] and len(questions) < limit:
            options, answer_index = rotate_answer(unique_options([item for item in pinyin_options if item != row["pinyin"]], row["pinyin"]), len(questions))
            questions.append({
                "type": "pinyin",
                "question": f'Pinyin của "{row["surface"]}" là gì?',
                "options": options,
                "answerIndex": answer_index,
                "explanation": f'{row["surface"]} đọc là {row["pinyin"]}.',
                "source_sentence": row["sentence"],
                "target": row["surface"],
            })

    for unit in sentence_units:
        if len(questions) >= limit:
            break
        for pattern in unit["grammar_patterns"]:
            options, answer_index = rotate_answer(
                unique_options(
                    [
                        "vì... nên..., nêu nguyên nhân rồi kết quả",
                        "mặc dù... nhưng..., nêu quan hệ nhượng bộ",
                        "cần/cần phải làm gì đó",
                    ],
                    pattern["meaning_vi"],
                ),
                len(questions),
            )
            questions.append({
                "type": "grammar",
                "question": f'Cấu trúc "{pattern["pattern"]}" trong câu này diễn tả ý gì?',
                "options": options,
                "answerIndex": answer_index,
                "explanation": pattern["meaning_vi"],
                "source_sentence": unit["source"],
                "target": pattern["pattern"],
            })
            break

    for unit in sentence_units:
        if len(questions) >= limit:
            break
        if not unit.get("dictionary_vi") and not unit.get("natural_vi"):
            continue
        valid_vi = unit.get("dictionary_vi") or unit.get("natural_vi")
        options, answer_index = rotate_answer(
            unique_options([other.get("dictionary_vi") or other.get("natural_vi") for other in sentence_units if (other.get("dictionary_vi") or other.get("natural_vi")) != valid_vi], valid_vi),
            len(questions),
        )
        questions.append({
            "type": "translation",
            "question": f'Bản dịch phù hợp của câu "{unit["source"]}" là gì?',
            "options": options,
            "answerIndex": answer_index,
            "explanation": unit["literal_vi"] or valid_vi,
            "source_sentence": unit["source"],
            "target": unit["source"],
        })

    return {
        "mode": "backend_nlp_quiz",
        "source": text,
        "question_count": len(questions[:limit]),
        "questions": questions[:limit],
    }


# (Legacy Google AI Integration removed. See services/ai/orchestrator.py)
def local_translation_payload(text: str, source_lang: str = "auto", target_lang: str = "vi", session: Session | None = None) -> dict[str, Any]:
    close_session = False
    if session is None:
        session = SessionLocal()
        close_session = True
    try:
        analysis = analyze_chinese(text, session)
        sentence_translations: list[str] = []
        literal_parts: list[str] = []
        for sentence in analysis["sentences"]:
            sentence_text = sentence["text"]
            tokens = content_tokens(sentence["tokens"])
            literal = literal_translation(tokens)
            domain = detect_domain(sentence_text, "auto")
            dictionary_vi = dictionary_translation(sentence_text, sentence_text, tokens, domain)
            sentence_translations.append(dictionary_vi or literal)
            if literal:
                literal_parts.append(literal)
        translated_text = " ".join(filter(None, sentence_translations)).strip() or " / ".join(literal_parts).strip()
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
