import { create } from 'zustand'
import type { AppState } from './slices/types'
import { createTranslationSlice } from './slices/translationSlice'
import { createAnalysisSlice } from './slices/analysisSlice'
import { createAnnotationSlice } from './slices/annotationSlice'
import { createDocumentSlice } from './slices/documentSlice'
import { createSettingsSlice } from './slices/settingsSlice'

// Re-export types for external consumers that import from this file
export type { AppState } from './slices/types'
export type {
    ReaderAnnotationInput,
    UserCorrectionInput,
    VocabularyLookupInput,
    AnalyzeChineseInput,
} from './slices/types'

export const useStore = create<AppState>()((...args) => ({
    ...createTranslationSlice(...args),
    ...createAnalysisSlice(...args),
    ...createAnnotationSlice(...args),
    ...createDocumentSlice(...args),
    ...createSettingsSlice(...args),
}))
