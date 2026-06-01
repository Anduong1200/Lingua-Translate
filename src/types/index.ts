export interface TranslationResult {
    id: string
    sourceText: string
    translatedText: string
    sourceLang: string
    targetLang: string
    wordType?: string
    grammarExplanation?: string
    usageExamples?: UsageExample[]
    pronunciation?: string
    tips?: string[]
    difficulty?: DifficultyLevel
    timestamp: Date
    isFavorite?: boolean
}

export interface UsageExample {
    original: string
    translation: string
}

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced' | 'native'

export interface SavedWord {
    id: string
    word: string
    translation: string
    language: string
    context?: string
    notes?: string
    pinyin?: string
    hskLevel?: number | null
    pos?: string | null
    domainTags?: string[]
    examples?: string[]
    sourceFile?: string
    sourceDocumentId?: string
    topic?: string
    lookupCount?: number
    isFavorite?: boolean
    learned: boolean
    createdAt: Date
    updatedAt?: Date
}

export interface DocumentContent {
    id: string
    title: string
    type: 'txt' | 'pdf' | 'docx'
    content: string
    sourceUrl?: string
    sourceFileName?: string
    sentences: Sentence[]
    uploadedAt: Date
    readingProgress: number
    highlights: Highlight[]
    notes: Note[]
}

export interface Sentence {
    id: string
    text: string
    index: number
    translation?: string
    isHighlighted: boolean
    notes?: string
}

export interface Highlight {
    id: string
    sentenceId: string
    color: string
    createdAt: Date
}

export interface Note {
    id: string
    sentenceId: string
    text: string
    createdAt: Date
}

export interface FlashCard {
    id: string
    front: string
    back: string
    example?: string
    difficulty: DifficultyLevel
    reviewed: boolean
    createdAt: Date
    nextReview?: Date
    pinyin?: string
    sourceSentence?: string
    hskLevel?: number | null
}

export interface LearningProgress {
    wordsLearned: number
    streak: number
    totalTranslations: number
    savedWords: number
    dailyGoal: number
    todayProgress: number
}

export interface TranslationHistory {
    id: string
    sourceText: string
    translatedText: string
    sourceLang: string
    targetLang: string
    timestamp: Date
}

export interface AppSettings {
    theme: 'light' | 'dark'
    targetLanguage: string
    sourceLanguage: string
    autoDetect: boolean
    showPronunciation: boolean
    showGrammar: boolean
    showExamples: boolean
    dailyGoal: number
    fontSize: 'small' | 'medium' | 'large'
    autoSave: boolean
    offlineCache: boolean
    domainMode?: 'general' | 'economics' | 'computer_science' | 'education' | 'auto'
    targetHskLevel?: string
    showPinyinMode?: 'always' | 'unknown_only' | 'never'
    translationStyle?: 'natural' | 'literal' | 'both'
    desiredRetention?: number
    learningSteps?: string
    hasCompletedOnboarding?: boolean
}

export interface ChineseDefinition {
    lang: 'vi' | 'en'
    value: string
    source: string
    confidence: number
}

export interface ChineseToken {
    surface: string
    normalized?: string
    pinyin: string
    pos?: string | null
    hsk_level?: number | null
    definitions_vi?: string[]
    definitions_en?: string[]
    definitions: ChineseDefinition[]
    domain_tags?: string[]
    examples?: string[]
    confidence?: number
}

export interface ChineseGrammarPattern {
    pattern: string
    meaning_vi: string
    confidence: number
}

export interface DocumentTranslationSentence {
    sentence_id: string
    index: number
    source: string
    natural_vi: string
    literal_vi: string
    pinyin: string
    domain: string
    grammar_patterns: ChineseGrammarPattern[]
}

export interface DocumentTranslationResult {
    document_id: string
    title: string
    mode: 'local_rule_based' | string
    translations: DocumentTranslationSentence[]
}

export interface VocabularySuggestion {
    surface: string
    pinyin: string
    definition_vi: string
    definition_en: string
    hsk_level?: number | null
    domain_tags: string[]
    frequency: number
    source_sentence: string
    score: number
}

export interface ChineseSentenceAnalysis {
    text: string
    tokens: ChineseToken[]
    grammar_patterns: ChineseGrammarPattern[]
}

