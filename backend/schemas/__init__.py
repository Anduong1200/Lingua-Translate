from __future__ import annotations

from typing import Any, Literal
from pydantic import BaseModel, Field

class NlpAnalyzeRequest(BaseModel):
    text: str | None = None
    selected_text: str | None = None
    source_sentence: str | None = None
    paragraph_context: str | None = None
    page_context: str | None = None
    mode: str | None = "auto"
    domain_mode: str | None = "auto"
    user_level: str | None = None
    ai_enabled: bool = False


class AIContextRequest(NlpAnalyzeRequest):
    model: str | None = None
    temperature: float = Field(default=0.2, ge=0, le=2)


class AIChatRequest(NlpAnalyzeRequest):
    chat_history: list[dict[str, str]] | None = None
    question: str | None = None
    model: str | None = None
    temperature: float = Field(default=0.5, ge=0, le=2)


class TextRequest(BaseModel):
    text: str


class DictionaryImportRequest(BaseModel):
    file_path: str
    source: str = "cc-cedict"


class CustomDictionaryRequest(BaseModel):
    simplified: str
    traditional: str | None = None
    pinyin: str | None = None
    definition_vi: str
    definition_en: str | None = ""
    domain: str = "general"
    note: str = ""


class DocumentCreateRequest(BaseModel):
    title: str
    file_name: str = ""
    source_type: str = "pdf"
    language: str = "zh-CN"
    content: str = ""


class PageCreateRequest(BaseModel):
    page_number: int
    text: str = ""
    width: float | None = None
    height: float | None = None


class AnnotationCreateRequest(BaseModel):
    id: str | None = None
    document_id: str
    page_id: str = "page-1"
    page_number: int | None = None
    sentence_id: str | None = None
    selected_text: str
    source_sentence: str = ""
    selection_start: int = 0
    selection_end: int = 0
    bbox_json: str | None = None
    annotation_type: Literal["word", "phrase", "sentence"] | str = "word"
    note: str | None = ""
    explanation_vi: str | None = ""
    selected_meaning_vi: str | None = ""
    analysis_json: str | dict[str, Any] | None = None
    pinyin: str | None = ""
    hsk_level: int | None = None
    domain_tag: str | None = None


class ReviewItemCreateRequest(BaseModel):
    annotation_id: str | None = None
    item_type: str = "flashcard"
    source_type: str | None = None
    front: str | None = None
    back: str | None = None
    context: str | None = None
    source_sentence: str | None = None
    pinyin: str | None = None
    hsk_level: int | None = None
    domain_tag: str | None = None


class ReviewEventCreateRequest(BaseModel):
    review_item_id: str
    rating: int | str
    response_time_ms: int = 0


class TranslateRequest(BaseModel):
    text: str
    sourceLang: str = "auto"
    targetLang: str = "vi"


class ContextTranslateRequest(NlpAnalyzeRequest):
    scope: Literal["sentence", "paragraph", "context"] = "sentence"


class QuizGenerateRequest(NlpAnalyzeRequest):
    limit: int = Field(6, ge=1, le=20)


class UserCorrectionCreateRequest(BaseModel):
    original_term: str
    system_translation: str = ""
    user_translation: str
    context: str = ""
    domain: str = "general"


class KnownWordCreateRequest(BaseModel):
    word: str
    confidence: float = Field(0.5, ge=0, le=1)


class VocabularyUpsertRequest(BaseModel):
    word: str
    translation: str = ""
    pinyin: str = ""
    context: str = ""
    source_file: str = ""
    source_document_id: str = ""
    hsk_level: int | None = None
    domain_tags: list[str] = Field(default_factory=list)
    topic: str = "general"


class VocabularyPatchRequest(BaseModel):
    translation: str | None = None
    topic: str | None = None
    favorite: bool | None = None
    learned: bool | None = None


class BackupRestoreRequest(BaseModel):
    file_name: str


class AutoReviewCreateRequest(BaseModel):
    limit: int = Field(20, ge=1, le=100)
    min_frequency: int = Field(1, ge=1, le=50)
