import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useStore } from '@/store/useStore'
import { estimateHskLabel } from '@/lib/chinese'
import { generateId } from '@/lib/utils'
import { API_BASE_URL } from '@/store/slices/types'
import { type ChatMessage, findSentenceForSelection, formatAiChatReply, messageTime, type PdfSelection, type QuizQuestion } from '../readerUtils'
import { type ReaderView, type SidebarTab, type TranslateScope, type TextSelection, type FloatingCoords, type ContextTranslationResult, type BackendQuizResponse, readStoredHistory, cleanDictionaryText, tokenVietnamese, tokenEnglish, tokenPinyin, isMissingTranslation, findParagraphForSelection, bestSentenceTranslation, buildContextualToken, splitFallbackSentences, historyStorageKey } from '../components/readerShared'
import type { ChineseSentenceAnalysis, ChineseToken } from '@/types'

export function useReaderController(fileInputRef: React.RefObject<HTMLInputElement | null>) {
    const store = useStore()
    const {
        currentDocument, documents, setCurrentDocument, chineseAnalysis, contextualAnalysis, aiContext,
        isAnalyzing, isGeneratingAIContext, analyzeChineseText, generateAIContextReading, saveChineseAnnotation,
        recordLookupWord, savedWords, annotations, updateReadingProgress, settings, isSideBySide,
        toggleSideBySide, updateSettings, documentTranslations, isTranslatingDocument, isScanningVocabulary,
        translateCurrentDocument, scanDocumentVocabulary, createAutoReviewItems, addDocument, translateFile, removeAnnotation
    } = store

    const [currentView, setCurrentView] = useState<ReaderView>('documents')
    const [selectedSentence, setSelectedSentence] = useState<ChineseSentenceAnalysis | null>(null)
    const [selectedToken, setSelectedToken] = useState<ChineseToken | null>(null)
    const [textSelection, setTextSelection] = useState<TextSelection | null>(null)
    const [pdfSelection, setPdfSelection] = useState<PdfSelection | null>(null)
    const [popupCoords, setPopupCoords] = useState<FloatingCoords>(null)
    const [savedNotice, setSavedNotice] = useState('')
    const [showFontSizeMenu, setShowFontSizeMenu] = useState(false)
    const [pasteModalOpen, setPasteModalOpen] = useState(false)
    const [zoomPercent, setZoomPercent] = useState(100)
    const [activeTab, setActiveTab] = useState<SidebarTab>('dict')
    const [historyList, setHistoryList] = useState<string[]>(readStoredHistory)

    const [chatOpen, setChatOpen] = useState(false)
    const [chatInput, setChatInput] = useState('')
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
    const [chatLoading, setChatLoading] = useState(false)

    const [contextTranslation, setContextTranslation] = useState<ContextTranslationResult | null>(null)
    const [contextTranslationLoading, setContextTranslationLoading] = useState(false)
    const [contextTranslateScope, setContextTranslateScope] = useState<TranslateScope | null>(null)

    const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([])
    const [quizLoading, setQuizLoading] = useState(false)
    const [quizScore, setQuizScore] = useState(0)
    const [quizFinished, setQuizFinished] = useState(false)
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
    const [selectedAnswerIndex, setSelectedAnswerIndex] = useState<number | null>(null)

    useEffect(() => {
        localStorage.setItem(historyStorageKey, JSON.stringify(historyList.slice(0, 20)))
    }, [historyList])

    useEffect(() => {
        if (currentDocument?.content && !(currentDocument.type === 'pdf' && currentDocument.sourceUrl)) {
            void analyzeChineseText(currentDocument.content).then((analysis) => {
                const firstSentence = analysis.sentences[0] ?? null
                setSelectedSentence(firstSentence)
                setSelectedToken(null)
                const firstSelection = firstSentence ? {
                    selectedText: firstSentence.text,
                    sourceSentence: firstSentence.text,
                    paragraphContext: findParagraphForSelection(currentDocument.content, firstSentence.text),
                    pageContext: currentDocument.content,
                } : null
                setTextSelection(firstSelection)
                setPdfSelection(null)
                setPopupCoords(null)
                if (firstSelection) {
                    void analyzeChineseText({
                        selected_text: firstSelection.selectedText,
                        source_sentence: firstSelection.sourceSentence,
                        paragraph_context: firstSelection.paragraphContext,
                        page_context: firstSelection.pageContext,
                        domain_mode: settings.domainMode || 'auto',
                        user_level: settings.targetHskLevel || 'HSK4',
                    })
                }
            })
        }
    }, [currentDocument?.id, currentDocument?.content, currentDocument?.type, currentDocument?.sourceUrl, analyzeChineseText, settings.domainMode, settings.targetHskLevel])

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement
            if (target.closest('.floating-reader-toolbar')) return
            if (window.getSelection()?.isCollapsed) setPopupCoords(null)
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const fallbackSentences = useMemo(() => splitFallbackSentences(currentDocument), [currentDocument])
    const sentences = chineseAnalysis?.sentences?.length ? chineseAnalysis.sentences : fallbackSentences
    const currentTranslations = currentDocument ? documentTranslations[currentDocument.id] || [] : []
    const activeSentenceIndex = selectedSentence ? Math.max(0, sentences.findIndex((s) => s.text === selectedSentence.text)) : 0
    const hskLabel = selectedSentence ? estimateHskLabel(selectedSentence.tokens) : 'HSK'

    const candidateSelection = selectedToken?.surface || pdfSelection?.selectedText || textSelection?.selectedText || selectedSentence?.text || ''
    const contextualSelectionText = contextualAnalysis?.selection?.selected_text || contextualAnalysis?.selection?.text || ''
    const contextualSourceSentence = contextualAnalysis?.selection?.source_sentence || contextualAnalysis?.context?.source_sentence || ''
    const activeAnalysis = contextualAnalysis?.selection && (contextualSelectionText === candidateSelection || contextualSourceSentence === textSelection?.sourceSentence || contextualSourceSentence === selectedSentence?.text)
        ? contextualAnalysis : null

    const selectedSurface = activeAnalysis?.selection?.selected_text || activeAnalysis?.selection?.text || candidateSelection
    const sourceSentence = activeAnalysis?.selection?.source_sentence || pdfSelection?.sourceSentence || textSelection?.sourceSentence || selectedSentence?.text || ''
    const contextualQuickVi = cleanDictionaryText(activeAnalysis?.quick_meaning?.definitions_vi?.join('; '))
    const contextualTranslationVi = !isMissingTranslation(activeAnalysis?.translations?.dictionary_vi) ? activeAnalysis?.translations?.dictionary_vi || '' : ''
    const quickVi = contextualQuickVi || tokenVietnamese(selectedToken) || contextualTranslationVi
    const quickEn = cleanDictionaryText(activeAnalysis?.quick_meaning?.definitions_en?.join('; ')) || tokenEnglish(selectedToken)
    const quickPinyin = activeAnalysis?.quick_meaning?.pinyin || selectedToken?.pinyin || tokenPinyin(activeAnalysis?.sentences?.[0]?.tokens ?? [])
    const selectedParagraphContext = textSelection?.paragraphContext || pdfSelection?.paragraphContext || (selectedSentence && currentDocument ? findParagraphForSelection(currentDocument.content, selectedSentence.text) : '')
    const selectedSentenceTranslation = bestSentenceTranslation({ analysis: activeAnalysis, selectedSentence, translation: currentTranslations[activeSentenceIndex] })
    const selectedLiteralTranslation = activeAnalysis?.translations?.literal_vi && !isMissingTranslation(activeAnalysis.translations.literal_vi)
        ? activeAnalysis.translations.literal_vi : currentTranslations[activeSentenceIndex]?.literal_vi || ''
    const loadingAnalysis = isAnalyzing || isGeneratingAIContext

    const pushHistory = (text: string) => {
        const trimmed = text.trim()
        if (!trimmed) return
        setHistoryList((items) => [trimmed, ...items.filter((item) => item !== trimmed)].slice(0, 20))
    }

    useEffect(() => {
        setContextTranslation((prev) => {
            if (!prev) return null
            const prevSelection = prev.selection.source.trim()
            const currentSelection = (selectedSurface || '').trim()
            if (prevSelection && currentSelection && !prevSelection.includes(currentSelection) && !currentSelection.includes(prevSelection)) {
                return null
            }
            return prev
        })
    }, [selectedSurface, sourceSentence])

    const buildNlpPayload = (scope?: TranslateScope) => ({
        selected_text: selectedSurface || textSelection?.selectedText || pdfSelection?.selectedText || selectedSentence?.text || '',
        source_sentence: sourceSentence || textSelection?.sourceSentence || pdfSelection?.sourceSentence || selectedSentence?.text || '',
        paragraph_context: selectedParagraphContext || sourceSentence || selectedSurface,
        page_context: currentDocument?.content || selectedParagraphContext || sourceSentence || selectedSurface,
        domain_mode: activeAnalysis?.context?.domain || settings.domainMode || 'auto',
        user_level: settings.targetHskLevel || 'HSK4',
        ...(scope ? { scope } : {}),
    })

    const handleTranslateScope = async (scope: TranslateScope) => {
        const payload = buildNlpPayload(scope)
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

    const analyzeSelection = async (selection: TextSelection | PdfSelection) => {
        setSavedNotice('')
        setActiveTab('dict')
        const analysis = await analyzeChineseText({
            selected_text: selection.selectedText,
            source_sentence: selection.sourceSentence,
            paragraph_context: selection.paragraphContext,
            page_context: selection.pageContext,
            domain_mode: settings.domainMode || 'auto',
            user_level: settings.targetHskLevel || 'HSK4',
        })
        const firstSentence = analysis.sentences?.[0] ?? null
        setSelectedSentence(firstSentence)
        if (!selectedToken) setSelectedToken(null)
        pushHistory(selection.selectedText)
        void recordLookupWord({
            word: selection.selectedText,
            translation: analysis.quick_meaning?.definitions_vi?.[0] || analysis.translations?.dictionary_vi || '',
            pinyin: analysis.quick_meaning?.pinyin || tokenPinyin(firstSentence?.tokens ?? []),
            context: selection.sourceSentence,
            source_file: currentDocument?.title || '',
            source_document_id: currentDocument?.id || '',
            hsk_level: analysis.quick_meaning?.hsk_level ?? null,
            domain_tags: analysis.quick_meaning?.domain_tags || [],
        })
    }

    const handleSentenceClick = (sentence: ChineseSentenceAnalysis, event?: React.MouseEvent) => {
        const selection: TextSelection = {
            selectedText: sentence.text,
            sourceSentence: sentence.text,
            paragraphContext: currentDocument ? findParagraphForSelection(currentDocument.content, sentence.text) : sentence.text,
            pageContext: currentDocument?.content || sentence.text,
        }
        setSelectedSentence(sentence)
        setSelectedToken(null)
        setTextSelection(selection)
        setPdfSelection(null)
        setSavedNotice('')
        setActiveTab('dict')
        if (event) setPopupCoords({ x: event.clientX, y: event.clientY - 12 })
        void analyzeSelection(selection)
        if (currentDocument && sentences.length > 0) {
            updateReadingProgress(currentDocument.id, Math.round(((sentences.indexOf(sentence) + 1) / sentences.length) * 100))
        }
    }

    const handleTokenSelection = (sentence: ChineseSentenceAnalysis, token: ChineseToken, event?: React.MouseEvent) => {
        const selection: TextSelection = {
            selectedText: token.surface,
            sourceSentence: sentence.text,
            paragraphContext: currentDocument ? findParagraphForSelection(currentDocument.content, sentence.text) : sentence.text,
            pageContext: currentDocument?.content || sentence.text,
        }
        setSelectedSentence(sentence)
        setSelectedToken(token)
        setTextSelection(selection)
        setPdfSelection(null)
        setSavedNotice('')
        setActiveTab('dict')
        if (event) setPopupCoords({ x: event.clientX, y: event.clientY - 12 })
        void analyzeChineseText({
            selected_text: token.surface,
            source_sentence: sentence.text,
            paragraph_context: currentDocument ? findParagraphForSelection(currentDocument.content, sentence.text) : sentence.text,
            page_context: currentDocument?.content || sentence.text,
            domain_mode: settings.domainMode || 'auto',
            user_level: settings.targetHskLevel || 'HSK4',
        }).then((analysis) => {
            pushHistory(token.surface)
            void recordLookupWord({
                word: token.surface,
                translation: analysis.quick_meaning?.definitions_vi?.[0] || tokenVietnamese(token),
                pinyin: analysis.quick_meaning?.pinyin || token.pinyin,
                context: sentence.text,
                source_file: currentDocument?.title || '',
                source_document_id: currentDocument?.id || '',
                hsk_level: analysis.quick_meaning?.hsk_level ?? token.hsk_level ?? null,
                domain_tags: analysis.quick_meaning?.domain_tags || token.domain_tags || [],
            })
        })
    }

    const handleTextMouseSelection = (selection: TextSelection, coords: { x: number; y: number }) => {
        setTextSelection(selection)
        setPdfSelection(null)
        setSelectedToken(null)
        setSavedNotice('')
        setPopupCoords(coords)
    }

    const handlePdfSelection = (selection: PdfSelection | null) => {
        setPdfSelection(selection)
        setTextSelection(null)
        setSelectedToken(null)
        setSavedNotice('')
        if (!selection) {
            setPopupCoords(null)
            return
        }
        const activeSelection = window.getSelection()
        if (activeSelection && activeSelection.rangeCount > 0) {
            const rect = activeSelection.getRangeAt(0).getBoundingClientRect()
            setPopupCoords({ x: rect.left + rect.width / 2, y: rect.top })
        }
    }

    const handlePopupAnalyze = () => {
        if (pdfSelection) {
            void analyzeSelection(pdfSelection)
            return
        }
        if (textSelection) {
            void analyzeSelection(textSelection)
        }
    }

    const handleSave = async (specificToken?: ChineseToken, noteOverride?: string) => {
        if (!currentDocument && !specificToken) return
        const selection = pdfSelection || textSelection
        const surface = specificToken?.surface || selectedToken?.surface || selection?.selectedText || selectedSentence?.text || selectedSurface
        if (!surface) return

        const tokenToSave = buildContextualToken(surface, activeAnalysis, specificToken || selectedToken)
        const sentenceText = specificToken ? sourceSentence : selection?.sourceSentence || selectedSentence?.text || sourceSentence || surface
        const sentenceId = currentDocument && activeSentenceIndex >= 0 ? `${currentDocument.id}-${activeSentenceIndex + 1}` : `${currentDocument?.id || 'doc'}-${pdfSelection?.pageNumber || 1}-${Date.now()}`

        const annotation = await saveChineseAnnotation({
            token: tokenToSave,
            sentenceText,
            note: noteOverride || activeAnalysis?.grammar?.explanation_vi || activeAnalysis?.context?.explanation_vi || '',
            documentId: currentDocument?.id,
            pageId: 'page-1',
            pageNumber: pdfSelection?.pageNumber || 1,
            bboxJson: pdfSelection?.bboxJson,
            sentenceId,
        })
        setSavedNotice(`Đã lưu ${annotation.selected_text}`)
        pushHistory(surface)
    }

    const handleGenerateAiNote = async () => {
        const selection = pdfSelection || textSelection
        const text = selectedSurface || selection?.selectedText || selectedSentence?.text
        if (!text) return
        setActiveTab('ai')
        await generateAIContextReading({
            selected_text: text,
            source_sentence: sourceSentence || text,
            paragraph_context: selection?.paragraphContext || currentDocument?.content || sourceSentence || text,
            page_context: selection?.pageContext || currentDocument?.content || sourceSentence || text,
            domain_mode: activeAnalysis?.context?.domain || settings.domainMode || 'auto',
            user_level: settings.targetHskLevel || 'HSK4',
        })
    }

    const handleChatSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const question = chatInput.trim()
        if (!question || chatLoading) return
        const userMessage: ChatMessage = { id: `user-${Date.now()}`, role: 'user', content: question, timestamp: messageTime() }
        setChatMessages((messages) => [...messages, userMessage])
        setChatInput('')
        setChatLoading(true)

        try {
            const response = await fetch(`${API_BASE_URL}/ai/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question,
                    chat_history: chatMessages,
                    paragraph_context: selectedParagraphContext || sourceSentence || currentDocument?.content || selectedSurface || '',
                    model: 'gemini-2.5-flash',
                }),
            })
            if (!response.ok) throw new Error('Chat API failed')
            const result = await response.json()
            if (result.status === 'disabled_by_consent') {
                setChatMessages((messages) => [...messages, { id: `assistant-${Date.now()}`, role: 'assistant', content: 'Hãy bật tùy chọn chia sẻ ngữ cảnh cho AI trong mục Cài Đặt (Privacy) trước khi chat.', timestamp: messageTime() }])
            } else if (result.status === 'ok') {
                setChatMessages((messages) => [...messages, { id: `assistant-${Date.now()}`, role: 'assistant', content: result.response?.text || 'Không có câu trả lời từ AI.', timestamp: messageTime() }])
            } else {
                setChatMessages((messages) => [...messages, { id: `assistant-${Date.now()}`, role: 'assistant', content: `Lỗi: ${result.message}`, timestamp: messageTime() }])
            }
        } catch {
            setChatMessages((messages) => [...messages, { id: `assistant-${Date.now()}`, role: 'assistant', content: 'Không gọi được AI context endpoint. Hãy kiểm tra backend và cấu hình API key.', timestamp: messageTime() }])
        } finally {
            setChatLoading(false)
        }
    }

    const handleGenerateQuiz = async () => {
        if (quizLoading) return
        setQuizLoading(true)
        try {
            const response = await fetch(`${API_BASE_URL}/nlp/quiz`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...buildNlpPayload(),
                    text: currentDocument?.content || selectedParagraphContext || sourceSentence || selectedSurface,
                    limit: 8,
                }),
            })
            if (!response.ok) throw new Error(`Quiz generation failed: ${response.status}`)
            const result = (await response.json()) as BackendQuizResponse
            setQuizQuestions(result.questions || [])
            setQuizScore(0)
            setQuizFinished(false)
            setCurrentQuestionIndex(0)
            setSelectedAnswerIndex(null)
            if (!result.questions?.length) setSavedNotice('Backend chưa tìm đủ từ vựng/ngữ pháp để tạo quiz.')
            else setSavedNotice(`Đã tạo ${result.questions.length} câu hỏi từ backend NLP.`)
        } catch {
            setSavedNotice('Không gọi được backend tạo câu hỏi.')
        } finally {
            setQuizLoading(false)
        }
    }

    const handleQuizAnswer = (answerIndex: number) => {
        if (selectedAnswerIndex !== null) return
        const currentQuestion = quizQuestions[currentQuestionIndex]
        if (!currentQuestion) return
        setSelectedAnswerIndex(answerIndex)
        if (answerIndex === currentQuestion.answerIndex) setQuizScore((score) => score + 1)
        window.setTimeout(() => {
            if (currentQuestionIndex >= quizQuestions.length - 1) {
                setQuizFinished(true)
                return
            }
            setCurrentQuestionIndex((index) => index + 1)
            setSelectedAnswerIndex(null)
        }, 700)
    }

    const handleTranslateDocument = async () => {
        if (!currentDocument) return
        const translations = await translateCurrentDocument(currentDocument.id)
        if (currentDocument.type !== 'pdf' && !isSideBySide) toggleSideBySide()
        setSavedNotice(translations.length > 0 ? `Đã dịch ${translations.length} câu.` : 'Chưa có text để dịch tài liệu.')
    }

    const handleScanVocabulary = async () => {
        if (!currentDocument) return
        const items = await scanDocumentVocabulary(currentDocument.id, 30)
        setSavedNotice(items.length > 0 ? `Đã quét ${items.length} từ/cụm gợi ý.` : 'Chưa tìm được từ/cụm phù hợp.')
    }

    const handleCreateAutoReviewItems = async () => {
        if (!currentDocument) return
        const created = await createAutoReviewItems(currentDocument.id, 20)
        setSavedNotice(created > 0 ? `Đã tạo ${created} flashcards tự động.` : 'Không có flashcard mới để tạo.')
    }

    const handleUploadFile = async (file: File) => {
        const newDoc = await translateFile(file)
        if (newDoc) {
            setCurrentDocument(newDoc)
            setCurrentView('documents')
        }
    }

    const handleCreatePastedDocument = (title: string, hskLevel: string, content: string) => {
        const docId = generateId()
        addDocument({
            id: docId, title, type: 'txt', content, sourceFileName: `${hskLevel} pasted text`,
            sentences: [], uploadedAt: new Date(), readingProgress: 0, highlights: [], notes: [],
        })
        setPasteModalOpen(false)
        setCurrentView('documents')
    }

    return {
        store, currentView, setCurrentView, selectedSentence, selectedToken, textSelection, pdfSelection, popupCoords, setPopupCoords,
        savedNotice, setSavedNotice, showFontSizeMenu, setShowFontSizeMenu, pasteModalOpen, setPasteModalOpen, zoomPercent, setZoomPercent,
        activeTab, setActiveTab, historyList, chatOpen, setChatOpen, chatInput, setChatInput, chatMessages, chatLoading,
        contextTranslation, contextTranslationLoading, contextTranslateScope, quizQuestions, quizLoading, quizScore, quizFinished,
        currentQuestionIndex, selectedAnswerIndex, sentences, currentTranslations, activeSentenceIndex, hskLabel, candidateSelection,
        activeAnalysis, selectedSurface, sourceSentence, quickVi, quickEn, quickPinyin, selectedParagraphContext, selectedSentenceTranslation,
        selectedLiteralTranslation, loadingAnalysis, handleTranslateScope, handleSentenceClick, handleTokenSelection, handleTextMouseSelection,
        handlePdfSelection, handlePopupAnalyze, handleSave, handleGenerateAiNote, handleChatSubmit, handleGenerateQuiz, handleQuizAnswer,
        handleTranslateDocument, handleScanVocabulary, handleCreateAutoReviewItems, handleUploadFile, handleCreatePastedDocument,
        analyzeSelection, aiContext, isGeneratingAIContext, setTextSelection, setPdfSelection, removeAnnotation
    }
}
