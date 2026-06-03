import { generateId } from '@/lib/utils'
import { getVietnameseDefinition } from '@/lib/chinese'
import type { FlashCard, KnownWord, ReviewItem, SavedWord, UserCorrection } from '@/types'
import type { SliceCreator, AnnotationSlice } from './types'
import { API_BASE_URL, postJson, getJson, syncLearningState, savedWordFromVocabularyItem, flashCardFromReviewItem, defaultSettings } from './types'
import type { AnnotationRecord, VocabularyItem } from '@/types'

export const createAnnotationSlice: SliceCreator<AnnotationSlice> = (set, get) => ({
    annotations: [],
    reviewItems: [],
    userCorrections: [],
    knownWords: [],
    savedWords: [],
    flashCards: [],
    learningProgress: {
        wordsLearned: 0,
        streak: 7,
        totalTranslations: 0,
        savedWords: 0,
        dailyGoal: defaultSettings.dailyGoal,
        todayProgress: 0,
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

    removeAnnotation: (id) => {
        void fetch(`${API_BASE_URL}/annotations/${id}`, { method: 'DELETE' }).catch(() => undefined)
        set((state) => {
            const removedReviewIds = new Set(state.reviewItems.filter((item) => item.annotation_id === id).map((item) => item.id))
            const annotations = state.annotations.filter((annotation) => annotation.id !== id)
            const reviewItems = state.reviewItems.filter((item) => item.annotation_id !== id)
            const flashCards = state.flashCards.filter((card) => !removedReviewIds.has(card.id))
            syncLearningState({
                savedWords: state.savedWords,
                documents: state.documents,
                annotations,
                reviewItems,
                flashCards,
            })
            return { annotations, reviewItems, flashCards }
        })
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

    updateLearningProgress: (progress) =>
        set((state) => ({
            learningProgress: { ...state.learningProgress, ...progress },
        })),
})
