import { useEffect, useMemo, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import {
    BookOpen,
    Check,
    FileText,
    Highlighter,
    Layers,
    Loader2,
    Plus,
    Sparkles,
    Volume2,
    Columns,
    Type,
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import { AnnotationRecord, ChineseSentenceAnalysis, ChineseToken } from '@/types'
import { estimateHskLabel, getVietnameseDefinition } from '@/lib/chinese'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).toString()

type PdfSelection = {
    selectedText: string
    pageNumber: number
    bboxJson: string
    sourceSentence: string
    paragraphContext: string
    pageContext: string
}

type PanelTab = 'quick' | 'context' | 'ai' | 'grammar' | 'examples' | 'note' | 'review'

function isSelectableToken(token: ChineseToken) {
    return token.definitions.length > 0 && token.pos !== 'punctuation' && token.surface.trim().length > 0
}

function speak(text: string) {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-CN'
    speechSynthesis.speak(utterance)
}

function findSentenceForSelection(context: string, selectedText: string) {
    const selected = selectedText.trim()
    if (!context.trim()) return selected
    const sentence = context
        .replace(/\r/g, '')
        .split(/(?<=[。！？!?])\s*|\n+/)
        .map((item) => item.trim())
        .find((item) => item.includes(selected))
    return sentence || selected
}

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
        saveUserCorrection,
        markKnownWord,
        savedWords,
        annotations,
        updateReadingProgress,
        settings,
        isSideBySide,
        toggleSideBySide,
        updateSettings,
    } = useStore()

    const [selectedSentence, setSelectedSentence] = useState<ChineseSentenceAnalysis | null>(null)
    const [selectedToken, setSelectedToken] = useState<ChineseToken | null>(null)
    const [pdfSelection, setPdfSelection] = useState<PdfSelection | null>(null)
    const [note, setNote] = useState('')
    const [meaningOverride, setMeaningOverride] = useState('')
    const [savedNotice, setSavedNotice] = useState('')
    const [showFontSizeMenu, setShowFontSizeMenu] = useState(false)
    const [activeTab, setActiveTab] = useState<PanelTab>('quick')

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
    const activeAnalysis =
        contextualAnalysis?.selection &&
        (contextualAnalysis.selection.selected_text === candidateSelection ||
            (!selectedToken && !pdfSelection && contextualAnalysis.selection.source_sentence === selectedSentence?.text))
            ? contextualAnalysis
            : null
    const selectedSurface = activeAnalysis?.selection?.selected_text || selectedToken?.surface || pdfSelection?.selectedText || ''
    const quickMeaning = activeAnalysis?.quick_meaning
    const naturalTranslation = activeAnalysis?.translations?.natural_vi
    const literalTranslation = activeAnalysis?.translations?.literal_vi
    const sourceSentence = activeAnalysis?.selection?.source_sentence || selectedSentence?.text || ''

    const handleSentenceClick = (sentence: ChineseSentenceAnalysis) => {
        setSelectedSentence(sentence)
        setSelectedToken(null)
        setPdfSelection(null)
        setSavedNotice('')
        setActiveTab('context')
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

    const handlePdfSelection = async (selection: PdfSelection) => {
        setPdfSelection(selection)
        setSavedNotice('')
        setActiveTab('quick')
        const analysis = await analyzeChineseText({
            selected_text: selection.selectedText,
            source_sentence: selection.sourceSentence,
            paragraph_context: selection.paragraphContext,
            page_context: selection.pageContext,
            domain_mode: settings.domainMode || 'auto',
            user_level: settings.targetHskLevel || 'HSK4',
        })
        const firstSentence = analysis.sentences[0] ?? null
        const firstToken = firstSentence?.tokens.find(isSelectableToken) ?? null
        setSelectedSentence(firstSentence)
        setSelectedToken(firstToken)
        if (currentDocument) {
            updateReadingProgress(currentDocument.id, Math.max(currentDocument.readingProgress, 1))
        }
    }

    const handleSave = async () => {
        if (!selectedToken || !selectedSentence) return
        const tokenToSave: ChineseToken = {
            ...selectedToken,
            surface: selectedSurface || selectedToken.surface,
            pinyin: quickPinyin || selectedToken.pinyin,
        }
        const annotation = await saveChineseAnnotation({
            token: tokenToSave,
            sentenceText: selectedSentence.text,
            note,
            documentId: currentDocument?.id,
            pageId: 'page-1',
            pageNumber: pdfSelection?.pageNumber,
            bboxJson: pdfSelection?.bboxJson,
            sentenceId: `${currentDocument?.id || 'doc'}-${activeSentenceIndex + 1}`,
        })
        setSavedNotice(`Đã lưu annotation ${annotation.selected_text}`)
    }

    const handleSaveCorrection = async () => {
        if (!selectedSurface || !meaningOverride.trim()) return
        await saveUserCorrection({
            original_term: selectedSurface,
            system_translation: naturalTranslation || quickVi,
            user_translation: meaningOverride.trim(),
            context: sourceSentence,
            domain: activeAnalysis?.context?.domain || settings.domainMode || 'general',
        })
        setSavedNotice(`Đã lưu nghĩa Việt ưu tiên cho ${selectedSurface}`)
        void analyzeChineseText({
            selected_text: selectedSurface,
            source_sentence: sourceSentence,
            paragraph_context: currentDocument?.content || sourceSentence,
            page_context: pdfSelection?.pageContext || currentDocument?.content || sourceSentence,
            domain_mode: activeAnalysis?.context?.domain || settings.domainMode || 'auto',
            user_level: settings.targetHskLevel || 'HSK4',
        })
    }

    const handleMarkKnown = async () => {
        if (!selectedSurface) return
        await markKnownWord(selectedSurface, 0.9)
        setSavedNotice(`Đã đánh dấu đã biết: ${selectedSurface}`)
    }

    const handleRunAIContext = async () => {
        if (!selectedSurface && !sourceSentence) return
        setSavedNotice('')
        setActiveTab('ai')
        await generateAIContextReading({
            selected_text: selectedSurface || sourceSentence,
            source_sentence: sourceSentence || selectedSurface,
            paragraph_context: currentDocument?.content || sourceSentence || selectedSurface,
            page_context: pdfSelection?.pageContext || currentDocument?.content || sourceSentence || selectedSurface,
            domain_mode: activeAnalysis?.context?.domain || settings.domainMode || 'auto',
            user_level: settings.targetHskLevel || 'HSK4',
        })
    }

    const panelTabs: { id: PanelTab; label: string }[] = [
        { id: 'quick', label: 'Quick Meaning' },
        { id: 'context', label: 'Context' },
        { id: 'ai', label: 'AI Context' },
        { id: 'grammar', label: 'Grammar' },
        { id: 'examples', label: 'Examples' },
        { id: 'note', label: 'Personal Note' },
        { id: 'review', label: 'Add to Review' },
    ]
    const quickVi = quickMeaning?.definitions_vi?.join('; ') || viDefinition
    const quickEn = quickMeaning?.definitions_en?.join('; ') || enDefinition
    const quickPinyin = quickMeaning?.pinyin || selectedToken?.pinyin || ''
    const grammarPatterns = activeAnalysis?.grammar?.patterns || selectedSentence?.grammar_patterns || []
    const exampleList = activeAnalysis?.examples?.length ? activeAnalysis.examples : selectedToken?.examples || []
    const domainTags = quickMeaning?.domain_tags?.length ? quickMeaning.domain_tags : selectedToken?.domain_tags || []

    return (
        <div className="flex h-[calc(100vh-6.5rem)] flex-col overflow-hidden rounded-[2rem] border border-white dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 custom-shadow backdrop-blur-md md:flex-row transition-colors duration-300">
            <section className="flex min-h-0 flex-1 flex-col border-b border-teal-100/80 dark:border-slate-800/80 md:w-1/2 md:border-b-0 md:border-r transition-colors">
                <div className="flex items-center justify-between border-b border-teal-100/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900 px-5 py-4 transition-colors">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white custom-shadow">
                            <BookOpen className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="truncate text-lg font-black text-slate-900 dark:text-slate-100">
                                {currentDocument?.title || 'Chưa chọn tài liệu'}
                            </h1>
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                Reader mode · {sentences.length} câu · {hskLabel}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <button
                                onClick={() => setShowFontSizeMenu(!showFontSizeMenu)}
                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-teal-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-teal-50 dark:hover:bg-slate-800 transition-colors"
                                title="Cỡ chữ"
                            >
                                <Type className="h-4 w-4" />
                            </button>
                            {showFontSizeMenu && (
                                <div className="absolute right-0 mt-2 z-50 w-36 rounded-xl border border-teal-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 shadow-xl">
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
                                                    ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400'
                                                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                                            }`}
                                        >
                                            {sz === 'small' ? 'Nhỏ' : sz === 'large' ? 'Lớn' : 'Vừa'}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {currentDocument?.type !== 'pdf' && (
                            <button
                                onClick={toggleSideBySide}
                                className={`flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-black transition-all ${
                                    isSideBySide
                                        ? 'border-teal-400 bg-teal-50 text-teal-700 dark:border-teal-800 dark:bg-teal-950/45 dark:text-teal-400'
                                        : 'border-teal-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-teal-50 dark:hover:bg-slate-800'
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
                            className="max-w-[150px] rounded-lg border border-teal-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 outline-none focus:border-teal-400 dark:focus:border-slate-700 transition-all"
                        >
                            {documents.map((doc) => (
                                <option key={doc.id} value={doc.id}>
                                    {doc.title}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/70 dark:bg-slate-950/10 p-5 scrollbar-hide">
                    {currentDocument?.type === 'pdf' && currentDocument.sourceUrl ? (
                        <PdfDocumentViewer
                            sourceUrl={currentDocument.sourceUrl}
                            onSelection={handlePdfSelection}
                            annotations={annotations.filter((annotation) => annotation.document_id === currentDocument.id)}
                        />
                    ) : (
                        <article className="mx-auto min-h-full max-w-5xl rounded-[2rem] border border-white dark:border-slate-850/80 bg-white dark:bg-slate-900/50 p-6 custom-shadow">
                            {isAnalyzing ? (
                                <div className="flex h-64 flex-col items-center justify-center gap-3 text-teal-700 dark:text-teal-400">
                                    <Loader2 className="h-8 w-8 animate-spin" />
                                    <p className="text-sm font-bold">Đang segment và tạo pinyin...</p>
                                </div>
                            ) : isSideBySide ? (
                                <div className="space-y-6">
                                    {sentences.map((sentence, sentenceIndex) => {
                                        const active = selectedSentence?.text === sentence.text
                                        const getJoinedViTranslation = (sent: ChineseSentenceAnalysis) => {
                                            return sent.tokens
                                                .map((token) => {
                                                    if (token.pos === 'punctuation') return token.surface
                                                    const defs = token.definitions_vi || token.definitions?.filter(d => d.lang === 'vi').map(d => d.value) || []
                                                    return defs.length > 0 ? defs[0].split(';')[0].split(',')[0] : token.surface
                                                })
                                                .join('')
                                        }
                                        return (
                                            <div
                                                key={`sbs-${sentence.text}-${sentenceIndex}`}
                                                className={`grid grid-cols-1 md:grid-cols-2 gap-5 p-4 rounded-2xl border transition-all ${
                                                    active
                                                        ? 'border-teal-400 bg-teal-50/50 dark:border-teal-800 dark:bg-teal-950/20 shadow-md'
                                                        : 'border-transparent hover:border-teal-100/50 dark:hover:border-slate-800 hover:bg-slate-50/30 dark:hover:bg-slate-900/30'
                                                }`}
                                            >
                                                <div
                                                    onClick={() => handleSentenceClick(sentence)}
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
                                                                        setSelectedSentence(sentence)
                                                                        setSelectedToken(token)
                                                                        setPdfSelection(null)
                                                                        setSavedNotice('')
                                                                        setActiveTab('quick')
                                                                        void analyzeChineseText({
                                                                            selected_text: token.surface,
                                                                            source_sentence: sentence.text,
                                                                            paragraph_context: currentDocument?.content || sentence.text,
                                                                            page_context: currentDocument?.content || sentence.text,
                                                                            domain_mode: settings.domainMode || 'auto',
                                                                            user_level: settings.targetHskLevel || 'HSK4',
                                                                        })
                                                                    }}
                                                                    className={
                                                                        selectable
                                                                            ? `cursor-pointer rounded px-0.5 transition-colors ${
                                                                                  tokenActive
                                                                                      ? 'bg-teal-200 text-teal-950 ring-2 ring-teal-305 dark:bg-teal-800 dark:text-teal-50 dark:ring-teal-700'
                                                                                      : 'hover:bg-teal-100 hover:text-teal-800 dark:hover:bg-teal-900/60 dark:hover:text-teal-200'
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
                                                    onClick={() => handleSentenceClick(sentence)}
                                                    className="cursor-pointer text-left flex flex-col justify-center border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800 pt-3 md:pt-0 md:pl-5"
                                                >
                                                    {active ? (
                                                        <div className="space-y-1.5 animate-fadeIn">
                                                            <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-black uppercase text-teal-700 dark:text-teal-400">
                                                                <span>Bản dịch chi tiết</span>
                                                            </div>
                                                            <p className="text-sm font-black text-teal-800 dark:text-teal-300 leading-relaxed">
                                                                {naturalTranslation || getJoinedViTranslation(sentence)}
                                                            </p>
                                                            {literalTranslation && (
                                                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 italic">
                                                                    Sát nghĩa: {literalTranslation}
                                                                </p>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-3">
                                                            {getJoinedViTranslation(sentence)}
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
                                                onClick={() => handleSentenceClick(sentence)}
                                                className={`block w-full rounded-2xl border p-5 text-left transition-all ${
                                                    active
                                                        ? 'scale-[1.01] border-teal-400 bg-teal-50/50 dark:border-teal-800 dark:bg-teal-950/20 shadow-md'
                                                        : 'border-transparent bg-white dark:bg-transparent hover:border-teal-200 dark:hover:border-slate-800 hover:bg-teal-50/30 dark:hover:bg-slate-900/30'
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
                                                                    setSelectedSentence(sentence)
                                                                    setSelectedToken(token)
                                                                    setPdfSelection(null)
                                                                    setSavedNotice('')
                                                                    setActiveTab('quick')
                                                                    void analyzeChineseText({
                                                                        selected_text: token.surface,
                                                                        source_sentence: sentence.text,
                                                                        paragraph_context: currentDocument?.content || sentence.text,
                                                                        page_context: currentDocument?.content || sentence.text,
                                                                        domain_mode: settings.domainMode || 'auto',
                                                                        user_level: settings.targetHskLevel || 'HSK4',
                                                                    })
                                                                }}
                                                                className={
                                                                    selectable
                                                                        ? `cursor-pointer rounded px-0.5 transition-colors ${
                                                                              tokenActive
                                                                                  ? 'bg-teal-200 text-teal-950 ring-2 ring-teal-350 dark:bg-teal-800 dark:text-teal-50 dark:ring-teal-700'
                                                                                  : 'hover:bg-teal-100 hover:text-teal-800 dark:hover:bg-teal-900/60 dark:hover:text-teal-200'
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

            <section className="min-h-0 flex-1 overflow-y-auto bg-slate-50/70 dark:bg-slate-950/10 p-5 scrollbar-hide md:w-1/2 transition-colors duration-300">
                <div className="flex flex-col gap-5">
                    <div className="rounded-[2rem] border border-teal-100/60 dark:border-slate-800 bg-white dark:bg-slate-905/70 p-5 custom-shadow">
                        <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                            <div className="flex items-center gap-2">
                                <Layers className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                                <h2 className="font-black text-slate-900 dark:text-slate-100">Context Reader Panel</h2>
                            </div>
                            {selectedSurface && (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleRunAIContext}
                                        disabled={isGeneratingAIContext}
                                        className="flex items-center gap-2 rounded-lg border border-amber-250 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/50 px-3 py-2 text-xs font-black text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 disabled:cursor-wait disabled:opacity-70"
                                        title="Gọi AI context reading"
                                    >
                                        {isGeneratingAIContext ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                                        AI
                                    </button>
                                    <button
                                        onClick={() => speak(selectedSurface)}
                                        className="rounded-lg border border-teal-100/60 dark:border-slate-800 p-2 text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-slate-800"
                                        title="Nghe phát âm"
                                    >
                                        <Volume2 className="h-4 w-4" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {selectedSentence || selectedSurface ? (
                            <div className="space-y-4">
                                <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/30 p-4">
                                    <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-wider">
                                        {pdfSelection && (
                                            <span className="rounded-full bg-teal-100 dark:bg-teal-900/40 px-2 py-1 text-teal-700 dark:text-teal-300">
                                                PDF page {pdfSelection.pageNumber}
                                            </span>
                                        )}
                                        <span className="rounded-full bg-amber-50 dark:bg-amber-900/40 px-2 py-1 text-amber-700 dark:text-amber-300">
                                            {activeAnalysis?.selection?.analysis_mode || (selectedToken ? 'word' : 'sentence')}
                                        </span>
                                        <span className="rounded-full bg-cyan-50 dark:bg-cyan-900/40 px-2 py-1 text-cyan-700 dark:text-cyan-300">
                                            {activeAnalysis?.context?.domain || settings.domainMode || 'auto'}
                                        </span>
                                    </div>
                                    <p className="chinese-text text-3xl font-black leading-loose text-teal-750 dark:text-teal-400">
                                        {selectedSurface || selectedSentence?.text}
                                    </p>
                                    {quickPinyin && <p className="mt-1 text-sm font-semibold italic text-slate-500 dark:text-slate-400">/{quickPinyin}/</p>}
                                </div>

                                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                                    {panelTabs.map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-black transition-colors ${
                                                activeTab === tab.id
                                                    ? 'bg-teal-600 text-white shadow-sm'
                                                    : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-505 dark:text-slate-400 hover:border-teal-200 hover:text-teal-700 dark:hover:text-teal-400'
                                            }`}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>

                                {activeTab === 'quick' && (
                                    <div className="space-y-3">
                                        <div className="grid gap-3 md:grid-cols-2">
                                            <div className="rounded-xl border-l-4 border-teal-500 bg-teal-50 dark:bg-teal-950/20 p-3">
                                                <h3 className="mb-1 text-xs font-black uppercase tracking-wider text-teal-800 dark:text-teal-400">
                                                    Nghĩa Việt
                                                </h3>
                                                <p className="font-bold text-slate-800 dark:text-slate-200">
                                                    {quickVi || 'Chưa có nghĩa Việt trong từ điển cục bộ.'}
                                                </p>
                                            </div>
                                            <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/30 p-3">
                                                <h3 className="mb-1 text-xs font-black uppercase tracking-wider text-slate-450 dark:text-slate-500">
                                                    English fallback
                                                </h3>
                                                <p className="font-semibold text-slate-700 dark:text-slate-300">{quickEn || 'No fallback available'}</p>
                                            </div>
                                        </div>
                                        <div className="grid gap-3 md:grid-cols-2">
                                            <div className="rounded-xl border border-teal-100/60 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-3">
                                                <h3 className="mb-1 text-xs font-black uppercase tracking-wider text-slate-450 dark:text-slate-500">
                                                    Dịch tự nhiên
                                                </h3>
                                                <p className="text-sm font-semibold leading-relaxed text-slate-700 dark:text-slate-300">
                                                    {naturalTranslation || quickVi || 'Chưa có bản dịch tự nhiên.'}
                                                </p>
                                            </div>
                                            <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-3">
                                                <h3 className="mb-1 text-xs font-black uppercase tracking-wider text-slate-450 dark:text-slate-500">
                                                    Dịch sát cấu trúc
                                                </h3>
                                                <p className="text-sm font-semibold leading-relaxed text-slate-700 dark:text-slate-300">
                                                    {literalTranslation || quickVi || 'Chưa có bản dịch sát.'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {quickMeaning?.hsk_level && (
                                                <span className="rounded-md bg-amber-105 dark:bg-amber-950/35 px-2 py-1 text-xs font-bold text-amber-700 dark:text-amber-400 border border-amber-200/20">
                                                    HSK {quickMeaning.hsk_level}
                                                </span>
                                            )}
                                            {domainTags.map((tag) => (
                                                <span key={tag} className="rounded-md bg-cyan-105 dark:bg-cyan-950/35 px-2 py-1 text-xs font-bold text-cyan-700 dark:text-cyan-400 border border-cyan-200/20">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'context' && (
                                    <div className="space-y-3">
                                        <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/30 p-4">
                                            <h3 className="mb-2 text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-550">Original sentence</h3>
                                            <p className="chinese-text text-xl leading-loose text-slate-850 dark:text-slate-200">{sourceSentence}</p>
                                        </div>
                                        <div className="rounded-xl border border-teal-100/60 dark:border-slate-850 bg-teal-50/40 dark:bg-teal-950/20 p-4">
                                            <h3 className="mb-2 text-xs font-black uppercase tracking-wider text-teal-700 dark:text-teal-400">
                                                Vai trò trong câu
                                            </h3>
                                            <p className="text-sm font-black text-slate-800 dark:text-slate-200">
                                                {activeAnalysis?.context?.role_vi || 'Đơn vị được chọn trong câu'}
                                            </p>
                                            <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-705 dark:text-slate-300">
                                                {activeAnalysis?.context?.explanation_vi ||
                                                    'Chọn từ/cụm trong PDF hoặc văn bản để backend phân tích cùng câu gốc và domain.'}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'ai' && (
                                    <div className="space-y-3">
                                        <div className="rounded-xl border border-amber-100/65 dark:border-amber-900 bg-amber-50/45 dark:bg-amber-950/20 p-4">
                                            <div className="mb-2 flex items-center justify-between gap-3">
                                                <h3 className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
                                                    Google AI context layer
                                                </h3>
                                                {aiContext?.status && (
                                                    <span className="rounded-full bg-white dark:bg-slate-800 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
                                                        {aiContext.status}
                                                    </span>
                                                )}
                                            </div>
                                            {isGeneratingAIContext ? (
                                                <div className="flex items-center gap-2 text-sm font-bold text-amber-700 dark:text-amber-400">
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                    Đang gọi AI context reading...
                                                </div>
                                            ) : aiContext?.status === 'ok' && aiContext.response ? (
                                                <div className="space-y-3">
                                                    <p className="text-sm font-semibold leading-relaxed text-slate-700 dark:text-slate-350">
                                                        {aiContext.response.context_explanation_vi || aiContext.response.raw_text}
                                                    </p>
                                                    <div className="grid gap-3 md:grid-cols-2">
                                                        <div className="rounded-lg bg-white dark:bg-slate-900 p-3">
                                                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                                                Dịch tự nhiên
                                                            </p>
                                                            <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-200">
                                                                {aiContext.response.natural_vi || 'Không có'}
                                                            </p>
                                                        </div>
                                                        <div className="rounded-lg bg-white dark:bg-slate-900 p-3">
                                                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                                                Sát cấu trúc
                                                            </p>
                                                            <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-200">
                                                                {aiContext.response.literal_vi || 'Không có'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-xs font-semibold text-slate-505 dark:text-slate-400">
                                                    AI chưa được kích hoạt cho selection hiện tại. Hãy bấm nút AI phía trên để giải thích ngữ pháp và sắc thái nâng cao.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'grammar' && (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 text-sm font-black text-slate-700 dark:text-slate-300">
                                            Ngữ pháp & Cấu trúc liên kết
                                        </div>
                                        {grammarPatterns.length > 0 ? (
                                            grammarPatterns.map((pattern) => (
                                                <div key={pattern.pattern} className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 text-sm">
                                                    <p className="font-bold text-teal-700 dark:text-teal-400">{pattern.pattern}</p>
                                                    <p className="mt-1 text-xs text-slate-550 dark:text-slate-400 font-semibold">{pattern.meaning_vi}</p>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="rounded-xl bg-slate-50 dark:bg-slate-950/20 p-4 text-xs font-semibold text-slate-500">
                                                Chưa phát hiện cấu trúc đặc biệt ở phân khúc này.
                                            </p>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'examples' && (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 text-sm font-black text-slate-700 dark:text-slate-300">
                                            Ví dụ minh họa
                                        </div>
                                        {exampleList.length > 0 ? (
                                            exampleList.map((example) => (
                                                <div key={example} className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                                    {example}
                                                </div>
                                            ))
                                        ) : (
                                            <p className="rounded-xl bg-slate-50 dark:bg-slate-950/20 p-4 text-sm font-semibold text-slate-500">
                                                Chưa có ví dụ cục bộ cho selection này.
                                            </p>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'note' && (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 text-sm font-black text-slate-700 dark:text-slate-300">
                                            <Highlighter className="h-4 w-4 text-teal-600" />
                                            Personal Note
                                        </div>
                                        <textarea
                                            value={note}
                                            onChange={(event) => setNote(event.target.value)}
                                            rows={5}
                                            placeholder="Ghi chú cá nhân hoặc nghĩa bạn muốn ưu tiên cho ngữ cảnh này..."
                                            className="w-full resize-none rounded-xl border border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 text-sm outline-none focus:border-teal-400 text-slate-800 dark:text-slate-200"
                                        />
                                        <div className="rounded-2xl border border-teal-100/60 dark:border-slate-800 bg-teal-50/40 dark:bg-teal-950/20 p-3">
                                            <h3 className="mb-2 text-xs font-black uppercase tracking-wider text-teal-700 dark:text-teal-400">
                                                Ghi đè bản dịch Tiếng Việt
                                            </h3>
                                            <div className="flex flex-col gap-2 sm:flex-row">
                                                <input
                                                    value={meaningOverride}
                                                    onChange={(event) => setMeaningOverride(event.target.value)}
                                                    placeholder="Ví dụ: hệ thống máy tính"
                                                    className="min-w-0 flex-1 rounded-xl border border-teal-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold outline-none focus:border-teal-450 text-slate-800 dark:text-slate-200"
                                                />
                                                <button
                                                    onClick={handleSaveCorrection}
                                                    disabled={!selectedSurface || !meaningOverride.trim()}
                                                    className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-black text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-500"
                                                >
                                                    Lưu nghĩa
                                                </button>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleMarkKnown}
                                            disabled={!selectedSurface}
                                            className="rounded-xl border border-emerald-205 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-2 text-sm font-black text-emerald-700 dark:text-emerald-400 disabled:cursor-not-allowed disabled:border-slate-100 disabled:bg-slate-50 dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
                                        >
                                            Đánh dấu: Đã biết từ này
                                        </button>
                                    </div>
                                )}

                                {activeTab === 'review' && (
                                    <div className="space-y-3">
                                        <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/30 p-4">
                                            <h3 className="mb-2 text-xs font-black uppercase tracking-wider text-slate-400">
                                                Đề xuất câu hỏi (SRS)
                                            </h3>
                                            <p className="chinese-text text-lg font-black leading-loose text-slate-805 dark:text-slate-200">
                                                {activeAnalysis?.review_suggestion?.front ||
                                                    (selectedSurface ? sourceSentence.replace(selectedSurface, '____') : sourceSentence)}
                                            </p>
                                            <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-400">
                                                Đáp án: {activeAnalysis?.review_suggestion?.answer || selectedSurface}
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3">
                                            <button
                                                onClick={handleSave}
                                                disabled={!selectedToken}
                                                className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-black shadow-sm ${
                                                    selectedWordSaved
                                                        ? 'border border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400'
                                                        : selectedToken
                                                          ? 'bg-teal-600 text-white hover:bg-teal-700'
                                                          : 'cursor-not-allowed bg-slate-200 dark:bg-slate-800 text-slate-500'
                                                }`}
                                            >
                                                {selectedWordSaved ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                                                {selectedWordSaved ? 'Đã có trong từ vựng' : 'Lưu annotation + review'}
                                            </button>
                                            {savedNotice && <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{savedNotice}</span>}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex h-56 flex-col items-center justify-center text-center text-slate-500">
                                <FileText className="mb-3 h-10 w-10 text-slate-300 dark:text-slate-700 animate-bounce" />
                                <p className="max-w-sm font-semibold text-slate-500 dark:text-slate-450">Bấm chọn một câu hoặc một từ trong tài liệu để hiển thị bảng phân tích ngữ nghĩa chi tiết.</p>
                            </div>
                        )}
                    </div>

                    <div className="rounded-2xl border border-teal-100/60 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-5 custom-shadow">
                        <h2 className="mb-3 font-black text-slate-900 dark:text-slate-100">Annotation gần đây</h2>
                        <div className="space-y-2">
                            {annotations.slice(0, 4).map((annotation) => (
                                <div key={annotation.id} className="flex items-center justify-between rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/20 p-3">
                                    <div>
                                        <p className="chinese-text text-lg font-black text-teal-700 dark:text-teal-400">{annotation.selected_text}</p>
                                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate max-w-[200px]">{annotation.explanation_vi || annotation.selected_meaning_vi}</p>
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-550">
                                        {annotation.hsk_level ? `HSK ${annotation.hsk_level}` : 'Custom'}
                                    </span>
                                </div>
                            ))}
                            {annotations.length === 0 && (
                                <p className="rounded-xl bg-slate-50 dark:bg-slate-950/20 p-4 text-sm font-semibold text-slate-500">
                                    Chưa có ghi chú lưu trữ.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}

function PdfDocumentViewer({
    sourceUrl,
    onSelection,
    annotations,
}: {
    sourceUrl: string
    onSelection: (selection: PdfSelection) => void
    annotations: AnnotationRecord[]
}) {
    const [pdfDocument, setPdfDocument] = useState<any>(null)
    const [pageNumbers, setPageNumbers] = useState<number[]>([])
    const [error, setError] = useState('')
    const viewerRef = useRef<HTMLDivElement>(null)

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
        if (!selection || !selectedText || selection.rangeCount === 0) return

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
            x: Math.round(rangeRect.left - pageRect.left),
            y: Math.round(rangeRect.top - pageRect.top),
            width: Math.round(rangeRect.width),
            height: Math.round(rangeRect.height),
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
            <div className="flex h-64 flex-col items-center justify-center gap-3 text-teal-700">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-sm font-bold">PDF.js đang render canvas + text layer...</p>
            </div>
        )
    }

    return (
        <div ref={viewerRef} onMouseUp={handleMouseUp} className="mx-auto flex max-w-4xl flex-col gap-6">
            {pageNumbers.map((pageNumber) => (
                <PdfPage
                    key={pageNumber}
                    pdfDocument={pdfDocument}
                    pageNumber={pageNumber}
                    annotations={annotations.filter((annotation) => annotation.page_number === pageNumber)}
                />
            ))}
        </div>
    )
}

function PdfPage({
    pdfDocument,
    pageNumber,
    annotations,
}: {
    pdfDocument: any
    pageNumber: number
    annotations: AnnotationRecord[]
}) {
    const pageRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const textLayerRef = useRef<HTMLDivElement>(null)
    const [size, setSize] = useState({ width: 1, height: 1 })

    useEffect(() => {
        let cancelled = false
        let renderTask: any = null

        async function renderPage() {
            const page = await pdfDocument.getPage(pageNumber)
            if (cancelled) return

            const baseViewport = page.getViewport({ scale: 1 })
            const targetWidth = Math.min(760, Math.max(320, window.innerWidth - 380))
            const scale = targetWidth / baseViewport.width
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
    }, [pdfDocument, pageNumber])

    return (
        <div
            ref={pageRef}
            data-page-number={pageNumber}
            className="relative mx-auto overflow-hidden rounded-2xl border border-slate-200 bg-white custom-shadow"
            style={{ width: size.width, height: size.height }}
        >
            <canvas ref={canvasRef} className="absolute inset-0" />
            {annotations.map((annotation) => {
                const bbox = safeBbox(annotation.bbox_json)
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

function safeBbox(value?: string) {
    if (!value) return null
    try {
        const bbox = JSON.parse(value) as { x?: number; y?: number; width?: number; height?: number }
        if (
            typeof bbox.x !== 'number' ||
            typeof bbox.y !== 'number' ||
            typeof bbox.width !== 'number' ||
            typeof bbox.height !== 'number'
        ) {
            return null
        }
        return bbox as { x: number; y: number; width: number; height: number }
    } catch {
        return null
    }
}
