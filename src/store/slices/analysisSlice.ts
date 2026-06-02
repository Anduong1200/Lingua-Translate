import { analyzeChineseText as analyzeOffline } from '@/lib/chinese'
import type { ChineseAnalysis } from '@/types'
import type { AIContextReadingResult } from '@/types'
import type { AnalyzeChinesePayload, SliceCreator, AnalysisSlice } from './types'
import { API_BASE_URL, postJson } from './types'

export const createAnalysisSlice: SliceCreator<AnalysisSlice> = (set, get) => ({
    chineseAnalysis: null,
    contextualAnalysis: null,
    aiContext: null,
    isAnalyzing: false,
    isGeneratingAIContext: false,

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
})
