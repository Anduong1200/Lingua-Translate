import React, { memo, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { Award, BookMarked, BookOpen, BookmarkPlus, Brain, CheckCircle, ChevronDown, Columns, FilePlus2, FileText, Highlighter, History, Layers, Loader2, MessageSquare, Minus, Plus, Search, Send, Settings, Sparkles, SpellCheck, Trash2, Type, Upload, UserCircle, Volume2, X } from 'lucide-react'
import { useStore } from '@/store/useStore'
import type { AnnotationRecord, ChineseAnalysis, ChineseDefinition, ChineseSentenceAnalysis, ChineseToken, DocumentContent, DocumentTranslationSentence, FlashCard, SavedWord } from '@/types'
import { estimateHskLabel, getVietnameseDefinition } from '@/lib/chinese'
import { generateId } from '@/lib/utils'
import { API_BASE_URL } from '@/store/slices/types'
import { primaryNavPages, workspacePageCount } from '@/config/pages'
import { type ChatMessage, findSentenceForSelection, formatAiChatReply, isSelectableToken, messageTime, type PdfSelection, type QuizQuestion, speakChinese } from './readerUtils'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

import { ReaderView, SidebarTab, TranslateScope, TextSelection, FloatingCoords, BackendTranslationUnit, ContextTranslationResult, BackendQuizResponse, readStoredHistory, cleanDictionaryText, tokenVietnamese, tokenEnglish, tokenPinyin, knownSentenceTranslation, isMissingTranslation, sentenceFallbackTranslation, splitDocumentParagraphs, findParagraphForSelection, groupSentencesByParagraph, bestSentenceTranslation, buildContextualToken, splitFallbackSentences, safeBbox, historyStorageKey } from './components/readerShared'

import { SentenceLine } from './components/SentenceLine'
import { PdfDocumentViewer } from './components/PdfDocumentViewer'
import { EmptyReader } from './components/EmptyReader'
import { TextDocumentReader } from './components/TextDocumentReader'
import { ReaderSidebar } from './components/ReaderSidebar'
import { ChatPanel, FloatingChatWidget } from './components/ChatPanel'
import { ReaderInfoBlock } from './components/ReaderInfoBlock'
import { QuizPanel } from './components/QuizPanel'
import { SavedHub } from './components/SavedHub'
import { PasteDocumentModal } from './components/PasteDocumentModal'

export default function ReaderPage() {
    const {
        currentDocument,
        documents,
        setCurrentDocument,
        chineseAnalysis,
        contextualAnalysis,
        aiContext,
        isAnalyzing,
        isGeneratingAIContext,
        analyzeChineseText,
        generateAIContextReading,
        saveChineseAnnotation,
        removeAnnotation,
        recordLookupWord,
        savedWords,
        annotations,
        flashCards,
        submitReview,
        removeSavedWord,
        updateReadingProgress,
        settings,
        isSideBySide,
        toggleSideBySide,
        updateSettings,
        documentTranslations,
        isTranslatingDocument,
        isScanningVocabulary,
        translateCurrentDocument,
        scanDocumentVocabulary,
        createAutoReviewItems,
        addDocument,
        translateFile,
    } = useStore()

    const fileInputRef = useRef<HTMLInputElement>(null)
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
                const firstSelection = firstSentence
                    ? {
                          selectedText: firstSentence.text,
                          sourceSentence: firstSentence.text,
                          paragraphContext: findParagraphForSelection(currentDocument.content, firstSentence.text),
                          pageContext: currentDocument.content,
                      }
                    : null
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
    const activeSentenceIndex = selectedSentence ? Math.max(0, sentences.findIndex((sentence) => sentence.text === selectedSentence.text)) : 0
    const hskLabel = selectedSentence ? estimateHskLabel(selectedSentence.tokens) : 'HSK'

    const candidateSelection = selectedToken?.surface || pdfSelection?.selectedText || textSelection?.selectedText || selectedSentence?.text || ''
    const contextualSelectionText = contextualAnalysis?.selection?.selected_text || contextualAnalysis?.selection?.text || ''
    const contextualSourceSentence = contextualAnalysis?.selection?.source_sentence || contextualAnalysis?.context?.source_sentence || ''
    const activeAnalysis =
        contextualAnalysis?.selection &&
        (contextualSelectionText === candidateSelection || contextualSourceSentence === textSelection?.sourceSentence || contextualSourceSentence === selectedSentence?.text)
            ? contextualAnalysis
            : null

    const selectedSurface = activeAnalysis?.selection?.selected_text || activeAnalysis?.selection?.text || candidateSelection
    const sourceSentence = activeAnalysis?.selection?.source_sentence || pdfSelection?.sourceSentence || textSelection?.sourceSentence || selectedSentence?.text || ''
    const contextualQuickVi = cleanDictionaryText(activeAnalysis?.quick_meaning?.definitions_vi?.join('; '))
    const contextualTranslationVi = !isMissingTranslation(activeAnalysis?.translations?.natural_vi) ? activeAnalysis?.translations?.natural_vi || '' : ''
    const quickVi = contextualQuickVi || tokenVietnamese(selectedToken) || contextualTranslationVi
    const quickEn = cleanDictionaryText(activeAnalysis?.quick_meaning?.definitions_en?.join('; ')) || tokenEnglish(selectedToken)
    const quickPinyin = activeAnalysis?.quick_meaning?.pinyin || selectedToken?.pinyin || tokenPinyin(activeAnalysis?.sentences?.[0]?.tokens ?? [])
    const selectedParagraphContext =
        textSelection?.paragraphContext ||
        pdfSelection?.paragraphContext ||
        (selectedSentence && currentDocument ? findParagraphForSelection(currentDocument.content, selectedSentence.text) : '')
    const selectedSentenceTranslation = bestSentenceTranslation({
        analysis: activeAnalysis,
        selectedSentence,
        translation: currentTranslations[activeSentenceIndex],
    })
    const selectedLiteralTranslation =
        activeAnalysis?.translations?.literal_vi && !isMissingTranslation(activeAnalysis.translations.literal_vi)
            ? activeAnalysis.translations.literal_vi
            : currentTranslations[activeSentenceIndex]?.literal_vi || ''
    const loadingAnalysis = isAnalyzing || isGeneratingAIContext

    const pushHistory = (text: string) => {
        const trimmed = text.trim()
        if (!trimmed) return
        setHistoryList((items) => [trimmed, ...items.filter((item) => item !== trimmed)].slice(0, 20))
    }

    useEffect(() => {
        setContextTranslation(null)
    }, [selectedSurface, sourceSentence, selectedParagraphContext])

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
            translation: analysis.quick_meaning?.definitions_vi?.[0] || analysis.translations?.natural_vi || '',
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
        const sentenceId =
            currentDocument && activeSentenceIndex >= 0
                ? `${currentDocument.id}-${activeSentenceIndex + 1}`
                : `${currentDocument?.id || 'doc'}-${pdfSelection?.pageNumber || 1}-${Date.now()}`

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
            const documentContext = selectedParagraphContext || sourceSentence || currentDocument?.content || selectedSurface || question
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
                { id: `assistant-${Date.now()}`, role: 'assistant', content: formatAiChatReply(result), timestamp: messageTime() },
            ])
        } catch {
            setChatMessages((messages) => [
                ...messages,
                { id: `assistant-${Date.now()}`, role: 'assistant', content: 'Không gọi được AI context endpoint. Hãy kiểm tra backend và cấu hình API key.', timestamp: messageTime() },
            ])
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
            id: docId,
            title,
            type: 'txt',
            content,
            sourceFileName: `${hskLevel} pasted text`,
            sentences: [],
            uploadedAt: new Date(),
            readingProgress: 0,
            highlights: [],
            notes: [],
        })
        setPasteModalOpen(false)
        setCurrentView('documents')
    }

    const toolbarTop = popupCoords ? Math.max(70, popupCoords.y - 78) : 0
    const toolbarLeft = popupCoords ? Math.min(window.innerWidth - 220, Math.max(12, popupCoords.x - 110)) : 0
    const viewButtons: Array<{ id: ReaderView; label: string }> = [
        { id: 'documents', label: 'Đọc tài liệu' },
        { id: 'library', label: 'Lưu trong reader' },
        { id: 'study-hub', label: 'Ôn trong reader' },
    ]

    return (
        <div className="relative flex h-screen flex-col overflow-hidden bg-[#f6f8fb] text-slate-800">
            <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.docx"
                className="hidden"
                onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) void handleUploadFile(file)
                    event.target.value = ''
                }}
            />

            <header className="z-30 flex shrink-0 flex-col gap-2 border-b border-slate-200 bg-white/90 px-4 py-2 shadow-sm backdrop-blur-xl md:px-6">
                <div className="flex min-h-[48px] w-full items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                        <Link to="/dashboard" className="flex shrink-0 items-center gap-2">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#006b5f] text-white shadow-sm">
                                <Sparkles className="h-4.5 w-4.5" />
                            </span>
                            <span className="leading-tight">
                                <span className="block text-[18px] font-black tracking-tight text-teal-700">Hanora</span>
                                <span className="hidden text-[9px] font-black uppercase tracking-[0.18em] text-slate-400 sm:block">{workspacePageCount} workspace pages</span>
                            </span>
                        </Link>
                        <nav className="hidden items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1 xl:flex">
                            {primaryNavPages.map((page) => {
                                const PageIcon = page.icon
                                const isActive = page.key === 'reader'
                                return (
                                    <Link
                                        key={page.key}
                                        to={page.path}
                                        className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black transition ${
                                            isActive ? 'bg-white text-[#006b5f] shadow-sm' : 'text-slate-500 hover:bg-white hover:text-[#006b5f]'
                                        }`}
                                    >
                                        <PageIcon className="h-3.5 w-3.5" />
                                        {page.shortLabel}
                                    </Link>
                                )
                            })}
                        </nav>
                        <nav className="hidden items-center gap-1 rounded-2xl border border-teal-100 bg-teal-50/60 p-1 md:flex">
                            {viewButtons.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => setCurrentView(item.id)}
                                    className={`rounded-xl px-3 py-2 text-xs font-black transition ${
                                        currentView === item.id ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:bg-white hover:text-teal-700'
                                    }`}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </nav>
                    </div>

                {currentView === 'documents' && (
                    <div className="hidden min-w-0 items-center gap-3 rounded-full border border-teal-100/60 bg-white/90 px-4 py-1.5 shadow-sm lg:flex">
                        <button onClick={() => setZoomPercent((value) => Math.max(70, value - 10))} className="rounded-full p-1 text-slate-500 transition hover:bg-slate-100 hover:text-teal-700" title="Thu nhỏ">
                            <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-10 text-center font-mono text-xs font-black text-slate-700">{zoomPercent}%</span>
                        <button onClick={() => setZoomPercent((value) => Math.min(220, value + 10))} className="rounded-full p-1 text-slate-500 transition hover:bg-slate-100 hover:text-teal-700" title="Phóng to">
                            <Plus className="h-3.5 w-3.5" />
                        </button>
                        <div className="mx-1 h-4 w-px bg-slate-200" />
                        <select
                            value={currentDocument?.id || ''}
                            onChange={(event) => setCurrentDocument(documents.find((item) => item.id === event.target.value) ?? null)}
                            className="max-w-[190px] bg-transparent text-xs font-black text-slate-700 outline-none"
                            title="Chọn tài liệu"
                        >
                            {documents.length === 0 && <option value="">Chưa có tài liệu</option>}
                            {documents.map((document) => (
                                <option key={document.id} value={document.id}>{document.title}</option>
                            ))}
                        </select>
                        <ChevronDown className="h-3 w-3 text-slate-400" />
                    </div>
                )}

                <div className="flex shrink-0 items-center gap-2">
                    {currentView === 'documents' && (
                        <>
                            <button onClick={() => fileInputRef.current?.click()} className="rounded-xl p-2 text-teal-600 transition hover:bg-teal-100/50" title="Tải tài liệu">
                                <Upload className="h-5 w-5" />
                            </button>
                            <button onClick={() => setPasteModalOpen(true)} className="rounded-xl p-2 text-teal-600 transition hover:bg-teal-100/50" title="Dán tài liệu">
                                <FilePlus2 className="h-5 w-5" />
                            </button>
                            <button
                                onClick={handleTranslateDocument}
                                disabled={!currentDocument || isTranslatingDocument}
                                className="hidden rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-teal-700 disabled:opacity-50 lg:inline-flex"
                                title="Dịch tài liệu"
                            >
                                {isTranslatingDocument ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                            </button>
                            <button
                                onClick={handleScanVocabulary}
                                disabled={!currentDocument || isScanningVocabulary}
                                className="hidden rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-teal-700 disabled:opacity-50 lg:inline-flex"
                                title="Quét từ vựng"
                            >
                                {isScanningVocabulary ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                            </button>
                            <button
                                onClick={handleCreateAutoReviewItems}
                                disabled={!currentDocument || isScanningVocabulary}
                                className="hidden rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-teal-700 disabled:opacity-50 lg:inline-flex"
                                title="Tạo flashcards tự động"
                            >
                                <BookmarkPlus className="h-5 w-5" />
                            </button>
                            {currentDocument?.type !== 'pdf' && (
                                <button
                                    onClick={toggleSideBySide}
                                    className={`hidden rounded-xl p-2 transition lg:inline-flex ${isSideBySide ? 'bg-teal-50 text-teal-700' : 'text-slate-500 hover:bg-slate-100 hover:text-teal-700'}`}
                                    title="Dịch song song"
                                >
                                    <Columns className="h-5 w-5" />
                                </button>
                            )}
                            <div className="relative hidden lg:block">
                                <button onClick={() => setShowFontSizeMenu((value) => !value)} className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-teal-700" title="Cỡ chữ">
                                    <Type className="h-5 w-5" />
                                </button>
                                {showFontSizeMenu && (
                                    <div className="absolute right-0 top-full z-50 mt-2 w-36 rounded-xl border border-teal-100 bg-white p-2 shadow-xl">
                                        {(['small', 'medium', 'large'] as const).map((size) => (
                                            <button
                                                key={size}
                                                onClick={() => {
                                                    updateSettings({ fontSize: size })
                                                    setShowFontSizeMenu(false)
                                                }}
                                                className={`block w-full rounded-lg px-2.5 py-2 text-left text-xs font-black ${
                                                    settings.fontSize === size ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-50'
                                                }`}
                                            >
                                                {size === 'small' ? 'Nhỏ' : size === 'large' ? 'Lớn' : 'Vừa'}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                    <Link to="/settings" className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600" title="Settings">
                        <Settings className="h-5 w-5" />
                    </Link>
                    <Link to="/dashboard" className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600" title="User space">
                        <UserCircle className="h-5 w-5" />
                    </Link>
                </div>
                </div>

                <div className="flex w-full gap-2 overflow-x-auto pb-0.5 xl:hidden">
                    <nav className="flex shrink-0 items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1">
                        {primaryNavPages.map((page) => {
                            const PageIcon = page.icon
                            const isActive = page.key === 'reader'
                            return (
                                <Link
                                    key={page.key}
                                    to={page.path}
                                    className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-black transition ${
                                        isActive ? 'bg-white text-[#006b5f] shadow-sm' : 'text-slate-500 hover:bg-white hover:text-[#006b5f]'
                                    }`}
                                >
                                    <PageIcon className="h-3.5 w-3.5" />
                                    {page.shortLabel}
                                </Link>
                            )
                        })}
                    </nav>
                    <nav className="flex shrink-0 items-center gap-1 rounded-2xl border border-teal-100 bg-teal-50/60 p-1 md:hidden">
                        {viewButtons.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setCurrentView(item.id)}
                                className={`shrink-0 rounded-xl px-3 py-2 text-xs font-black transition ${
                                    currentView === item.id ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:bg-white hover:text-teal-700'
                                }`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </nav>
                </div>
            </header>

            {savedNotice && (
                <div className="pointer-events-none fixed left-1/2 top-20 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-teal-700 bg-teal-900 px-4 py-2.5 text-xs font-black text-white shadow-lg">
                    <CheckCircle className="h-4 w-4 text-emerald-300" />
                    <span>{savedNotice}</span>
                </div>
            )}

            {currentView === 'documents' ? (
                <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
                    {popupCoords && selectedSurface && (
                        <div
                            style={{ left: toolbarLeft, top: toolbarTop }}
                            className="floating-reader-toolbar fixed z-40 flex items-center gap-3 rounded-xl border border-teal-100 bg-white/95 px-3 py-2 shadow-xl backdrop-blur-md"
                        >
                            <button onClick={handlePopupAnalyze} className="group flex flex-col items-center gap-1 text-teal-700 transition hover:text-teal-900" title="Analyze">
                                <span className="rounded-xl bg-teal-50 p-1.5 transition group-hover:bg-teal-100"><Brain className="h-4 w-4" /></span>
                                <span className="text-[9px] font-black">Analyze</span>
                            </button>
                            <div className="h-7 w-px bg-slate-100" />
                            <button onClick={() => void handleSave(undefined, 'Highlight từ Reader')} className="group flex flex-col items-center gap-1 text-slate-600 transition hover:text-teal-900" title="Highlight">
                                <span className="rounded-xl p-1.5 transition group-hover:bg-slate-50"><Highlighter className="h-4 w-4" /></span>
                                <span className="text-[9px] font-black">Highlight</span>
                            </button>
                            <div className="h-7 w-px bg-slate-100" />
                            <button onClick={() => void handleSave()} className="group flex flex-col items-center gap-1 text-slate-600 transition hover:text-teal-900" title="Review">
                                <span className="rounded-xl p-1.5 transition group-hover:bg-slate-50"><BookmarkPlus className="h-4 w-4" /></span>
                                <span className="text-[9px] font-black">Review</span>
                            </button>
                        </div>
                    )}

                    {currentDocument?.type === 'pdf' && currentDocument.sourceUrl ? (
                        <div className="flex-1 overflow-y-auto border-r border-teal-50/20 bg-slate-900 px-6 py-8">
                            <PdfDocumentViewer
                                sourceUrl={currentDocument.sourceUrl}
                                onSelection={handlePdfSelection}
                                annotations={annotations.filter((annotation) => annotation.document_id === currentDocument.id)}
                                zoom={zoomPercent}
                            />
                        </div>
                    ) : (
                        <TextDocumentReader
                            currentDocument={currentDocument}
                            sentences={sentences}
                            translations={currentTranslations}
                            selectedSentence={selectedSentence}
                            selectedToken={selectedToken}
                            selectedText={selectedSurface}
                            zoomPercent={zoomPercent}
                            hskLabel={hskLabel}
                            fontSize={settings.fontSize || 'medium'}
                            sideBySide={isSideBySide}
                            onMouseSelection={handleTextMouseSelection}
                            onSentenceClick={handleSentenceClick}
                            onTokenSelection={handleTokenSelection}
                            onUploadClick={() => fileInputRef.current?.click()}
                            onPasteClick={() => setPasteModalOpen(true)}
                        />
                    )}

                    <ReaderSidebar
                        selectedSurface={selectedSurface}
                        quickVi={quickVi}
                        quickEn={quickEn}
                        quickPinyin={quickPinyin}
                        sourceSentence={sourceSentence}
                        sentenceTranslation={selectedSentenceTranslation}
                        literalTranslation={selectedLiteralTranslation}
                        paragraphContext={selectedParagraphContext}
                        contextTranslation={contextTranslation}
                        contextTranslationLoading={contextTranslationLoading}
                        contextTranslateScope={contextTranslateScope}
                        analysis={activeAnalysis}
                        aiContext={aiContext}
                        loadingAnalysis={loadingAnalysis}
                        generatingAI={isGeneratingAIContext}
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        savedWords={savedWords}
                        historyList={historyList}
                        onSave={() => void handleSave()}
                        onSaveToken={(token) => void handleSave(token)}
                        onGenerateAiNote={() => void handleGenerateAiNote()}
                        onTranslateScope={(scope) => void handleTranslateScope(scope)}
                        onSelectHistory={(text) => {
                            const selection: TextSelection = {
                                selectedText: text,
                                sourceSentence: findSentenceForSelection(currentDocument?.content || text, text),
                                paragraphContext: currentDocument ? findParagraphForSelection(currentDocument.content, text) : text,
                                pageContext: currentDocument?.content || text,
                            }
                            setTextSelection(selection)
                            setPdfSelection(null)
                            void analyzeSelection(selection)
                        }}
                        quizQuestions={quizQuestions}
                        quizLoading={quizLoading}
                        quizScore={quizScore}
                        quizFinished={quizFinished}
                        currentQuestionIndex={currentQuestionIndex}
                        selectedAnswerIndex={selectedAnswerIndex}
                        onGenerateQuiz={handleGenerateQuiz}
                        onQuizAnswer={handleQuizAnswer}
                    />
                </div>
            ) : (
                <SavedHub
                    viewType={currentView}
                    savedWords={savedWords}
                    annotations={annotations}
                    flashCards={flashCards}
                    onRemoveWord={removeSavedWord}
                    onRemoveAnnotation={removeAnnotation}
                    onSubmitReview={(id, rating) => void submitReview(id, rating)}
                />
            )}

            {currentView === 'documents' && (
                <FloatingChatWidget
                    open={chatOpen}
                    onOpenChange={setChatOpen}
                    selectedSurface={selectedSurface}
                    chatMessages={chatMessages}
                    chatLoading={chatLoading}
                    chatInput={chatInput}
                    onChatInputChange={setChatInput}
                    onChatSubmit={handleChatSubmit}
                />
            )}

            <PasteDocumentModal
                isOpen={pasteModalOpen}
                onClose={() => setPasteModalOpen(false)}
                onSubmit={handleCreatePastedDocument}
            />
        </div>
    )
}
