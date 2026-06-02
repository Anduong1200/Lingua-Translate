import type { StateCreator } from 'zustand'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import {
    AnnotationRecord,
    AppSettings,
    AIContextPayload,
    AIContextReadingResult,
    ChineseAnalysis,
    ChineseToken,
    DocumentContent,
    DocumentTranslationSentence,
    DocumentTranslationResult,
    FlashCard,
    KnownWord,
    LearningProgress,
    ReviewItem,
    SavedWord,
    TranslationHistory,
    TranslationResult,
    UserCorrection,
    VocabularyItem,
    VocabularySuggestion,
} from '@/types'
import { generateId } from '@/lib/utils'

// ─── Input types ──────────────────────────────────────────────────────────────

export type ReaderAnnotationInput = {
    token: ChineseToken
    sentenceText: string
    note?: string
    documentId?: string
    pageId?: string
    pageNumber?: number
    bboxJson?: string
    sentenceId?: string
}

export type UserCorrectionInput = {
    original_term: string
    system_translation?: string
    user_translation: string
    context?: string
    domain?: string
}

export type VocabularyLookupInput = {
    word: string
    translation?: string
    pinyin?: string
    context?: string
    source_file?: string
    source_document_id?: string
    hsk_level?: number | null
    domain_tags?: string[]
    topic?: string
}

export type AnalyzeChineseInput =
    | string
    | {
          text?: string
          selected_text?: string
          source_sentence?: string
          paragraph_context?: string
          page_context?: string
          domain_mode?: string
          user_level?: string
          ai_enabled?: boolean
      }

export type AnalyzeChinesePayload = {
    text: string
    mode?: string
    selected_text?: string
    source_sentence?: string
    paragraph_context?: string
    page_context?: string
    domain_mode?: string
    user_level?: string
    ai_enabled?: boolean
}

// ─── Slice interfaces ─────────────────────────────────────────────────────────

export interface TranslationSlice {
    currentTranslation: TranslationResult | null
    translationHistory: TranslationHistory[]
    isTranslating: boolean
    floatingPopup: { visible: boolean; x: number; y: number; text: string }
    translationCache: Record<string, TranslationResult>
    setFloatingPopup: (popup: { visible: boolean; x: number; y: number; text: string }) => void
    translateText: (text: string, sourceLang?: string, targetLang?: string) => Promise<void>
}

export interface AnalysisSlice {
    chineseAnalysis: ChineseAnalysis | null
    contextualAnalysis: ChineseAnalysis | null
    aiContext: AIContextPayload | null
    isAnalyzing: boolean
    isGeneratingAIContext: boolean
    analyzeChineseText: (input: AnalyzeChineseInput) => Promise<ChineseAnalysis>
    generateAIContextReading: (input: Exclude<AnalyzeChineseInput, string>) => Promise<AIContextReadingResult | null>
}

export interface AnnotationSlice {
    annotations: AnnotationRecord[]
    reviewItems: ReviewItem[]
    userCorrections: UserCorrection[]
    knownWords: KnownWord[]
    savedWords: SavedWord[]
    flashCards: FlashCard[]
    learningProgress: LearningProgress
    saveChineseAnnotation: (input: ReaderAnnotationInput) => Promise<AnnotationRecord>
    saveUserCorrection: (input: UserCorrectionInput) => Promise<void>
    recordLookupWord: (input: VocabularyLookupInput) => Promise<void>
    markKnownWord: (word: string, confidence?: number) => Promise<void>
    submitReview: (reviewItemId: string, rating: number, responseTimeMs?: number) => Promise<void>
    saveWord: (word: SavedWord) => void
    removeSavedWord: (id: string) => void
    toggleFavorite: (id: string) => void
    markSavedWordLearned: (id: string, learned: boolean) => void
    addFlashCard: (card: FlashCard) => void
    updateLearningProgress: (progress: Partial<LearningProgress>) => void
}

export interface DocumentSlice {
    documents: DocumentContent[]
    currentDocument: DocumentContent | null
    isTranslatingFile: boolean
    documentTranslations: Record<string, DocumentTranslationSentence[]>
    vocabularySuggestions: VocabularySuggestion[]
    isTranslatingDocument: boolean
    isScanningVocabulary: boolean
    isHydrating: boolean
    hydrateFromBackend: () => Promise<void>
    translateCurrentDocument: (documentId: string) => Promise<DocumentTranslationSentence[]>
    scanDocumentVocabulary: (documentId: string, limit?: number) => Promise<VocabularySuggestion[]>
    createAutoReviewItems: (documentId: string, limit?: number) => Promise<number>
    addDocument: (doc: DocumentContent) => void
    deleteDocument: (id: string) => Promise<void>
    setCurrentDocument: (doc: DocumentContent | null) => void
    updateReadingProgress: (docId: string, progress: number) => void
    translateFile: (file: File, targetLang?: string) => Promise<DocumentContent | null>
}

export interface SettingsSlice {
    settings: AppSettings
    isDarkMode: boolean
    isSideBySide: boolean
    toggleDarkMode: () => void
    toggleSideBySide: () => void
    updateSettings: (settings: Partial<AppSettings>) => void
}

// ─── Composite state ──────────────────────────────────────────────────────────

