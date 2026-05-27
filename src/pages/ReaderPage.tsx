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
    Volume2,
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

type PanelTab = 'quick' | 'context' | 'grammar' | 'examples' | 'note' | 'review'

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
        isAnalyzing,
        analyzeChineseText,
        saveChineseAnnotation,
        saveUserCorrection,
        savedWords,
        annotations,
        updateReadingProgress,
        settings,
    } = useStore()

    const [selectedSentence, setSelectedSentence] = useState<ChineseSentenceAnalysis | null>(null)
    const [selectedToken, setSelectedToken] = useState<ChineseToken | null>(null)
    const [pdfSelection, setPdfSelection] = useState<PdfSelection | null>(null)
    const [note, setNote] = useState('')
    const [meaningOverride, setMeaningOverride] = useState('')
    const [savedNotice, setSavedNotice] = useState('')
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

    const panelTabs: { id: PanelTab; label: string }[] = [
        { id: 'quick', label: 'Quick Meaning' },
        { id: 'context', label: 'Context' },
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
        <div className="flex h-[calc(100vh-6.5rem)] flex-col overflow-hidden rounded-[2rem] border border-white bg-white/80 custom-shadow backdrop-blur md:flex-row">
            <section className="flex min-h-0 flex-1 flex-col border-b border-teal-100/80 md:w-1/2 md:border-b-0 md:border-r">
                <div className="flex items-center justify-between border-b border-teal-100 bg-white/90 px-5 py-4">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white custom-shadow">
                            <BookOpen className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="truncate text-lg font-black text-slate-900">
                                {currentDocument?.title || 'Chưa chọn tài liệu'}
                            </h1>
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                Reader mode · {sentences.length} câu · {hskLabel}
                            </p>
                        </div>
                    </div>
                    <select
                        value={currentDocument?.id || ''}
                        onChange={(event) => {
                            const doc = documents.find((item) => item.id === event.target.value) ?? null
                            setCurrentDocument(doc)
                        }}
                        className="max-w-[180px] rounded-lg border border-teal-100 bg-white px-3 py-2 text-xs font-semibold text-slate-600 outline-none focus:border-teal-400"
                    >
                        {documents.map((doc) => (
                            <option key={doc.id} value={doc.id}>
                                {doc.title}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/70 p-5 scrollbar-hide">
                    {currentDocument?.type === 'pdf' && currentDocument.sourceUrl ? (
                        <PdfDocumentViewer
                            sourceUrl={currentDocument.sourceUrl}
                            onSelection={handlePdfSelection}
                            annotations={annotations.filter((annotation) => annotation.document_id === currentDocument.id)}
                        />
                    ) : (
                        <article className="mx-auto min-h-full max-w-3xl rounded-[2rem] border border-white bg-white p-6 custom-shadow">
                            {isAnalyzing ? (
                                <div className="flex h-64 flex-col items-center justify-center gap-3 text-teal-700">
                                    <Loader2 className="h-8 w-8 animate-spin" />
                                    <p className="text-sm font-bold">Đang segment và tạo pinyin...</p>
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
                                                        ? 'scale-[1.01] border-teal-400 bg-teal-50 shadow-md'
                                                        : 'border-transparent bg-white hover:border-teal-200 hover:bg-teal-50/40'
                                                }`}
                                            >
                                                <p className="chinese-text text-[22px] leading-loose text-slate-800">
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
                                                                                  ? 'bg-teal-200 text-teal-950 ring-2 ring-teal-300'
                                                                                  : 'hover:bg-teal-100 hover:text-teal-800'
                                                                          }`
                                                                        : 'text-slate-500'
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

            <section className="min-h-0 flex-1 overflow-y-auto bg-slate-50/70 p-5 scrollbar-hide md:w-1/2">
                <div className="flex flex-col gap-5">
                    <div className="rounded-[2rem] border border-teal-100 bg-white p-5 custom-shadow">
                        <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
                            <div className="flex items-center gap-2">
                                <Layers className="h-5 w-5 text-teal-600" />
                                <h2 className="font-black text-slate-900">Context Reader Panel</h2>
                            </div>
                            {selectedSurface && (
                                <button
                                    onClick={() => speak(selectedSurface)}
                                    className="rounded-lg border border-teal-100 p-2 text-teal-700 hover:bg-teal-50"
                                    title="Nghe phát âm"
                                >
                                    <Volume2 className="h-4 w-4" />
                                </button>
                            )}
                        </div>

                        {selectedSentence || selectedSurface ? (
                            <div className="space-y-4">
                                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                    <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-wider">
                                        {pdfSelection && (
                                            <span className="rounded-full bg-teal-100 px-2 py-1 text-teal-700">
                                                PDF page {pdfSelection.pageNumber}
                                            </span>
                                        )}
                                        <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">
                                            {activeAnalysis?.selection?.analysis_mode || (selectedToken ? 'word' : 'sentence')}
                                        </span>
                                        <span className="rounded-full bg-cyan-50 px-2 py-1 text-cyan-700">
                                            {activeAnalysis?.context?.domain || settings.domainMode || 'auto'}
                                        </span>
                                    </div>
                                    <p className="chinese-text text-3xl font-black leading-loose text-teal-700">
                                        {selectedSurface || selectedSentence?.text}
                                    </p>
                                    {quickPinyin && <p className="mt-1 text-sm font-semibold italic text-slate-500">/{quickPinyin}/</p>}
                                </div>

                                <div className="flex gap-2 overflow-x-auto pb-1">
                                    {panelTabs.map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-black transition-colors ${
                                                activeTab === tab.id
                                                    ? 'bg-teal-600 text-white'
                                                    : 'border border-slate-200 bg-white text-slate-500 hover:border-teal-200 hover:text-teal-700'
                                            }`}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>

                                {activeTab === 'quick' && (
                                    <div className="space-y-3">
                                        <div className="grid gap-3 md:grid-cols-2">
                                            <div className="rounded-xl border-l-4 border-teal-500 bg-teal-50 p-3">
                                                <h3 className="mb-1 text-xs font-black uppercase tracking-wider text-teal-800">
                                                    Nghĩa Việt
                                                </h3>
                                                <p className="font-bold text-slate-800">
                                                    {quickVi || 'Chưa có nghĩa Việt trong từ điển cục bộ.'}
                                                </p>
                                            </div>
                                            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                                                <h3 className="mb-1 text-xs font-black uppercase tracking-wider text-slate-400">
                                                    English fallback
                                                </h3>
                                                <p className="font-semibold text-slate-700">{quickEn || 'No fallback available'}</p>
                                            </div>
                                        </div>
                                        <div className="grid gap-3 md:grid-cols-2">
                                            <div className="rounded-xl border border-teal-100 bg-white p-3">
                                                <h3 className="mb-1 text-xs font-black uppercase tracking-wider text-slate-400">
                                                    Dịch tự nhiên
                                                </h3>
                                                <p className="text-sm font-semibold leading-relaxed text-slate-700">
                                                    {naturalTranslation || quickVi || 'Chưa có bản dịch tự nhiên.'}
                                                </p>
                                            </div>
                                            <div className="rounded-xl border border-slate-100 bg-white p-3">
                                                <h3 className="mb-1 text-xs font-black uppercase tracking-wider text-slate-400">
                                                    Dịch sát cấu trúc
                                                </h3>
                                                <p className="text-sm font-semibold leading-relaxed text-slate-700">
                                                    {literalTranslation || quickVi || 'Chưa có bản dịch sát.'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {quickMeaning?.hsk_level && (
                                                <span className="rounded-md bg-amber-100 px-2 py-1 text-xs font-bold text-amber-700">
                                                    HSK {quickMeaning.hsk_level}
                                                </span>
                                            )}
                                            {domainTags.map((tag) => (
                                                <span key={tag} className="rounded-md bg-cyan-100 px-2 py-1 text-xs font-bold text-cyan-700">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'context' && (
                                    <div className="space-y-3">
                                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                                            <h3 className="mb-2 text-xs font-black uppercase tracking-wider text-slate-400">Original sentence</h3>
                                            <p className="chinese-text text-xl leading-loose text-slate-800">{sourceSentence}</p>
                                        </div>
                                        <div className="rounded-xl border border-teal-100 bg-teal-50/70 p-4">
                                            <h3 className="mb-2 text-xs font-black uppercase tracking-wider text-teal-700">
                                                Vai trò trong câu
                                            </h3>
                                            <p className="text-sm font-black text-slate-800">
                                                {activeAnalysis?.context?.role_vi || 'Đơn vị được chọn trong câu'}
                                            </p>
                                            <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-700">
                                                {activeAnalysis?.context?.explanation_vi ||
                                                    'Chọn từ/cụm trong PDF hoặc văn bản để backend phân tích cùng câu gốc và domain.'}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'grammar' && (
                                    <div className="space-y-3">
                                        {grammarPatterns.length > 0 ? (
                                            grammarPatterns.map((pattern) => (
                                                <div key={pattern.pattern} className="rounded-xl border border-amber-100 bg-amber-50 p-3">
                                                    <p className="text-sm font-bold text-amber-800">{pattern.pattern}</p>
                                                    <p className="mt-1 text-sm leading-relaxed text-slate-600">{pattern.meaning_vi}</p>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">
                                                Chưa phát hiện rule grammar nổi bật trong selection này.
                                            </p>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'examples' && (
                                    <div className="space-y-3">
                                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                                            <h3 className="mb-2 text-xs font-black uppercase tracking-wider text-slate-400">
                                                Phân tích token
                                            </h3>
                                            <div className="flex flex-wrap gap-2">
                                                {(activeAnalysis?.sentences[0]?.tokens || selectedSentence?.tokens || [])
                                                    .filter(isSelectableToken)
                                                    .map((token) => (
                                                        <span key={token.surface} className="rounded-lg bg-white px-2 py-1 text-sm font-bold text-slate-700">
                                                            {token.surface} = {getVietnameseDefinition(token)}
                                                        </span>
                                                    ))}
                                            </div>
                                        </div>
                                        {exampleList.length > 0 ? (
                                            exampleList.map((example) => (
                                                <div key={example} className="rounded-xl border border-slate-100 bg-white p-3 text-sm font-semibold text-slate-700">
                                                    {example}
                                                </div>
                                            ))
                                        ) : (
                                            <p className="rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">
                                                Chưa có ví dụ cục bộ cho selection này.
                                            </p>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'note' && (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 text-sm font-black text-slate-700">
                                            <Highlighter className="h-4 w-4 text-teal-600" />
                                            Personal Note
                                        </div>
                                        <textarea
                                            value={note}
                                            onChange={(event) => setNote(event.target.value)}
                                            rows={5}
                                            placeholder="Ghi chú cá nhân hoặc nghĩa bạn muốn ưu tiên cho ngữ cảnh này..."
                                            className="w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-teal-400"
                                        />
                                        <div className="rounded-2xl border border-teal-100 bg-teal-50/60 p-3">
                                            <h3 className="mb-2 text-xs font-black uppercase tracking-wider text-teal-700">
                                                Edit Vietnamese meaning
                                            </h3>
                                            <div className="flex flex-col gap-2 sm:flex-row">
                                                <input
                                                    value={meaningOverride}
                                                    onChange={(event) => setMeaningOverride(event.target.value)}
                                                    placeholder="Ví dụ: hệ thống máy tính"
                                                    className="min-w-0 flex-1 rounded-xl border border-teal-100 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-teal-400"
                                                />
                                                <button
                                                    onClick={handleSaveCorrection}
                                                    disabled={!selectedSurface || !meaningOverride.trim()}
                                                    className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                                                >
                                                    Lưu nghĩa
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'review' && (
                                    <div className="space-y-3">
                                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                                            <h3 className="mb-2 text-xs font-black uppercase tracking-wider text-slate-400">
                                                Review suggestion
                                            </h3>
                                            <p className="chinese-text text-lg font-black leading-loose text-slate-800">
                                                {activeAnalysis?.review_suggestion?.front ||
                                                    (selectedSurface ? sourceSentence.replace(selectedSurface, '____') : sourceSentence)}
                                            </p>
                                            <p className="mt-2 text-sm font-semibold text-slate-600">
                                                Answer: {activeAnalysis?.review_suggestion?.answer || selectedSurface}
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3">
                                            <button
                                                onClick={handleSave}
                                                disabled={!selectedToken}
                                                className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-black shadow-sm ${
                                                    selectedWordSaved
                                                        ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                                                        : selectedToken
                                                          ? 'bg-teal-600 text-white hover:bg-teal-700'
                                                          : 'cursor-not-allowed bg-slate-200 text-slate-500'
                                                }`}
                                            >
                                                {selectedWordSaved ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                                                {selectedWordSaved ? 'Đã có trong từ vựng' : 'Lưu annotation + review'}
                                            </button>
                                            {savedNotice && <span className="text-sm font-semibold text-emerald-600">{savedNotice}</span>}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex h-56 flex-col items-center justify-center text-center text-slate-500">
                                <FileText className="mb-3 h-10 w-10 text-slate-300" />
                                <p className="max-w-sm font-semibold">Chọn text trong PDF hoặc click vào token để mở phân tích song ngữ theo ngữ cảnh.</p>
                            </div>
                        )}
                    </div>

                    <div className="rounded-2xl border border-teal-100 bg-white p-5 custom-shadow">
                        <h2 className="mb-3 font-black text-slate-900">Annotation gần đây</h2>
                        <div className="space-y-2">
                            {annotations.slice(0, 5).map((annotation) => (
                                <div key={annotation.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3">
                                    <div>
                                        <p className="chinese-text text-lg font-black text-teal-700">{annotation.selected_text}</p>
                                        <p className="text-xs font-semibold text-slate-500">{annotation.explanation_vi}</p>
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        {annotation.hsk_level ? `HSK ${annotation.hsk_level}` : 'Custom'}
                                    </span>
                                </div>
                            ))}
                            {annotations.length === 0 && (
                                <p className="rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">
                                    Chưa có annotation. Lưu một từ để tạo flashcard đầu tiên.
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
