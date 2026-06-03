import { useState, useCallback } from 'react'
import type { ChineseSentenceAnalysis, ChineseToken, DocumentContent } from '@/types'
import type { PdfSelection } from '../readerUtils'
import type { TextSelection, FloatingCoords } from '../components/readerShared'

export function useReaderSelection() {
    const [selectedSentence, setSelectedSentence] = useState<ChineseSentenceAnalysis | null>(null)
    const [selectedToken, setSelectedToken] = useState<ChineseToken | null>(null)
    const [textSelection, setTextSelection] = useState<TextSelection | null>(null)
    const [pdfSelection, setPdfSelection] = useState<PdfSelection | null>(null)
    const [popupCoords, setPopupCoords] = useState<FloatingCoords>(null)

    const clearSelection = useCallback(() => {
        setSelectedSentence(null)
        setSelectedToken(null)
        setTextSelection(null)
        setPdfSelection(null)
        setPopupCoords(null)
    }, [])

    return {
        selectedSentence, setSelectedSentence,
        selectedToken, setSelectedToken,
        textSelection, setTextSelection,
        pdfSelection, setPdfSelection,
        popupCoords, setPopupCoords,
        clearSelection,
    }
}
