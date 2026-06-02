import { detectLanguage, generateId } from '@/lib/utils'
import { analyzeChineseText as analyzeOffline, getVietnameseDefinition } from '@/lib/chinese'
import type { TranslationResult, TranslationHistory } from '@/types'
import type { SliceCreator, TranslationSlice } from './types'
import { API_BASE_URL, postJson } from './types'

export const createTranslationSlice: SliceCreator<TranslationSlice> = (set, get) => ({
    currentTranslation: null,
    translationHistory: [],
    isTranslating: false,
    floatingPopup: { visible: false, x: 0, y: 0, text: '' },
    translationCache: {},

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
})