export interface ChineseAnalysis {
    text: string
    sentences: ChineseSentenceAnalysis[]
    selection?: ContextualSelection
    quick_meaning?: ContextualQuickMeaning
    translations?: ContextualTranslations
    context?: ContextualContext
    grammar?: ContextualGrammar
    examples?: string[]
    review_suggestion?: ContextualReviewSuggestion
    personalization?: ContextualPersonalization
    ai_context?: AIContextPayload
}

export type ReadingMode = 'character' | 'word' | 'phrase' | 'sentence' | 'paragraph' | 'page'

export interface ContextualSelection {
    selected_text: string
    source_sentence: string
    paragraph_context: string
    page_context: string
    domain_mode: string
    user_level: string
    analysis_mode: ReadingMode
}

export interface ContextualQuickMeaning {
    surface: string
    pinyin: string
    definitions_vi: string[]
    definitions_en: string[]
    hsk_level?: number | null
    domain_tags: string[]
    confidence: number
}

export interface ContextualTranslations {
    natural_vi: string
    literal_vi: string
}

export interface ContextualContext {
    domain: string
    role_vi: string
    explanation_vi: string
    confidence: number
}

export interface ContextualGrammar {
    patterns: ChineseGrammarPattern[]
    explanation_vi: string
}

export interface ContextualReviewSuggestion {
    type: 'cloze' | 'flashcard'
    front: string
    answer: string
    back: string
    context: string
    targets: string[]
}

export interface ContextualPersonalization {
    applied_correction: boolean
    correction_id?: string | null
    user_level: string
}

export interface AIGrammarNote {
    pattern: string
    meaning_vi: string
    evidence?: string
}

export interface AIReviewSuggestion {
    type: 'cloze' | 'flashcard'
    front: string
    back: string
    reason_vi?: string
}

export interface AIContextStructuredResponse {
    natural_vi?: string
    literal_vi?: string
    context_explanation_vi?: string
    grammar_notes?: AIGrammarNote[]
    nuance_vi?: string
    domain?: string
    review_suggestions?: AIReviewSuggestion[]
    personalization?: {
        level_adjustment_vi?: string
        show_pinyin?: boolean
    }
    confidence?: number
    raw_text?: string
}

export interface AIContextPayload {
    enabled: boolean
    provider: string
    model: string
    status: 'ok' | 'missing_api_key' | 'all_keys_failed' | string
    key_index?: number
    key_fingerprint?: string
    response?: AIContextStructuredResponse
    usage?: Record<string, unknown>
    message?: string
    errors?: Array<{ key_index: number; status_code: number; message: string }>
}

export interface AIContextReadingResult {
    rule_based: ChineseAnalysis
    ai: AIContextPayload
}

export interface AnnotationRecord {
    id: string
    document_id: string
    page_id: string
    page_number?: number | null
    sentence_id?: string
    selected_text: string
    selection_start: number
    selection_end: number
    bbox_json?: string
    annotation_type?: 'word' | 'phrase' | 'sentence'
    note?: string
    explanation_vi?: string
    selected_meaning_vi?: string
    analysis_json?: string
    source_sentence?: string
    pinyin?: string
    hsk_level?: number | null
    domain_tag?: string
    created_at: string
}

export interface ReviewItem {
    id: string
    annotation_id: string
    item_type: 'flashcard' | 'cloze'
    source_type: 'word' | 'phrase' | 'grammar' | 'sentence' | 'auto_vocabulary' | string
    front: string
    back: string
    context?: string
    source_sentence?: string
    pinyin?: string
    hsk_level?: number | null
    domain_tag?: string
    due_at: string
    interval_days: number
    ease: number
    reviewed?: boolean
    created_at: string
}

export interface UserCorrection {
    id: string
    original_term: string
    system_translation: string
    user_translation: string
    context: string
    domain: string
    created_at: string
}

export interface KnownWord {
    id: string
    word: string
    confidence: number
    last_seen: string
    times_seen: number
    times_looked_up: number
    created_at: string
}

export interface VocabularyItem {
    id: string
    word: string
    translation: string
    pinyin: string
    context: string
    source_file: string
    source_document_id: string
    hsk_level?: number | null
    domain_tags: string[]
    topic: string
    favorite: boolean
    learned: boolean
    lookup_count: number
    created_at: string
    updated_at: string
}