export type AppState = TranslationSlice & AnalysisSlice & AnnotationSlice & DocumentSlice & SettingsSlice

export type SliceCreator<T> = StateCreator<AppState, [], [], T>

// ─── Constants ────────────────────────────────────────────────────────────────

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://127.0.0.1:3001/api'

export const defaultSettings: AppSettings = {
    theme: 'light',
    targetLanguage: 'vi',
    sourceLanguage: 'zh',
    autoDetect: true,
    showPronunciation: true,
    showGrammar: true,
    showExamples: true,
    dailyGoal: 10,
    fontSize: 'medium',
    autoSave: true,
    offlineCache: true,
    domainMode: 'auto',
    targetHskLevel: 'HSK4',
    showPinyinMode: 'always',
    translationStyle: 'both',
    desiredRetention: 0.90,
    learningSteps: '1m 5m 15m',
    hasCompletedOnboarding: false,
}

export { pdfWorkerUrl }

// ─── Helper functions ─────────────────────────────────────────────────────────

export function toStoredDate(value: unknown): Date {
    if (value instanceof Date) return value
    if (typeof value === 'string') return new Date(value)
    return new Date()
}

export async function postJson<T>(url: string, body: unknown): Promise<T> {
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    })

    if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`)
    }

    return response.json() as Promise<T>
}

export async function getJson<T>(url: string): Promise<T> {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Request failed: ${response.status}`)
    return response.json() as Promise<T>
}

export function apiAssetUrl(fileUrl?: string) {
    if (!fileUrl) return undefined
    if (/^https?:\/\//.test(fileUrl)) return fileUrl
    return `${API_BASE_URL.replace(/\/api$/, '')}${fileUrl}`
}

export function fileNameToDocumentType(fileName: string): DocumentContent['type'] {
    const ext = fileName.split('.').pop()?.toLowerCase() || 'txt'
    return ext === 'pdf' ? 'pdf' : ext === 'docx' ? 'docx' : 'txt'
}

export function splitDocumentSentences(text: string, docId: string) {
    return text
        .replace(/\r/g, '')
        .split(/(?<=[。！？.!?])\s*|\n+/)
        .map((sentence) => sentence.trim())
        .filter(Boolean)
        .map((text, index) => ({
            id: `${docId}-sentence-${index + 1}`,
            text,
            index,
            isHighlighted: false,
        }))
}

export function syncLearningState(partial: Pick<AppState, 'savedWords' | 'documents' | 'annotations' | 'reviewItems' | 'flashCards'>) {
    void partial
    // Backend SQLite is the source of truth for learning data.
}

export function normalizeDocumentFromApi(item: any): DocumentContent {
    const id = String(item.id || item.document_id || generateId())
    const content = String(item.content || '')
    const sourceType = String(item.source_type || item.type || 'txt').toLowerCase()
    const type = sourceType.includes('pdf') ? 'pdf' : sourceType.includes('docx') ? 'docx' : 'txt'
    return {
        id,
        title: item.title || item.file_name || 'Untitled document',
        type,
        content,
        sourceUrl: apiAssetUrl(item.file_url),
        sourceFileName: item.file_name || item.original_filename,
        sentences: splitDocumentSentences(content, id),
        uploadedAt: toStoredDate(item.created_at),
        readingProgress: 0,
        highlights: [],
        notes: [],
    }
}

export function savedWordFromAnnotation(annotation: AnnotationRecord): SavedWord {
    return {
        id: annotation.id,
        word: annotation.selected_text,
        translation: annotation.explanation_vi || annotation.selected_meaning_vi || '',
        language: 'zh',
        context: annotation.source_sentence,
        notes: annotation.note,
        pinyin: annotation.pinyin,
        hskLevel: annotation.hsk_level ?? null,
        domainTags: annotation.domain_tag ? [annotation.domain_tag] : [],
        sourceFile: annotation.document_id,
        learned: false,
        createdAt: toStoredDate(annotation.created_at),
    }
}

export function savedWordFromVocabularyItem(item: VocabularyItem): SavedWord {
    return {
        id: item.id,
        word: item.word,
        translation: item.translation,
        language: 'zh',
        context: item.context,
        pinyin: item.pinyin,
        hskLevel: item.hsk_level ?? null,
        domainTags: item.domain_tags,
        sourceFile: item.source_file,
        sourceDocumentId: item.source_document_id,
        topic: item.topic,
        lookupCount: item.lookup_count,
        isFavorite: item.favorite,
        learned: item.learned,
        createdAt: toStoredDate(item.created_at),
        updatedAt: toStoredDate(item.updated_at),
    }
}

export function flashCardFromReviewItem(item: ReviewItem): FlashCard {
    return {
        id: item.id,
        front: item.front,
        back: item.back,
        example: item.source_sentence || item.context,
        difficulty: (item.hsk_level ?? 1) <= 3 ? 'beginner' : (item.hsk_level ?? 4) <= 6 ? 'intermediate' : 'advanced',
        reviewed: Boolean(item.reviewed),
        createdAt: toStoredDate(item.created_at),
        nextReview: toStoredDate(item.due_at),
        pinyin: item.pinyin,
        sourceSentence: item.source_sentence,
        hskLevel: item.hsk_level ?? null,
    }
}
