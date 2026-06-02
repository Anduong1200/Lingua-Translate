import { useEffect, useMemo, useState, type FormEvent } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import {
    Bookmark,
    BookOpen,
    BookMarked,
    Brain,
    Check,
    FileText,
    Highlighter,
    History,
    Layers,
    Loader2,
    Minus,
    Plus,
    Search,
    Settings,
    Sparkles,
    Volume2,
    Columns,
    Type,
    UserCircle,
    MessageSquare,
    Award,
    RefreshCw,
    AlertCircle,
    Play,
    Send,
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import { AnnotationRecord, ChineseSentenceAnalysis, ChineseToken } from '@/types'
import { estimateHskLabel, getVietnameseDefinition } from '@/lib/chinese'
import {
    buildQuizQuestions,
    ChatMessage,
    findSentenceForSelection,
    formatAiChatReply,
    isSelectableToken,
    messageTime,
    PanelTab,
    PdfSelection,
    QuizQuestion,
    speakChinese,
} from './readerUtils'
import ReaderTopBar from './components/ReaderTopBar'
import ChatPanel from './components/ChatPanel'
import QuizPanel from './components/QuizPanel'
import VocabPanel from './components/VocabPanel'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

// ─── PDF sub-components ───────────────────────────────────────────────────────

function PdfDocumentViewer({
    sourceUrl,
    onSelection,
    annotations,
    zoom = 100,
}: {
    sourceUrl: string
    onSelection: (selection: PdfSelection | null) => void
    annotations: AnnotationRecord[]
    zoom?: number
}) {
    const [pdfDocument, setPdfDocument] = useState<any>(null)
    const [pageNumbers, setPageNumbers] = useState<number[]>([])
    const [error, setError] = useState('')
    const viewerRef = React.useRef<HTMLDivElement>(null)

    useEffect(() => {
        let cancelled = false
        setPdfDocument(null)
        setPageNumbers([])
        setError('')

        pdfjsLib
            .getDocument(sourceUrl)
            .promise.then((document) => {
                if (cancelled) return
                setPdfDocument(document)
                setPageNumbers(Array.from({ length: document.numPages }, (_, index) => index + 1))
            })
            .catch(() => {
                if (!cancelled) setError('Không mở được PDF bằng PDF.js. Hãy tải lại file trong phiên hiện tại.')
            })

        return () => {
            cancelled = true
        }
    }, [sourceUrl])

    const handleMouseUp = () => {
        const selection = window.getSelection()
        const selectedText = selection?.toString().replace(/\s+/g, '').trim()
        if (!selection || !selectedText || selection.rangeCount === 0) {
            onSelection(null)
            return
        }

        const range = selection.getRangeAt(0)
        const rangeRect = range.getBoundingClientRect()
        const pageElement = (range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
            ? range.commonAncestorContainer
            : range.commonAncestorContainer.parentElement
        )?.parentElement?.closest('[data-page-number]') as HTMLElement | null

        const fallbackPageElement = document.elementFromPoint(rangeRect.left, rangeRect.top)?.closest('[data-page-number]') as HTMLElement | null
        const resolvedPage = pageElement || fallbackPageElement
        if (!resolvedPage) return

        const pageRect = resolvedPage.getBoundingClientRect()
        const pageContext = resolvedPage.dataset.pageText || selectedText
        const sourceSentence = findSentenceForSelection(pageContext, selectedText)
        const bbox = {
            x_ratio: (rangeRect.left - pageRect.left) / pageRect.width,
            y_ratio: (rangeRect.top - pageRect.top) / pageRect.height,
            w_ratio: rangeRect.width / pageRect.width,
            h_ratio: rangeRect.height / pageRect.height,
        }

        onSelection({
            selectedText,
            pageNumber: Number(resolvedPage.dataset.pageNumber || 1),
            bboxJson: JSON.stringify(bbox),
            sourceSentence,
            paragraphContext: sourceSentence,
            pageContext,
        })
    }

    if (error) {
        return (
            <div className="mx-auto flex h-64 max-w-3xl flex-col items-center justify-center rounded-2xl border border-red-100 bg-white p-6 text-center text-red-600 custom-shadow">
                <p className="font-bold">{error}</p>
            </div>
        )
    }

    if (!pdfDocument) {
        return (
            <div className="flex h-64 flex-col items-center justify-center gap-3 text-[#006b5f]">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-sm font-bold">PDF.js đang render canvas + text layer...</p>
            </div>
        )
    }

    return (
        <div ref={viewerRef} onMouseUp={handleMouseUp} className="mx-auto flex w-full min-w-fit flex-col gap-6 items-center">
            {pageNumbers.map((pageNumber) => (
                <PdfPage
                    key={pageNumber}
                    pdfDocument={pdfDocument}
                    pageNumber={pageNumber}
                    annotations={annotations.filter((annotation) => annotation.page_number === pageNumber)}
                    zoom={zoom}
                />
            ))}
        </div>
    )
}

function PdfPage({
    pdfDocument,
    pageNumber,
    annotations,
    zoom = 100,
}: {
    pdfDocument: any
    pageNumber: number
    annotations: AnnotationRecord[]
    zoom?: number
}) {
    const pageRef = React.useRef<HTMLDivElement>(null)
    const canvasRef = React.useRef<HTMLCanvasElement>(null)
    const textLayerRef = React.useRef<HTMLDivElement>(null)
    const [size, setSize] = useState({ width: 1, height: 1 })

    useEffect(() => {
        let cancelled = false
        let renderTask: any = null

        async function renderPage() {
            const page = await pdfDocument.getPage(pageNumber)
            if (cancelled) return

            const baseViewport = page.getViewport({ scale: 1 })
            const targetWidth = Math.min(760, Math.max(320, window.innerWidth - 480))
            const scale = (targetWidth / baseViewport.width) * (zoom / 100)
            const viewport = page.getViewport({ scale })
            setSize({ width: viewport.width, height: viewport.height })

            const canvas = canvasRef.current
            const context = canvas?.getContext('2d')
            if (!canvas || !context) return

            const outputScale = window.devicePixelRatio || 1
            canvas.width = Math.floor(viewport.width * outputScale)
            canvas.height = Math.floor(viewport.height * outputScale)
            canvas.style.width = `${viewport.width}px`
            canvas.style.height = `${viewport.height}px`

            renderTask = page.render({
                canvasContext: context,
                viewport,
                transform: outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined,
            })
            await renderTask.promise
            if (cancelled) return

            const textContent = await page.getTextContent()
            const textLayer = textLayerRef.current
            if (!textLayer) return
            textLayer.replaceChildren()
            if (pageRef.current) {
                pageRef.current.dataset.pageText = textContent.items.map((item: any) => item.str || '').join('')
            }

            textContent.items.forEach((item: any) => {
                if (!item.str) return
                const tx = pdfjsLib.Util.transform(viewport.transform, item.transform)
                const angle = Math.atan2(tx[1], tx[0])
                const fontHeight = Math.hypot(tx[2], tx[3])
                const span = document.createElement('span')
                span.textContent = item.str
                span.style.position = 'absolute'
                span.style.left = `${tx[4]}px`
                span.style.top = `${tx[5] - fontHeight}px`
                span.style.height = `${fontHeight}px`
                span.style.fontSize = `${fontHeight}px`
                span.style.fontFamily = 'sans-serif'
                span.style.color = 'rgba(15, 23, 42, 0.01)'
                span.style.whiteSpace = 'pre'
                span.style.transformOrigin = '0 0'
                span.style.transform = `rotate(${angle}rad)`
                textLayer.appendChild(span)
            })
        }

        renderPage()

        return () => {
            cancelled = true
            renderTask?.cancel?.()
        }
    }, [pdfDocument, pageNumber, zoom])

    return (
        <div
            ref={pageRef}
            data-page-number={pageNumber}
            className="relative mx-auto overflow-hidden rounded-2xl border border-slate-200 bg-white custom-shadow"
            style={{ width: size.width, height: size.height }}
        >
            <canvas ref={canvasRef} className="absolute inset-0" />
            {annotations.map((annotation) => {
                const bbox = safeBbox(annotation.bbox_json, size.width, size.height)
                if (!bbox) return null
                return (
                    <div
                        key={annotation.id}
                        className="pointer-events-none absolute rounded border border-amber-400 bg-amber-200/35"
                        style={{
                            left: bbox.x,
                            top: bbox.y,
                            width: Math.max(8, bbox.width),
                            height: Math.max(8, bbox.height),
                        }}
                        title={annotation.selected_text}
                    />
                )
            })}
            <div
                ref={textLayerRef}
                className="absolute inset-0 select-text"
                style={{
                    width: size.width,
                    height: size.height,
                    userSelect: 'text',
                    WebkitUserSelect: 'text',
                }}
            />
        </div>
    )
}

function safeBbox(value?: string, pageWidth: number = 1, pageHeight: number = 1) {
    if (!value) return null
    try {
        const bbox = JSON.parse(value) as any
        if (
            typeof bbox.x_ratio === 'number' &&
            typeof bbox.y_ratio === 'number' &&
            typeof bbox.w_ratio === 'number' &&
            typeof bbox.h_ratio === 'number'
        ) {
            return {
                x: bbox.x_ratio * pageWidth,
                y: bbox.y_ratio * pageHeight,
                width: bbox.w_ratio * pageWidth,
                height: bbox.h_ratio * pageHeight,
            }
        }
        if (
            typeof bbox.x === 'number' &&
            typeof bbox.y === 'number' &&
            typeof bbox.width === 'number' &&
            typeof bbox.height === 'number'
        ) {
            return bbox as { x: number; y: number; width: number; height: number }
        }
        return null
    } catch {
        return null
    }
}

// ─── Main ReaderPage ──────────────────────────────────────────────────────────

import React from 'react'

export default function ReaderPage() {
    const {
        currentDocument,
        documents,
        setCurrentDocument,
        chineseAnalysis,
        contextualAnalysis,
        aiContext,
        isGeneratingAIContext,
        analyzeChineseText,
        generateAIContextReading,
        saveChineseAnnotation,
        saveUserCorrection,
        recordLookupWord,
        markKnownWord,
        savedWords,
        annotations,
        updateReadingProgress,
        settings,
        isSideBySide,
        toggleSideBySide,
        updateSettings,
        documentTranslations,
        vocabularySuggestions,
        isTranslatingDocument,
        isScanningVocabulary,
        translateCurrentDocument,
        scanDocumentVocabulary,
        createAutoReviewItems,
    } = useStore()

    const [selectedSentence, setSelectedSentence] = useState<ChineseSentenceAnalysis | null>(null)
    const [selectedToken, setSelectedToken] = useState<ChineseToken | null>(null)
    const [pdfSelection, setPdfSelection] = useState<PdfSelection | null>(null)
    const [popupCoords, setPopupCoords] = useState<{ x: number, y: number } | null>(null)
    const [note, setNote] = useState('')
    const [meaningOverride, setMeaningOverride] = useState('')
    const [savedNotice, setSavedNotice] = useState('')
    const [showFontSizeMenu, setShowFontSizeMenu] = useState(false)

    // Sidebar State
    const [activeTab, setActiveTab] = useState<PanelTab>('chat')
    const [chatInput, setChatInput] = useState('')
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
    const [chatLoading, setChatLoading] = useState(false)
    const [pdfZoom, setPdfZoom] = useState(100)
    const handleZoomOut = () => setPdfZoom(z => Math.max(50, z - 10))
    const handleZoomIn = () => setPdfZoom(z => Math.min(250, z + 10))
    const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([])
    const [quizLoading, setQuizLoading] = useState(false)
    const [quizScore, setQuizScore] = useState(0)
    const [quizFinished, setQuizFinished] = useState(false)
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
    const [selectedAnswerIndex, setSelectedAnswerIndex] = useState<number | null>(null)

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement
            if (target.closest('.floating-popup')) return
            if (window.getSelection()?.isCollapsed) {
                setPopupCoords(null)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    useEffect(() => {
        if (currentDocument?.content && !(currentDocument.type === 'pdf' && currentDocument.sourceUrl)) {
            analyzeChineseText(currentDocument.content).then((analysis) => {
                setSelectedSentence(analysis.sentences[0] ?? null)
                setSelectedToken(null)
            })
        }
    }, [currentDocument?.id])

    const sentences = chineseAnalysis?.sentences ?? []
    const selectedWordSaved = selectedToken ? savedWords.some((word) => word.word === selectedToken.surface) : false

    const activeSentenceIndex = useMemo(() => {
        if (!selectedSentence) return 0
        return Math.max(0, sentences.findIndex((sentence) => sentence.text === selectedSentence.text))
    }, [selectedSentence, sentences])

    const hskLabel = selectedSentence ? estimateHskLabel(selectedSentence.tokens) : 'HSK'
    const viDefinition = getVietnameseDefinition(selectedToken)
    const enDefinition = selectedToken?.definitions.find((definition) => definition.lang === 'en')?.value ?? ''
    const candidateSelection = selectedToken?.surface || pdfSelection?.selectedText || selectedSentence?.text || ''
    const contextualSelectionText = contextualAnalysis?.selection?.selected_text || contextualAnalysis?.selection?.text || ''
    const contextualSourceSentence = contextualAnalysis?.selection?.source_sentence || contextualAnalysis?.context?.source_sentence || ''
    const activeAnalysis =
        contextualAnalysis?.selection &&
        (contextualSelectionText === candidateSelection ||
            (!selectedToken && !pdfSelection && contextualSourceSentence === selectedSentence?.text))
            ? contextualAnalysis
            : null
    const selectedSurface = activeAnalysis?.selection?.selected_text || activeAnalysis?.selection?.text || selectedToken?.surface || pdfSelection?.selectedText || ''
    const quickMeaning = activeAnalysis?.quick_meaning
    const naturalTranslation = activeAnalysis?.translations?.natural_vi
    const literalTranslation = activeAnalysis?.translations?.literal_vi
    const sourceSentence = activeAnalysis?.selection?.source_sentence || selectedSentence?.text || ''
    const quickVi = quickMeaning?.definitions_vi?.join('; ') || viDefinition
    const quickEn = quickMeaning?.definitions_en?.join('; ') || enDefinition
    const quickPinyin = quickMeaning?.pinyin || selectedToken?.pinyin || ''

    // ─── Handlers ─────────────────────────────────────────────────────────────

    const handleSentenceClick = (sentence: ChineseSentenceAnalysis, event?: React.MouseEvent) => {
        setSelectedSentence(sentence)
        setSelectedToken(null)
        setPdfSelection(null)
        setSavedNotice('')
        setActiveTab('vocab')
        if (event) {
            setPopupCoords({ x: event.clientX, y: event.clientY })
        }
        void analyzeChineseText({
            selected_text: sentence.text,
            source_sentence: sentence.text,
            paragraph_context: currentDocument?.content || sentence.text,
            page_context: currentDocument?.content || sentence.text,
            domain_mode: settings.domainMode || 'auto',
            user_level: settings.targetHskLevel || 'HSK4',
        })
        if (currentDocument && sentences.length > 0) {
            updateReadingProgress(currentDocument.id, Math.round(((sentences.indexOf(sentence) + 1) / sentences.length) * 100))
        }
    }

    const handlePdfSelection = (selection: PdfSelection | null) => {
        setPdfSelection(selection)
        if (selection) {
            setSavedNotice('')
            const isGarbled = selection.selectedText.includes('\uFFFD') || /^[^\w\u4e00-\u9fa5]+$/.test(selection.selectedText)
            if (isGarbled) {
                setSavedNotice('PDF text layer không sạch. Hãy chọn đoạn ngắn hơn.')
            } else if (selection.selectedText.trim().length === 0) {
                setSavedNotice('PDF này không có selectable text. OCR hiện là experimental.')
            }
            const sel = window.getSelection()
            if (sel && sel.rangeCount > 0) {
                const rect = sel.getRangeAt(0).getBoundingClientRect()
                setPopupCoords({ x: rect.left + rect.width / 2, y: rect.top })
            } else {
                setPopupCoords(null)
            }
        } else {
            setPopupCoords(null)
        }
    }

    const handleTokenSelection = async (sentence: ChineseSentenceAnalysis, token: ChineseToken, event?: React.MouseEvent) => {
        setSelectedSentence(sentence)
        setSelectedToken(token)
        setPdfSelection(null)
        setSavedNotice('')
        setActiveTab('vocab')
        if (event) setPopupCoords({ x: event.clientX, y: event.clientY })
        const analysis = await analyzeChineseText({
            selected_text: token.surface,
            source_sentence: sentence.text,
            paragraph_context: currentDocument?.content || sentence.text,
            page_context: currentDocument?.content || sentence.text,
            domain_mode: settings.domainMode || 'auto',
            user_level: settings.targetHskLevel || 'HSK4',
        })
        const quick = analysis.quick_meaning
        void recordLookupWord({
            word: token.surface,
            translation: quick?.definitions_vi?.[0] || getVietnameseDefinition(token),
            pinyin: quick?.pinyin || token.pinyin,
            context: sentence.text,
            source_file: currentDocument?.title || '',
            source_document_id: currentDocument?.id || '',
            hsk_level: quick?.hsk_level ?? token.hsk_level ?? null,
            domain_tags: quick?.domain_tags || token.domain_tags || [],
        })
    }

    const handleSave = async () => {
        if (!selectedToken && !pdfSelection) return

        let tokenToSave: ChineseToken
        let sentenceText = ''

        if (selectedToken) {
            tokenToSave = {
                ...selectedToken,
                surface: selectedSurface || selectedToken.surface,
                pinyin: quickPinyin || selectedToken.pinyin,
            }
            sentenceText = selectedSentence?.text || ''
        } else if (pdfSelection) {
            const surface = selectedSurface || pdfSelection.selectedText
            tokenToSave = {
                surface,
                pinyin: quickPinyin || activeAnalysis?.quick_meaning?.pinyin || '',
                definitions_vi: activeAnalysis?.quick_meaning?.definitions_vi || [],
                definitions_en: activeAnalysis?.quick_meaning?.definitions_en || [],
                hsk_level: activeAnalysis?.quick_meaning?.hsk_level || null,
                domain_tags: activeAnalysis?.quick_meaning?.domain_tags || [],
                confidence: activeAnalysis?.quick_meaning?.confidence || 0.5,
                normalized: surface,
                definitions: [],
            }
            sentenceText = pdfSelection.sourceSentence
        } else {
            return
        }

        const sentenceId = activeSentenceIndex !== undefined && activeSentenceIndex >= 0
            ? `${currentDocument?.id || 'doc'}-${activeSentenceIndex + 1}`
            : `${currentDocument?.id || 'doc'}-pdf-${pdfSelection?.pageNumber || 1}-${Date.now()}`

        const annotation = await saveChineseAnnotation({
            token: tokenToSave,
            sentenceText: sentenceText,
            note,
            documentId: currentDocument?.id,
            pageId: 'page-1',
            pageNumber: pdfSelection?.pageNumber || 1,
            bboxJson: pdfSelection?.bboxJson,
            sentenceId: sentenceId,
        })
        setSavedNotice(`Đã lưu annotation ${annotation.selected_text}`)
    }

    const handleChatSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const question = chatInput.trim()
        if (!question || chatLoading) return

        const userMessage: ChatMessage = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: question,
            timestamp: messageTime(),
        }
        setChatMessages((messages) => [...messages, userMessage])
        setChatInput('')
        setChatLoading(true)

        try {
            const documentContext = currentDocument?.content || sourceSentence || selectedSurface || question
            const result = await generateAIContextReading({
                selected_text: selectedSurface || question,
                source_sentence: sourceSentence || findSentenceForSelection(documentContext, selectedSurface || question),
                paragraph_context: `${documentContext}\n\nCâu hỏi người dùng: ${question}`,
                page_context: `${pdfSelection?.pageContext || documentContext}\n\nCâu hỏi người dùng: ${question}`,
                domain_mode: activeAnalysis?.context?.domain || settings.domainMode || 'auto',
                user_level: settings.targetHskLevel || 'HSK4',
            })
            setChatMessages((messages) => [
                ...messages,
                {
                    id: `assistant-${Date.now()}`,
                    role: 'assistant',
                    content: formatAiChatReply(result),
                    timestamp: messageTime(),
                },
            ])
        } catch {
            setChatMessages((messages) => [
                ...messages,
                {
                    id: `assistant-${Date.now()}`,
                    role: 'assistant',
                    content: 'Không gọi được AI context endpoint. Hãy kiểm tra backend và cấu hình Google API keys.',
                    timestamp: messageTime(),
                },
            ])
        } finally {
            setChatLoading(false)
        }
    }

    const handleGenerateQuiz = async () => {
        if (quizLoading) return
        setQuizLoading(true)
        setSavedNotice('')
        try {
            let sourceSentences = sentences
            if (!sourceSentences.length && currentDocument?.content) {
                const analysis = await analyzeChineseText(currentDocument.content)
                sourceSentences = analysis.sentences
            }
            const questions = buildQuizQuestions(sourceSentences)
            setQuizQuestions(questions)
            setQuizScore(0)
            setQuizFinished(false)
            setCurrentQuestionIndex(0)
            setSelectedAnswerIndex(null)
            if (!questions.length) {
                setSavedNotice('Chưa đủ từ vựng để tạo quiz. Hãy chọn hoặc quét thêm nội dung tiếng Trung.')
            }
        } finally {
            setQuizLoading(false)
        }
    }

    const handleQuizAnswer = (answerIndex: number) => {
        if (selectedAnswerIndex !== null) return
        const currentQuestion = quizQuestions[currentQuestionIndex]
        if (!currentQuestion) return
        setSelectedAnswerIndex(answerIndex)
        if (answerIndex === currentQuestion.answerIndex) {
            setQuizScore((score) => score + 1)
        }
        window.setTimeout(() => {
            if (currentQuestionIndex >= quizQuestions.length - 1) {
                setQuizFinished(true)
                return
            }
            setCurrentQuestionIndex((index) => index + 1)
            setSelectedAnswerIndex(null)
        }, 700)
    }

    const currentTranslations = currentDocument ? documentTranslations[currentDocument.id] || [] : []
    const localJoinedViTranslation = (sentence: ChineseSentenceAnalysis) =>
        sentence.tokens
            .map((token) => {
                if (token.pos === 'punctuation') return token.surface
                const defs = token.definitions_vi || token.definitions?.filter((definition) => definition.lang === 'vi').map((definition) => definition.value) || []
                return defs.length > 0 ? defs[0].split(';')[0].split(',')[0] : token.surface
            })
            .join('')

    const handleTranslateDocument = async () => {
        if (!currentDocument) return
        setSavedNotice('')
        const translations = await translateCurrentDocument(currentDocument.id)
        if (currentDocument.type !== 'pdf' && !isSideBySide) {
            toggleSideBySide()
        }
        setSavedNotice(translations.length > 0 ? `Đã dịch ${translations.length} câu bằng backend local.` : 'Chưa có text để dịch tài liệu.')
    }

    const handleScanVocabulary = async () => {
        if (!currentDocument) return
        setSavedNotice('')
        const items = await scanDocumentVocabulary(currentDocument.id, 30)
        setSavedNotice(items.length > 0 ? `Đã quét ${items.length} từ/cụm gợi ý.` : 'Chưa tìm được từ/cụm phù hợp để gợi ý.')
    }

    const handleCreateAutoReviewItems = async () => {
        if (!currentDocument) return
        setSavedNotice('')
        const created = await createAutoReviewItems(currentDocument.id, 20)
        setSavedNotice(created > 0 ? `Đã tạo ${created} flashcards tự động.` : 'Không có flashcard mới để tạo.')
    }

    const handlePopupAnalyze = () => {
        setActiveTab('vocab')
        if (pdfSelection) {
            void (async () => {
                const analysis = await analyzeChineseText({
                    selected_text: pdfSelection.selectedText,
                    source_sentence: pdfSelection.sourceSentence,
                    paragraph_context: pdfSelection.paragraphContext,
                    page_context: pdfSelection.pageContext,
                    domain_mode: settings.domainMode || 'auto',
                    user_level: settings.targetHskLevel || 'HSK4',
                })
                const firstSentence = analysis.sentences?.[0] ?? null
                const firstToken = firstSentence?.tokens.find(isSelectableToken)
                if (firstToken) setSelectedToken(firstToken)
                setSelectedSentence(firstSentence)
                void recordLookupWord({
                    word: pdfSelection.selectedText,
                    translation: analysis.quick_meaning?.definitions_vi?.[0] || (firstToken ? getVietnameseDefinition(firstToken) : ''),
                    pinyin: analysis.quick_meaning?.pinyin || firstToken?.pinyin || '',
                    context: pdfSelection.sourceSentence,
                    source_file: currentDocument?.title || '',
                    source_document_id: currentDocument?.id || '',
                    hsk_level: analysis.quick_meaning?.hsk_level ?? firstToken?.hsk_level ?? null,
                    domain_tags: analysis.quick_meaning?.domain_tags || firstToken?.domain_tags || [],
                })
            })()
        }
    }

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="flex h-screen flex-col overflow-hidden bg-gradient-to-br from-[#f8fafc] via-[#f0f9f9]/20 to-[#edf8f8] dark:from-[#0b0f19] dark:via-[#090d16] dark:to-[#020617] text-slate-800 dark:text-slate-200 transition-colors selection:bg-[#006b5f]/20 relative">
            <ReaderTopBar
                pdfZoom={pdfZoom}
                onZoomOut={handleZoomOut}
                onZoomIn={handleZoomIn}
                documentTitle={currentDocument?.title || ''}
            />

            <div className="flex min-h-0 flex-1 flex-col md:flex-row p-4 gap-4">
            <section className="flex min-h-0 flex-1 flex-col transition-all rounded-3xl border border-white/60 bg-gradient-to-br from-white/70 to-slate-50/20 shadow-2xl dark:border-slate-800/40 dark:from-slate-900/60 dark:to-slate-950/40 backdrop-blur-xl">
                <div className="m-4 flex flex-col gap-3 rounded-full border border-white/60 bg-white/70 px-4 py-2 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/70 lg:flex-row lg:items-center lg:justify-between hidden">
                    {/* Hide old floating bar since we moved items to top bar or they are redundant */}
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#006b5f]/15 text-[#006b5f]">
                            <BookOpen className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="truncate text-lg font-black text-[#006b5f] dark:text-teal-300">
                                {currentDocument?.title || 'Chưa chọn tài liệu'}
                            </h1>
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                Hanora NLP Reader · {sentences.length} câu · {hskLabel}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2">
                        <div className="hidden items-center gap-2 rounded-full border border-white/60 bg-white/65 px-3 py-2 text-xs font-black text-slate-600 backdrop-blur md:flex dark:border-slate-800 dark:bg-slate-900/65 dark:text-slate-300">
                            <button onClick={handleZoomOut}><Minus className="h-3.5 w-3.5 text-slate-400 hover:text-[#006b5f] transition-colors" /></button>
                            <span>{pdfZoom}%</span>
                            <button onClick={handleZoomIn}><Plus className="h-3.5 w-3.5 text-slate-400 hover:text-[#006b5f] transition-colors" /></button>
                        </div>
                        <div className="relative">
                            <button
                                onClick={() => setShowFontSizeMenu(!showFontSizeMenu)}
                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/60 bg-white/70 text-slate-500 transition-colors hover:bg-[#d4e3ff]/60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
                                title="Cỡ chữ"
                            >
                                <Type className="h-4 w-4" />
                            </button>
                            {showFontSizeMenu && (
                                <div className="absolute right-0 mt-2 z-50 w-36 rounded-xl border border-[#006b5f]/15 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 shadow-xl">
                                    <p className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Cỡ chữ đầu đọc</p>
                                    {(['small', 'medium', 'large'] as const).map((sz) => (
                                        <button
                                            key={sz}
                                            onClick={() => {
                                                updateSettings({ fontSize: sz })
                                                setShowFontSizeMenu(false)
                                            }}
                                            className={`block w-full text-left rounded-lg px-2.5 py-2 text-xs font-black capitalize ${
                                                settings.fontSize === sz
                                                    ? 'bg-[#006b5f]/10 text-[#006b5f] dark:bg-[#006b5f]/20 dark:text-[#006b5f]/90'
                                                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                                            }`}
                                        >
                                            {sz === 'small' ? 'Nhỏ' : sz === 'large' ? 'Lớn' : 'Vừa'}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <button
                            onClick={handleTranslateDocument}
                            disabled={!currentDocument || isTranslatingDocument}
                            className="flex h-9 items-center gap-1.5 rounded-lg border border-[#a4c9ff]/60 bg-[#d4e3ff]/75 px-3 text-xs font-black text-[#004883] transition-all hover:bg-[#a4c9ff]/50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-cyan-900/50 dark:bg-cyan-950/30 dark:text-cyan-300"
                            title="Dịch tài liệu tự động bằng backend local"
                        >
                            {isTranslatingDocument ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                            <span className="hidden xl:inline">Dịch tài liệu</span>
                        </button>

                        <button
                            onClick={handleScanVocabulary}
                            disabled={!currentDocument || isScanningVocabulary}
                            className="flex h-9 items-center gap-1.5 rounded-lg border border-white/60 bg-white/75 px-3 text-xs font-black text-[#006b5f] transition-all hover:bg-[#006b5f]/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-teal-300 dark:hover:bg-slate-800"
                            title="Tra từ thông minh trong tài liệu"
                        >
                            {isScanningVocabulary ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                            <span className="hidden xl:inline">Quét từ</span>
                        </button>

                        <button
                            onClick={handleCreateAutoReviewItems}
                            disabled={!currentDocument || isScanningVocabulary}
                            className="flex h-9 items-center gap-1.5 rounded-lg border border-[#bbcac6]/50 bg-white/75 px-3 text-xs font-black text-[#3f484d] transition-all hover:bg-[#dbe4ea]/70 disabled:cursor-not-allowed disabled:opacity-60 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300"
                            title="Tạo flashcards tự động từ từ vựng quan trọng"
                        >
                            <Plus className="h-4 w-4" />
                            <span className="hidden xl:inline">Flashcards</span>
                        </button>

                        {currentDocument?.type !== 'pdf' && (
                            <button
                                onClick={toggleSideBySide}
                                className={`flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-black transition-all ${
                                    isSideBySide
                                        ? 'border-[#006b5f] bg-[#006b5f]/15 text-[#006b5f] dark:border-teal-800 dark:bg-[#006b5f]/25 dark:text-teal-400'
                                        : 'border-white/60 bg-white/75 text-slate-500 hover:bg-[#006b5f]/10 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'
                                }`}
                                title="Xem bản dịch song song"
                            >
                                <Columns className="h-4 w-4" />
                                <span className="hidden sm:inline">Dịch song song</span>
                            </button>
                        )}

                        <select
                            value={currentDocument?.id || ''}
                            onChange={(event) => {
                                const doc = documents.find((item) => item.id === event.target.value) ?? null
                                setCurrentDocument(doc)
                            }}
                            className="max-w-[180px] rounded-lg border border-white/60 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-600 outline-none transition-all focus:border-[#006b5f] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:focus:border-slate-700"
                        >
                            {documents.map((doc) => (
                                <option key={doc.id} value={doc.id}>
                                    {doc.title}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className={`relative min-h-0 flex-1 overflow-y-auto px-4 py-8 scrollbar-hide md:px-10 transition-colors ${currentDocument?.type === 'pdf' ? 'bg-[#0f172a] dark:bg-[#020617] rounded-3xl mx-4 mb-4 shadow-2xl flex flex-col items-center border border-slate-800/80 w-full' : 'bg-transparent'}`}>
                    {selectedSurface && popupCoords && (
                        <div
                            style={{
                                position: 'fixed',
                                left: Math.min(window.innerWidth - 200, Math.max(10, popupCoords.x - 100)),
                                top: Math.max(10, popupCoords.y - 70),
                            }}
                            className="floating-popup z-[100] flex items-center gap-1.5 rounded-2xl border border-white/10 bg-slate-900/95 px-3 py-2 shadow-2xl shadow-black/50 backdrop-blur-xl transition-all"
                        >
                            <button
                                onClick={handlePopupAnalyze}
                                className="group flex flex-col items-center gap-1 text-teal-300 hover:text-teal-200 px-2"
                                title="Analyze"
                            >
                                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-500/10 transition-colors group-hover:bg-teal-500/20">
                                    <Brain className="h-4 w-4" />
                                </span>
                                <span className="text-[10px] font-black">Analyze</span>
                            </button>
                            <div className="h-8 w-px bg-slate-700/60" />
                            <button
                                onClick={handleSave}
                                disabled={!selectedToken && !pdfSelection}
                                className="group flex flex-col items-center gap-1 text-slate-300 hover:text-white px-2 disabled:cursor-not-allowed disabled:opacity-45"
                                title="Highlight"
                            >
                                <span className="flex h-8 w-8 items-center justify-center rounded-full transition-colors group-hover:bg-blue-500/20">
                                    <Highlighter className="h-4 w-4" />
                                </span>
                                <span className="text-[10px] font-black">Highlight</span>
                            </button>
                            <div className="h-8 w-px bg-slate-700/60" />
                            <button
                                onClick={() => setActiveTab('vocab')}
                                className="group flex flex-col items-center gap-1 text-slate-300 hover:text-white px-2"
                                title="Review"
                            >
                                <span className="flex h-8 w-8 items-center justify-center rounded-full transition-colors group-hover:bg-amber-500/20">
                                    <BookMarked className="h-4 w-4" />
                                </span>
                                <span className="text-[10px] font-black">Review</span>
                            </button>
                        </div>
                    )}
                    {currentDocument?.type === 'pdf' && currentDocument.sourceUrl ? (
                        <PdfDocumentViewer
                            sourceUrl={currentDocument.sourceUrl}
                            onSelection={handlePdfSelection}
                            annotations={annotations.filter((annotation) => annotation.document_id === currentDocument.id)}
                            zoom={pdfZoom}
                        />
                    ) : (
                        <article className="relative mx-auto min-h-[1000px] w-full max-w-[800px] rounded-3xl border border-white/40 bg-white/70 dark:border-slate-800/80 dark:bg-slate-900/70 p-8 shadow-xl backdrop-blur-xl md:p-12 glass-card">
                            {isSideBySide ? (
                                <div className="space-y-6">
                                    {sentences.map((sentence, sentenceIndex) => {
                                        const active = selectedSentence?.text === sentence.text
                                        const backendTranslation = currentTranslations[sentenceIndex]
                                        const sentenceNaturalTranslation = backendTranslation?.natural_vi || localJoinedViTranslation(sentence)
                                        const sentenceLiteralTranslation = backendTranslation?.literal_vi
                                        return (
                                            <div
                                                key={`sbs-${sentence.text}-${sentenceIndex}`}
                                                className={`grid grid-cols-1 md:grid-cols-2 gap-5 p-4 rounded-2xl border transition-all ${
                                                    active
                                                        ? 'border-[#006b5f] bg-[#006b5f]/10 shadow-sm dark:border-teal-800 dark:bg-[#006b5f]/20'
                                                        : 'border-transparent hover:border-[#bbcac6]/40 hover:bg-[#f2f3ff]/60 dark:hover:border-slate-800 dark:hover:bg-slate-900/30'
                                                }`}
                                            >
                                                <div
                                                    onClick={(e) => handleSentenceClick(sentence, e)}
                                                    className="cursor-pointer text-left"
                                                >
                                                    <p className={`chinese-text text-slate-800 dark:text-slate-200 leading-loose reader-size-${settings.fontSize || 'medium'}`}>
                                                        {sentence.tokens.map((token, tokenIndex) => {
                                                            const selectable = isSelectableToken(token)
                                                            const tokenActive = active && selectedToken?.surface === token.surface
                                                            return (
                                                                <span
                                                                    key={`${token.surface}-${tokenIndex}`}
                                                                    onClick={(event) => {
                                                                        event.stopPropagation()
                                                                        if (!selectable) return
                                                                        void handleTokenSelection(sentence, token, event)
                                                                    }}
                                                                    className={
                                                                        selectable
                                                                            ? `cursor-pointer rounded px-0.5 transition-colors ${
                                                                                 tokenActive
                                                                                      ? 'bg-[#006b5f]/20 text-[#00423b] ring-2 ring-[#006b5f] dark:bg-[#006b5f]/30 dark:text-teal-50 dark:ring-teal-700'
                                                                                      : 'hover:bg-[#006b5f]/15 hover:text-[#00423b] dark:hover:bg-[#006b5f]/25 dark:hover:text-teal-200'
                                                                              }`
                                                                            : 'text-slate-500 dark:text-slate-400'
                                                                    }
                                                                >
                                                                    {token.surface}
                                                                </span>
                                                            )
                                                        })}
                                                    </p>
                                                </div>

                                                <div
                                                    onClick={(e) => handleSentenceClick(sentence, e)}
                                                    className="cursor-pointer text-left flex flex-col justify-center border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800 pt-3 md:pt-0 md:pl-5"
                                                >
                                                    {active ? (
                                                        <div className="space-y-1.5 animate-fadeIn">
                                                            <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-black uppercase text-[#006b5f] dark:text-teal-400">
                                                                <span>Bản dịch chi tiết</span>
                                                            </div>
                                                            <p className="text-sm font-black text-[#006b5f] dark:text-teal-300 leading-relaxed">
                                                                {naturalTranslation || sentenceNaturalTranslation}
                                                            </p>
                                                            {(literalTranslation || sentenceLiteralTranslation) && (
                                                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 italic">
                                                                    Sát nghĩa: {literalTranslation || sentenceLiteralTranslation}
                                                                </p>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-3">
                                                            {sentenceNaturalTranslation}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <div className="space-y-5">
                                    {sentences.map((sentence, sentenceIndex) => {
                                        const active = selectedSentence?.text === sentence.text
                                        return (
                                            <button
                                                key={`${sentence.text}-${sentenceIndex}`}
                                                onClick={(e) => handleSentenceClick(sentence, e)}
                                                className={`block w-full rounded-2xl border p-5 text-left transition-all ${
                                                    active
                                                        ? 'border-[#006b5f] bg-[#006b5f]/10 shadow-sm dark:border-teal-800 dark:bg-[#006b5f]/20'
                                                        : 'border-transparent bg-white hover:border-[#bbcac6]/50 hover:bg-[#f2f3ff]/70 dark:bg-transparent dark:hover:border-slate-800 dark:hover:bg-slate-900/30'
                                                }`}
                                            >
                                                <p className={`chinese-text text-slate-800 dark:text-slate-200 leading-loose reader-size-${settings.fontSize || 'medium'}`}>
                                                    {sentence.tokens.map((token, tokenIndex) => {
                                                        const selectable = isSelectableToken(token)
                                                        const tokenActive = active && selectedToken?.surface === token.surface
                                                        return (
                                                            <span
                                                                key={`${token.surface}-${tokenIndex}`}
                                                                onClick={(event) => {
                                                                    event.stopPropagation()
                                                                    if (!selectable) return
                                                                    void handleTokenSelection(sentence, token, event)
                                                                }}
                                                                className={
                                                                    selectable
                                                                        ? `cursor-pointer rounded px-0.5 transition-colors ${
                                                                              tokenActive
                                                                                   ? 'bg-[#006b5f]/20 text-[#00423b] ring-2 ring-[#006b5f] dark:bg-[#006b5f]/30 dark:text-teal-50 dark:ring-teal-700'
                                                                                   : 'hover:bg-[#006b5f]/15 hover:text-[#00423b] dark:hover:bg-[#006b5f]/25 dark:hover:text-teal-200'
                                                                           }`
                                                                        : 'text-slate-500 dark:text-slate-400'
                                                                }
                                                            >
                                                                {token.surface}
                                                            </span>
                                                        )
                                                    })}
                                                </p>
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                        </article>
                    )}
                </div>
            </section>

                        {/* RIGHT PANE: Tabs Workspace for AI chat helper, Quiz, Dictionary */}
            <aside className="w-full md:w-[400px] lg:w-[420px] shrink-0 rounded-3xl border border-white/40 bg-white/70 p-5 flex flex-col h-full shadow-2xl overflow-hidden backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/70 z-20 transition-all glass-card">
                {/* Tab Controllers */}
                <div className="grid grid-cols-3 gap-1 bg-white dark:bg-slate-900/60 p-1 rounded-2xl border border-slate-100 dark:border-slate-800 mb-4 shadow-inner">
                    <button
                        onClick={() => setActiveTab('chat')}
                        className={`py-2 px-1 text-xs font-bold rounded-xl flex items-center justify-center gap-x-1 cursor-pointer transition-all ${
                            activeTab === 'chat'
                                ? 'bg-[#006b5f] text-white shadow-md'
                                : 'text-slate-500 hover:text-[#006b5f] dark:text-slate-400 dark:hover:text-[#006b5f]'
                        }`}
                    >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Trò Chuyện AI</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('quiz')}
                        className={`py-2 px-1 text-xs font-bold rounded-xl flex items-center justify-center gap-x-1 cursor-pointer transition-all ${
                            activeTab === 'quiz'
                                ? 'bg-[#006b5f] text-white shadow-md'
                                : 'text-slate-500 hover:text-[#006b5f] dark:text-slate-400 dark:hover:text-[#006b5f]'
                        }`}
                    >
                        <Award className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Bài Trắc Nghiệm</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('vocab')}
                        className={`py-2 px-1 text-xs font-bold rounded-xl flex items-center justify-center gap-x-1 cursor-pointer transition-all ${
                            activeTab === 'vocab'
                                ? 'bg-[#006b5f] text-white shadow-md'
                                : 'text-slate-500 hover:text-[#006b5f] dark:text-slate-400 dark:hover:text-[#006b5f]'
                        }`}
                    >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Tra Từ Điển</span>
                    </button>
                </div>

                {savedNotice && (
                    <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
                        {savedNotice}
                    </div>
                )}

                {/* Active Tab Screen Area */}
                <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
                    {activeTab === 'chat' && (
                        <ChatPanel
                            chatMessages={chatMessages}
                            chatLoading={chatLoading}
                            chatInput={chatInput}
                            onChatInputChange={setChatInput}
                            onChatSubmit={handleChatSubmit}
                        />
                    )}

                    {activeTab === 'quiz' && (
                        <QuizPanel
                            quizQuestions={quizQuestions}
                            quizLoading={quizLoading}
                            quizScore={quizScore}
                            quizFinished={quizFinished}
                            currentQuestionIndex={currentQuestionIndex}
                            selectedAnswerIndex={selectedAnswerIndex}
                            onGenerateQuiz={handleGenerateQuiz}
                            onQuizAnswer={handleQuizAnswer}
                        />
                    )}

                    {activeTab === 'vocab' && (
                        <VocabPanel
                            selectedSurface={selectedSurface}
                            quickVi={quickVi}
                            quickEn={quickEn}
                            quickPinyin={quickPinyin}
                            sourceSentence={sourceSentence}
                            aiContext={aiContext}
                            activeAnalysis={activeAnalysis}
                        />
                    )}
                </div>
            </aside>
            </div>
        </div>
    )
}
