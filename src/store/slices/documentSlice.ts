import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { generateId } from '@/lib/utils'
import type { DocumentContent, ReviewItem, VocabularySuggestion, VocabularyItem, AnnotationRecord, KnownWord, UserCorrection } from '@/types'
import type { SliceCreator, DocumentSlice } from './types'
import {
    API_BASE_URL,
    postJson,
    getJson,
    apiAssetUrl,
    normalizeDocumentFromApi,
    savedWordFromAnnotation,
    savedWordFromVocabularyItem,
    flashCardFromReviewItem,
    splitDocumentSentences,
    syncLearningState,
} from './types'

export const createDocumentSlice: SliceCreator<DocumentSlice> = (set, get) => ({
    documents: [],
    currentDocument: null,
    isTranslatingFile: false,
    documentTranslations: {},
    vocabularySuggestions: [],
    isTranslatingDocument: false,
    isScanningVocabulary: false,
    isHydrating: false,

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

    translateCurrentDocument: async (documentId) => {
        set({ isTranslatingDocument: true })
        try {
            const result = await getJson<{ translations: any[] }>(`${API_BASE_URL}/documents/${documentId}/translate`)
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
                    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl
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
})
