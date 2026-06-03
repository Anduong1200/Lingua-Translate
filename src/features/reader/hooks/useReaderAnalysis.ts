import { useState } from 'react'
import type { ContextTranslationResult } from '../components/readerShared'
import type { TranslateScope } from '../components/readerShared'
import { API_BASE_URL } from '@/store/slices/types'

export function useReaderAnalysis(setSavedNotice: (msg: string) => void) {
    const [contextTranslation, setContextTranslation] = useState<ContextTranslationResult | null>(null)
    const [contextTranslationLoading, setContextTranslationLoading] = useState(false)
    const [contextTranslateScope, setContextTranslateScope] = useState<TranslateScope | null>(null)

    const handleTranslateScope = async (scope: TranslateScope, payload: any) => {
        if (!payload.selected_text && !payload.source_sentence && !payload.paragraph_context) return
        setContextTranslateScope(scope)
        setContextTranslationLoading(true)
        setSavedNotice('')
        try {
            const response = await fetch(`${API_BASE_URL}/nlp/translate-context`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            if (!response.ok) throw new Error(`Context translate failed: ${response.status}`)
            const result = (await response.json()) as ContextTranslationResult
            setContextTranslation(result)
            setSavedNotice(scope === 'sentence' ? 'Đã dịch câu.' : scope === 'paragraph' ? 'Đã dịch đoạn.' : 'Đã dịch theo ngữ cảnh.')
        } catch {
            setSavedNotice('Không gọi được backend context translate.')
        } finally {
            setContextTranslationLoading(false)
            setContextTranslateScope(null)
        }
    }

    return {
        contextTranslation, setContextTranslation,
        contextTranslationLoading, setContextTranslationLoading,
        contextTranslateScope, setContextTranslateScope,
        handleTranslateScope
    }
}
