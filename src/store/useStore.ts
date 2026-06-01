import { create } from 'zustand'
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
import { detectLanguage, generateId } from '@/lib/utils'
import { analyzeChineseText as analyzeOffline, getVietnameseDefinition } from '@/lib/chinese'

type ReaderAnnotationInput = {
    token: ChineseToken
    sentenceText: string
    note?: string
    documentId?: string
    pageId?: string
    pageNumber?: number
    bboxJson?: string
    sentenceId?: string
}

type UserCorrectionInput = {
    original_term: string
    system_translation?: string
    user_translation: string
    context?: string
    domain?: string
}

type VocabularyLookupInput = {
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

type AnalyzeChineseInput =
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

type AnalyzeChinesePayload = {
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

interface AppState {
    // Translation compatibility
    currentTranslation: TranslationResult | null
    translationHistory: TranslationHistory[]
    isTranslating: boolean
    floatingPopup: { visible: boolean; x: number; y: number; text: string }
    translationCache: Record<string, TranslationResult>

    // Reader and learning data
    savedWords: SavedWord[]
    documents: DocumentContent[]
    currentDocument: DocumentContent | null
    isTranslatingFile: boolean
    chineseAnalysis: ChineseAnalysis | null
    contextualAnalysis: ChineseAnalysis | null
    aiContext: AIContextPayload | null
    isAnalyzing: boolean
    isGeneratingAIContext: boolean
    annotations: AnnotationRecord[]
    reviewItems: ReviewItem[]
    userCorrections: UserCorrection[]
    knownWords: KnownWord[]
    documentTranslations: Record<string, DocumentTranslationSentence[]>
    vocabularySuggestions: VocabularySuggestion[]
    isTranslatingDocument: boolean
    isScanningVocabulary: boolean
    isHydrating: boolean

    // Learning
    learningProgress: LearningProgress
    flashCards: FlashCard[]

    // Settings
    settings: AppSettings
    isDarkMode: boolean

    // Side-by-side translation
    isSideBySide: boolean
    toggleSideBySide: () => void

    // Actions
    hydrateFromBackend: () => Promise<void>
    setFloatingPopup: (popup: { visible: boolean; x: number; y: number; text: string }) => void
    translateText: (text: string, sourceLang?: string, targetLang?: string) => Promise<void>
    analyzeChineseText: (input: AnalyzeChineseInput) => Promise<ChineseAnalysis>
    generateAIContextReading: (input: Exclude<AnalyzeChineseInput, string>) => Promise<AIContextReadingResult | null>
    saveChineseAnnotation: (input: ReaderAnnotationInput) => Promise<AnnotationRecord>
    saveUserCorrection: (input: UserCorrectionInput) => Promise<void>
    recordLookupWord: (input: VocabularyLookupInput) => Promise<void>
    markKnownWord: (word: string, confidence?: number) => Promise<void>
    submitReview: (reviewItemId: string, rating: number, responseTimeMs?: number) => Promise<void>
    translateCurrentDocument: (documentId: string) => Promise<DocumentTranslationSentence[]>
    scanDocumentVocabulary: (documentId: string, limit?: number) => Promise<VocabularySuggestion[]>
    createAutoReviewItems: (documentId: string, limit?: number) => Promise<number>
    saveWord: (word: SavedWord) => void
    removeSavedWord: (id: string) => void
    toggleFavorite: (id: string) => void
    markSavedWordLearned: (id: string, learned: boolean) => void
    addDocument: (doc: DocumentContent) => void
    deleteDocument: (id: string) => Promise<void>
    setCurrentDocument: (doc: DocumentContent | null) => void
    updateReadingProgress: (docId: string, progress: number) => void
    addFlashCard: (card: FlashCard) => void
    toggleDarkMode: () => void
    updateSettings: (settings: Partial<AppSettings>) => void
    updateLearningProgress: (progress: Partial<LearningProgress>) => void
    translateFile: (file: File, targetLang?: string) => Promise<DocumentContent | null>
}

const defaultSettings: AppSettings = {
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

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://127.0.0.1:3001/api'

function toStoredDate(value: unknown): Date {
    if (value instanceof Date) return value
    if (typeof value === 'string') return new Date(value)
    return new Date()
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
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

function splitDocumentSentences(text: string, docId: string) {
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

function syncLearningState(partial: Pick<AppState, 'savedWords' | 'documents' | 'annotations' | 'reviewItems' | 'flashCards'>) {
    void partial
    // Backend SQLite is the source of truth for learning data.
}

async function getJson<T>(url: string): Promise<T> {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Request failed: ${response.status}`)
    return response.json() as Promise<T>
}

function apiAssetUrl(fileUrl?: string) {
    if (!fileUrl) return undefined
    if (/^https?:\/\//.test(fileUrl)) return fileUrl
    return `${API_BASE_URL.replace(/\/api$/, '')}${fileUrl}`
}

function normalizeDocumentFromApi(item: any): DocumentContent {
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

function savedWordFromAnnotation(annotation: AnnotationRecord): SavedWord {
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

function savedWordFromVocabularyItem(item: VocabularyItem): SavedWord {
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

function flashCardFromReviewItem(item: ReviewItem): FlashCard {
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

const storedSavedWords: SavedWord[] = []
const storedDocuments: DocumentContent[] = []
const storedAnnotations: AnnotationRecord[] = []
const storedReviewItems: ReviewItem[] = []
const storedFlashCards: FlashCard[] = []

export const useStore = create<AppState>((set, get) => ({
    currentTranslation: null,
    translationHistory: [],
    isTranslating: false,
    floatingPopup: { visible: false, x: 0, y: 0, text: '' },
    translationCache: {},
    savedWords: storedSavedWords,
    documents: storedDocuments,
    currentDocument: storedDocuments[0] ?? null,
    isTranslatingFile: false,
    chineseAnalysis: null,
    contextualAnalysis: null,
    aiContext: null,
    isAnalyzing: false,
    isGeneratingAIContext: false,
    annotations: storedAnnotations,
    reviewItems: storedReviewItems,
    userCorrections: [],
    knownWords: [],
    documentTranslations: {},
    vocabularySuggestions: [],
    isTranslatingDocument: false,
    isScanningVocabulary: false,
    isHydrating: false,
    learningProgress: {
        wordsLearned: storedSavedWords.filter((word) => word.learned).length,
        streak: 7,
        totalTranslations: 0,
        savedWords: storedSavedWords.length,
        dailyGoal: defaultSettings.dailyGoal,
        todayProgress: Math.min(storedSavedWords.length, defaultSettings.dailyGoal),
    },
    flashCards: storedFlashCards,
    settings: defaultSettings,
    isDarkMode: false,
    isSideBySide: false,

    hydrateFromBackend: async () => {
        set({ isHydrating: true })
        try {
            const [
                documentsResponse,
                annotationsResponse,
                reviewResponse,
                profileResponse,
                correctionsResponse,
                knownWordsResponse,
                vocabularyResponse,
            ] = await Promise.all([
                getJson<{ documents: any[] }>(`${API_BASE_URL}/documents`),
                getJson<AnnotationRecord[]>(`${API_BASE_URL}/annotations`),
                getJson<{ items: ReviewItem[] }>(`${API_BASE_URL}/review-items`),
                getJson<{ profile: any }>(`${API_BASE_URL}/user/profile`),
                getJson<{ corrections: UserCorrection[] }>(`${API_BASE_URL}/user/corrections`),
                getJson<{ words: KnownWord[] }>(`${API_BASE_URL}/known-words`),
                getJson<{ items: VocabularyItem[] }>(`${API_BASE_URL}/vocabulary`),
            ])

            const documents = documentsResponse.documents.map(normalizeDocumentFromApi)
            const annotations = annotationsResponse
            const reviewItems = reviewResponse.items
            const flashCards = reviewItems.map(flashCardFromReviewItem)
            const savedWords = vocabularyResponse.items.length
                ? vocabularyResponse.items.map(savedWordFromVocabularyItem)
                : annotations.map(savedWordFromAnnotation)
            const profile = profileResponse.profile || {}

            set((state) => ({
                documents,
                currentDocument:
                    documents.find((document) => document.id === state.currentDocument?.id) ||
                    documents[0] ||
                    null,
                annotations,
                reviewItems,
                userCorrections: correctionsResponse.corrections,
                knownWords: knownWordsResponse.words,
                flashCards,
                savedWords,
                settings: {
                    ...state.settings,
                    targetHskLevel: profile.target_level || state.settings.targetHskLevel,
                    domainMode: profile.preferred_domains?.[0] || state.settings.domainMode,
                    showPinyinMode: profile.show_pinyin || state.settings.showPinyinMode,
                    translationStyle: profile.translation_style || state.settings.translationStyle,
                    targetLanguage: profile.native_language || state.settings.targetLanguage,
                },
                learningProgress: {
                    ...state.learningProgress,
                    savedWords: savedWords.length,
                    wordsLearned: savedWords.filter((word) => word.learned).length,
                    todayProgress: Math.min(savedWords.length, state.learningProgress.dailyGoal),
                },
                isHydrating: false,
            }))
        } catch {
            set({ isHydrating: false })
        }
    },

    setFloatingPopup: (popup) => set({ floatingPopup: popup }),

    translateText: async (text, sourceLang, targetLang) => {
        if (!text.trim()) return

        const src = sourceLang || 'auto'
        const tgt = targetLang || 'vi'
        const cacheKey = `${src}-${tgt}-${text.trim().toLowerCase()}`
        const cached = get().translationCache[cacheKey]
        if (cached) {
            set({ currentTranslation: cached })
            return
        }

        set({ isTranslating: true })

        try {
            const result = await postJson<TranslationResult>(`${API_BASE_URL}/translate`, {
                text,
                sourceLang: src,
                targetLang: tgt,
            })
            result.timestamp = new Date(result.timestamp)

            const historyEntry: TranslationHistory = {
                id: generateId(),
                sourceText: text,
                translatedText: result.translatedText,
                sourceLang: result.sourceLang,
                targetLang: result.targetLang,
                timestamp: new Date(),
            }

            set((state) => ({
                currentTranslation: result,
                isTranslating: false,
                translationHistory: [historyEntry, ...state.translationHistory].slice(0, 50),
                translationCache: { ...state.translationCache, [cacheKey]: result },
                learningProgress: {
                    ...state.learningProgress,
                    totalTranslations: state.learningProgress.totalTranslations + 1,
                },
            }))
        } catch {
            const detected = src === 'auto' ? detectLanguage(text) : src
            const analysis = analyzeOffline(text)
            const translatedText = analysis.sentences
                .map((sentence) =>
                    sentence.tokens
                        .map((token) => getVietnameseDefinition(token))
                        .filter(Boolean)
                        .join(' / '),
                )
                .filter(Boolean)
                .join('. ')

            const fallbackResult: TranslationResult = {
                id: generateId(),
                sourceText: text,
                translatedText: translatedText || `${text} (chưa có nghĩa trong từ điển cục bộ)`,
                sourceLang: detected,
                targetLang: tgt,
                wordType: 'Chinese context lookup',
                grammarExplanation: analysis.sentences[0]?.grammar_patterns[0]?.meaning_vi ?? 'Phân tích cục bộ từ dictionary seed.',
                usageExamples: [],
                pronunciation: analysis.sentences[0]?.tokens.map((token) => token.pinyin).filter(Boolean).join(' '),
                tips: ['Kết quả này được tạo từ lớp từ điển offline, không phụ thuộc cloud.'],
                difficulty: 'intermediate',
                timestamp: new Date(),
            }

            set({
                currentTranslation: fallbackResult,
                isTranslating: false,
            })
        }
    },

    analyzeChineseText: async (input) => {
        set({ isAnalyzing: true })
        const settings = get().settings
        const payload: AnalyzeChinesePayload =
            typeof input === 'string'
                ? { text: input, mode: settings.domainMode || 'auto' }
                : {
                      ...input,
                      text: input.text || input.source_sentence || input.selected_text || '',
                      domain_mode: input.domain_mode || settings.domainMode || 'auto',
                      user_level: input.user_level || settings.targetHskLevel || 'HSK4',
                  }
        const fallbackText = payload.source_sentence || payload.text || payload.selected_text || ''
        const isContextual = typeof input !== 'string' && Boolean(input.selected_text || input.source_sentence || input.page_context)
        try {
            const analysis = await postJson<ChineseAnalysis>(`${API_BASE_URL}/nlp/analyze`, payload)
            set({
                chineseAnalysis: isContextual ? get().chineseAnalysis : analysis,
                contextualAnalysis: isContextual ? analysis : null,
                aiContext: analysis.ai_context || (isContextual ? get().aiContext : null),
                isAnalyzing: false,
            })
            return analysis
        } catch {
            const analysis = analyzeOffline(fallbackText)
            set({
                chineseAnalysis: analysis,
                contextualAnalysis: null,
                aiContext: null,
                isAnalyzing: false,
            })
            return analysis
        }
    },

    generateAIContextReading: async (input) => {
        set({ isGeneratingAIContext: true })
        const settings = get().settings
        const payload: AnalyzeChinesePayload = {
            ...input,
            text: input.text || input.source_sentence || input.selected_text || '',
            domain_mode: input.domain_mode || settings.domainMode || 'auto',
            user_level: input.user_level || settings.targetHskLevel || 'HSK4',
        }

        try {
            const result = await postJson<AIContextReadingResult>(`${API_BASE_URL}/ai/context-reading`, payload)
            set({
                contextualAnalysis: result.rule_based,
                aiContext: result.ai,
                isGeneratingAIContext: false,
            })
            return result
        } catch {
            set({
                aiContext: {
                    enabled: false,
                    provider: 'google_gemini',
                    model: 'unknown',
                    status: 'request_failed',
                    message: 'Không gọi được AI context endpoint.',
                },
                isGeneratingAIContext: false,
            })
            return null
        }
    },

    saveChineseAnnotation: async ({ token, sentenceText, note, documentId, pageId, pageNumber, bboxJson, sentenceId }) => {
        const state = get()
        const doc = state.currentDocument
        const vi = getVietnameseDefinition(token)
        const now = new Date().toISOString()
        const annotationBase: AnnotationRecord = {
            id: generateId(),
            document_id: documentId || doc?.id || 'local-doc',
            page_id: pageId || 'page-1',
            page_number: pageNumber ?? null,
            sentence_id: sentenceId,
            selected_text: token.surface,
            selection_start: sentenceText.indexOf(token.surface),
            selection_end: sentenceText.indexOf(token.surface) + token.surface.length,
            bbox_json: bboxJson,
            annotation_type: token.surface.length > 2 ? 'phrase' : 'word',
            note,
            explanation_vi: vi,
            analysis_json: JSON.stringify(token),
            source_sentence: sentenceText,
            pinyin: token.pinyin,
            hsk_level: token.hsk_level ?? null,
            domain_tag: token.domain_tags?.[0],
            created_at: now,
        }

        let annotation = annotationBase
        try {
            const response = await postJson<{ id: string; status: string }>(`${API_BASE_URL}/annotations`, annotationBase)
            annotation = { ...annotationBase, id: response.id || annotationBase.id }
        } catch {
            annotation = annotationBase
        }

        const reviewItem: ReviewItem = {
            id: generateId(),
            annotation_id: annotation.id,
            item_type: 'flashcard',
            source_type: annotation.annotation_type === 'phrase' ? 'phrase' : 'word',
            front: token.surface,
            back: vi,
            context: note,
            source_sentence: sentenceText,
            pinyin: token.pinyin,
            hsk_level: token.hsk_level ?? null,
            domain_tag: token.domain_tags?.[0],
            due_at: now,
            interval_days: 0,
            ease: 2.5,
            reviewed: false,
            created_at: now,
        }

        try {
            const response = await postJson<{ id: string; review_item_id?: string; due_at: string }>(`${API_BASE_URL}/review-items`, {
                annotation_id: annotation.id,
                item_type: 'flashcard',
                source_type: reviewItem.source_type,
            })
            reviewItem.id = response.review_item_id || response.id || reviewItem.id
            reviewItem.due_at = response.due_at || reviewItem.due_at
        } catch {
            // Local review queue remains available offline.
        }

        const savedWord: SavedWord = {
            id: generateId(),
            word: token.surface,
            translation: vi,
            language: 'zh',
            context: sentenceText,
            notes: note,
            pinyin: token.pinyin,
            hskLevel: token.hsk_level ?? null,
            pos: token.pos,
            domainTags: token.domain_tags ?? [],
            examples: token.examples ?? [],
            sourceFile: doc?.title,
            learned: false,
            createdAt: new Date(),
        }

        const flashCard: FlashCard = {
            id: reviewItem.id,
            front: token.surface,
            back: vi,
            example: sentenceText,
            difficulty: (token.hsk_level ?? 1) <= 3 ? 'beginner' : (token.hsk_level ?? 4) <= 6 ? 'intermediate' : 'advanced',
            reviewed: false,
            createdAt: new Date(),
            nextReview: new Date(reviewItem.due_at),
            pinyin: token.pinyin,
            sourceSentence: sentenceText,
            hskLevel: token.hsk_level ?? null,
        }

        set((current) => {
            const wordExists = current.savedWords.some((word) => word.word === savedWord.word)
            const nextState = {
                annotations: [annotation, ...current.annotations],
                reviewItems: [reviewItem, ...current.reviewItems],
                flashCards: [flashCard, ...current.flashCards.filter((card) => card.front !== flashCard.front)],
                savedWords: wordExists ? current.savedWords : [savedWord, ...current.savedWords],
                learningProgress: {
                    ...current.learningProgress,
                    savedWords: wordExists ? current.learningProgress.savedWords : current.learningProgress.savedWords + 1,
                    todayProgress: Math.min(
                        current.learningProgress.dailyGoal,
                        wordExists ? current.learningProgress.todayProgress : current.learningProgress.todayProgress + 1,
                    ),
                },
            }
            syncLearningState({
                savedWords: nextState.savedWords,
                documents: current.documents,
                annotations: nextState.annotations,
                reviewItems: nextState.reviewItems,
                flashCards: nextState.flashCards,
            })
            return nextState
        })

        return annotation
    },

    saveUserCorrection: async (input) => {
        await postJson(`${API_BASE_URL}/user/corrections`, input)
        const correctionsResponse = await getJson<{ corrections: UserCorrection[] }>(`${API_BASE_URL}/user/corrections`)
        set({ userCorrections: correctionsResponse.corrections })
    },

    recordLookupWord: async (input) => {
        if (!input.word.trim()) return
        try {
            const response = await postJson<{ item: VocabularyItem }>(`${API_BASE_URL}/vocabulary/lookup`, {
                word: input.word,
                translation: input.translation || '',
                pinyin: input.pinyin || '',
                context: input.context || '',
                source_file: input.source_file || '',
                source_document_id: input.source_document_id || '',
                hsk_level: input.hsk_level ?? null,
                domain_tags: input.domain_tags || [],
                topic: input.topic || 'general',
            })
            const savedWord = savedWordFromVocabularyItem(response.item)
            set((state) => {
                const savedWords = [savedWord, ...state.savedWords.filter((word) => word.id !== savedWord.id && word.word !== savedWord.word)]
                return {
                    savedWords,
                    learningProgress: {
                        ...state.learningProgress,
                        savedWords: savedWords.length,
                        wordsLearned: savedWords.filter((word) => word.learned).length,
                        todayProgress: Math.min(savedWords.length, state.learningProgress.dailyGoal),
                    },
                }
            })
        } catch {
            const fallback: SavedWord = {
                id: generateId(),
                word: input.word,
                translation: input.translation || '',
                language: 'zh',
                context: input.context,
                pinyin: input.pinyin,
                hskLevel: input.hsk_level ?? null,
                domainTags: input.domain_tags || [],
                sourceFile: input.source_file,
                sourceDocumentId: input.source_document_id,
                topic: input.topic,
                lookupCount: 1,
                learned: false,
                isFavorite: false,
                createdAt: new Date(),
            }
            set((state) => ({ savedWords: [fallback, ...state.savedWords.filter((word) => word.word !== fallback.word)] }))
        }
    },

    markKnownWord: async (word, confidence = 0.85) => {
        await postJson(`${API_BASE_URL}/known-words`, { word, confidence })
        const knownWordsResponse = await getJson<{ words: KnownWord[] }>(`${API_BASE_URL}/known-words`)
        set({ knownWords: knownWordsResponse.words })
    },

    submitReview: async (reviewItemId, rating, responseTimeMs = 1200) => {
        let nextDueAt = new Date()
        let intervalDays = rating <= 2 ? 1 : rating === 3 ? 3 : 7
        nextDueAt.setDate(nextDueAt.getDate() + intervalDays)

        try {
            const response = await postJson<{ next_due_at: string; interval_days: number }>(`${API_BASE_URL}/review-events`, {
                review_item_id: reviewItemId,
                rating,
                response_time_ms: responseTimeMs,
            })
            nextDueAt = new Date(response.next_due_at)
            intervalDays = response.interval_days
        } catch {
            // SRS fallback above is enough for local-first review.
        }

        set((state) => {
            const reviewItems = state.reviewItems.map((item) =>
                item.id === reviewItemId
                    ? { ...item, reviewed: true, interval_days: intervalDays, due_at: nextDueAt.toISOString() }
                    : item,
            )
            const flashCards = state.flashCards.map((card) =>
                card.id === reviewItemId ? { ...card, reviewed: true, nextReview: nextDueAt } : card,
            )
            const savedWords = state.savedWords.map((word) =>
                state.reviewItems.find((item) => item.id === reviewItemId)?.front === word.word
                    ? { ...word, learned: rating >= 3 }
                    : word,
            )
            syncLearningState({
                savedWords,
                documents: state.documents,
                annotations: state.annotations,
                reviewItems,
                flashCards,
            })
            return { reviewItems, flashCards, savedWords }
        })
    },

    translateCurrentDocument: async (documentId) => {
        set({ isTranslatingDocument: true })
        try {
            const result = await getJson<DocumentTranslationResult>(`${API_BASE_URL}/documents/${documentId}/translate`)
            set((state) => ({
                documentTranslations: {
                    ...state.documentTranslations,
                    [documentId]: result.translations,
                },
                isTranslatingDocument: false,
            }))
            return result.translations
        } catch {
            set({ isTranslatingDocument: false })
            return []
        }
    },

    scanDocumentVocabulary: async (documentId, limit = 30) => {
        set({ isScanningVocabulary: true })
        try {
            const result = await getJson<{ items: VocabularySuggestion[] }>(
                `${API_BASE_URL}/documents/${documentId}/vocabulary-scan?limit=${limit}`,
            )
            set({ vocabularySuggestions: result.items, isScanningVocabulary: false })
            return result.items
        } catch {
            set({ vocabularySuggestions: [], isScanningVocabulary: false })
            return []
        }
    },

    createAutoReviewItems: async (documentId, limit = 20) => {
        set({ isScanningVocabulary: true })
        try {
            const result = await postJson<{ created: number; items: ReviewItem[] }>(
                `${API_BASE_URL}/documents/${documentId}/auto-review-items`,
                { limit, min_frequency: 1 },
            )
            const reviewResponse = await getJson<{ items: ReviewItem[] }>(`${API_BASE_URL}/review-items`)
            set({
                reviewItems: reviewResponse.items,
                flashCards: reviewResponse.items.map(flashCardFromReviewItem),
                isScanningVocabulary: false,
            })
            return result.created
        } catch {
            set({ isScanningVocabulary: false })
            return 0
        }
    },

    saveWord: (word) =>
        set((state) => {
            const nextSavedWords = [word, ...state.savedWords.filter((w) => w.word !== word.word)]
            const nextState = {
                savedWords: nextSavedWords,
                learningProgress: {
                    ...state.learningProgress,
                    savedWords: nextSavedWords.length,
                    wordsLearned: nextSavedWords.filter((w) => w.learned).length,
                    todayProgress: Math.min(state.learningProgress.todayProgress + 1, state.learningProgress.dailyGoal),
                },
            }
            syncLearningState({
                savedWords: nextState.savedWords,
                documents: state.documents,
                annotations: state.annotations,
                reviewItems: state.reviewItems,
                flashCards: state.flashCards,
            })
            return nextState
        }),

    removeSavedWord: (id) => {
        void fetch(`${API_BASE_URL}/vocabulary/${id}`, { method: 'DELETE' }).catch(() => undefined)
        set((state) => {
            const savedWords = state.savedWords.filter((word) => word.id !== id)
            syncLearningState({
                savedWords,
                documents: state.documents,
                annotations: state.annotations,
                reviewItems: state.reviewItems,
                flashCards: state.flashCards,
            })
            return { savedWords }
        })
    },

    toggleFavorite: (id) =>
        set((state) => {
            const currentWord = state.savedWords.find((word) => word.id === id)
            const nextFavorite = !currentWord?.isFavorite
            void fetch(`${API_BASE_URL}/vocabulary/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ favorite: nextFavorite }),
            }).catch(() => undefined)
            const savedWords = state.savedWords.map((word) => (word.id === id ? { ...word, isFavorite: nextFavorite } : word))
            syncLearningState({
                savedWords,
                documents: state.documents,
                annotations: state.annotations,
                reviewItems: state.reviewItems,
                flashCards: state.flashCards,
            })
            return { savedWords }
        }),

    markSavedWordLearned: (id, learned) =>
        set((state) => {
            void fetch(`${API_BASE_URL}/vocabulary/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ learned }),
            }).catch(() => undefined)
            const savedWords = state.savedWords.map((word) => (word.id === id ? { ...word, learned } : word))
            return {
                savedWords,
                learningProgress: {
                    ...state.learningProgress,
                    wordsLearned: savedWords.filter((word) => word.learned).length,
                },
            }
        }),

    addDocument: (doc) =>
        set((state) => {
            const documentWithSentences = {
                ...doc,
                sentences: doc.sentences?.length ? doc.sentences : splitDocumentSentences(doc.content, doc.id),
            }
            const documents = [documentWithSentences, ...state.documents.filter((item) => item.id !== doc.id)]
            syncLearningState({
                savedWords: state.savedWords,
                documents,
                annotations: state.annotations,
                reviewItems: state.reviewItems,
                flashCards: state.flashCards,
            })
            return {
                documents,
                currentDocument: documentWithSentences,
            }
        }),

    deleteDocument: async (id) => {
        await fetch(`${API_BASE_URL}/documents/${id}`, { method: 'DELETE' }).catch(() => undefined)
        set((state) => {
            const documents = state.documents.filter((document) => document.id !== id)
            const annotations = state.annotations.filter((annotation) => annotation.document_id !== id)
            const annotationIds = new Set(state.annotations.filter((annotation) => annotation.document_id === id).map((annotation) => annotation.id))
            const reviewItems = state.reviewItems.filter((item) => !annotationIds.has(item.annotation_id) && item.context !== `auto:${id}`)
            const flashCards = reviewItems.map(flashCardFromReviewItem)
            const savedWords = state.savedWords.filter((word) => word.sourceDocumentId !== id)
            const currentDocument = state.currentDocument?.id === id ? documents[0] ?? null : state.currentDocument
            syncLearningState({
                savedWords,
                documents,
                annotations,
                reviewItems,
                flashCards,
            })
            return {
                documents,
                annotations,
                reviewItems,
                flashCards,
                savedWords,
                currentDocument,
                learningProgress: {
                    ...state.learningProgress,
                    savedWords: savedWords.length,
                    wordsLearned: savedWords.filter((word) => word.learned).length,
                },
            }
        })
    },

    setCurrentDocument: (doc) => set({ currentDocument: doc }),

    updateReadingProgress: (docId, progress) =>
        set((state) => {
            const documents = state.documents.map((document) =>
                document.id === docId ? { ...document, readingProgress: progress } : document,
            )
            syncLearningState({
                savedWords: state.savedWords,
                documents,
                annotations: state.annotations,
                reviewItems: state.reviewItems,
                flashCards: state.flashCards,
            })
            return { documents }
        }),

    addFlashCard: (card) =>
        set((state) => {
            const flashCards = [card, ...state.flashCards]
            syncLearningState({
                savedWords: state.savedWords,
                documents: state.documents,
                annotations: state.annotations,
                reviewItems: state.reviewItems,
                flashCards,
            })
            return { flashCards }
        }),

    toggleDarkMode: () =>
        set((state) => {
            const newDark = !state.isDarkMode
            document.documentElement.classList.toggle('dark', newDark)
            document.body.classList.toggle('dark', newDark)
            return { isDarkMode: newDark }
        }),

    toggleSideBySide: () => set((state) => ({ isSideBySide: !state.isSideBySide })),

    updateSettings: (newSettings) => {
        const mergedSettings = { ...get().settings, ...newSettings }
        void fetch(`${API_BASE_URL}/user/profile`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                target_level: mergedSettings.targetHskLevel,
                preferred_domains: [mergedSettings.domainMode || 'general'],
                show_pinyin: mergedSettings.showPinyinMode,
                translation_style: mergedSettings.translationStyle,
                native_language: mergedSettings.targetLanguage || 'vi',
            }),
        }).catch(() => undefined)

        set((state) => ({
            settings: mergedSettings,
            learningProgress: {
                ...state.learningProgress,
                dailyGoal: newSettings.dailyGoal ?? state.learningProgress.dailyGoal,
            },
        }))
    },

    updateLearningProgress: (progress) =>
        set((state) => ({
            learningProgress: { ...state.learningProgress, ...progress },
        })),

    translateFile: async (file, targetLang) => {
        set({ isTranslatingFile: true })
        const formData = new FormData()
        formData.append('file', file)
        formData.append('targetLang', targetLang || get().settings.targetLanguage || 'vi')

        try {
            const response = await fetch(`${API_BASE_URL}/documents/upload`, {
                method: 'POST',
                body: formData,
            })

            if (!response.ok) {
                throw new Error('Failed to upload file')
            }

            const data = await response.json()
            const docId = data.document_id || generateId()
            const extractedText = String(data.content || data.extractedText || '')
            const newDoc: DocumentContent = {
                id: docId,
                title: data.title || file.name,
                type: file.name.endsWith('.pdf') ? 'pdf' : file.name.endsWith('.docx') ? 'docx' : 'txt',
                content: extractedText,
                sourceUrl: apiAssetUrl(data.file_url),
                sourceFileName: file.name,
                sentences: splitDocumentSentences(extractedText, docId),
                uploadedAt: new Date(),
                readingProgress: 0,
                highlights: [],
                notes: [],
            }

            get().addDocument(newDoc)
            set({ isTranslatingFile: false })
            return newDoc
        } catch {
            // Client-side fallback when backend is unavailable
            try {
                const ext = file.name.split('.').pop()?.toLowerCase() || 'txt'
                let extractedText = ''

                if (ext === 'pdf') {
                    const pdfjsLib = await import('pdfjs-dist')
                    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).toString()
                    const arrayBuffer = await file.arrayBuffer()
                    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
                    const pages: string[] = []
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i)
                        const content = await page.getTextContent()
                        pages.push(content.items.map((item: any) => item.str || '').join(' '))
                    }
                    extractedText = pages.join('\n')
                } else {
                    // txt, docx, csv — best-effort text read
                    extractedText = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader()
                        reader.onload = () => resolve(reader.result as string)
                        reader.onerror = () => reject(reader.error)
                        reader.readAsText(file)
                    })
                }

                if (!extractedText.trim()) {
                    set({ isTranslatingFile: false })
                    return null
                }

                const docId = generateId()
                const newDoc: DocumentContent = {
                    id: docId,
                    title: file.name,
                    type: ext === 'pdf' ? 'pdf' : ext === 'docx' ? 'docx' : 'txt',
                    content: extractedText,
                    sourceFileName: file.name,
                    sentences: splitDocumentSentences(extractedText, docId),
                    uploadedAt: new Date(),
                    readingProgress: 0,
                    highlights: [],
                    notes: [],
                }

                get().addDocument(newDoc)
                set({ isTranslatingFile: false })
                return newDoc
            } catch {
                set({ isTranslatingFile: false })
                return null
            }
        }
    },
}))
