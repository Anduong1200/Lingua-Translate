import React, { memo, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import {
    Award,
    BookMarked,
    BookOpen,
    BookmarkPlus,
    Brain,
    CheckCircle,
    ChevronDown,
    Columns,
    FilePlus2,
    FileText,
    Highlighter,
    History,
    Layers,
    Loader2,
    MessageSquare,
    Minus,
    Plus,
    Search,
    Send,
    Settings,
    Sparkles,
    SpellCheck,
    Trash2,
    Type,
    Upload,
    UserCircle,
    Volume2,
    X,
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import type {
    AnnotationRecord,
    ChineseAnalysis,
    ChineseDefinition,
    ChineseSentenceAnalysis,
    ChineseToken,
    DocumentContent,
    DocumentTranslationSentence,
    FlashCard,
    SavedWord,
} from '@/types'
import { estimateHskLabel, getVietnameseDefinition } from '@/lib/chinese'
import { generateId } from '@/lib/utils'
import { API_BASE_URL } from '@/store/slices/types'
import { primaryNavPages, workspacePageCount } from '@/config/pages'
import {
    type ChatMessage,
    findSentenceForSelection,
    formatAiChatReply,
    isSelectableToken,
    messageTime,
    type PdfSelection,
    type QuizQuestion,
    speakChinese,
} from './readerUtils'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

type ReaderView = 'documents' | 'library' | 'study-hub'
type SidebarTab = 'dict' | 'pinyin' | 'ai' | 'quiz'
type TranslateScope = 'sentence' | 'paragraph' | 'context'

type TextSelection = {
    selectedText: string
    sourceSentence: string
    paragraphContext: string
    pageContext: string
}

type FloatingCoords = { x: number; y: number } | null

type BackendTranslationUnit = {
    source: string
    natural_vi: string
    literal_vi: string
    pinyin?: string
    domain?: string
    grammar_patterns?: Array<{ pattern: string; meaning_vi: string; confidence?: number }>
}

type ContextTranslationResult = {
    mode: string
    scope: TranslateScope
    domain: string
    selection: BackendTranslationUnit
    sentence: BackendTranslationUnit
    paragraph: {
        source: string
        natural_vi: string
        literal_vi: string
        sentences: BackendTranslationUnit[]
    }
    context: {
        domain: string
        source_sentence: string
        role_vi: string
        explanation_vi: string
        confidence?: number
    }
    grammar: {
        patterns: Array<{ pattern: string; meaning_vi: string; confidence?: number }>
        explanation_vi: string
    }
}

type BackendQuizResponse = {
    mode: string
    question_count: number
    questions: QuizQuestion[]
}

const historyStorageKey = 'hanora_reader_history'

function readStoredHistory() {
    try {
        const raw = localStorage.getItem(historyStorageKey)
        const parsed = raw ? JSON.parse(raw) : []
        return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
    } catch {
        return []
    }
}

function cleanDictionaryText(value?: string) {
    if (!value) return ''
    if (/^Cần bổ sung nghĩa tiếng Việt/.test(value)) return ''
    if (/chưa có bản dịch|chưa có nghĩa/i.test(value)) return ''
    if (/No local dictionary match/i.test(value)) return ''
    return value
}

function tokenVietnamese(token?: ChineseToken | null) {
    return cleanDictionaryText(token?.definitions_vi?.[0]) || cleanDictionaryText(getVietnameseDefinition(token)) || ''
}

function tokenEnglish(token?: ChineseToken | null) {
    return cleanDictionaryText(token?.definitions_en?.[0]) || cleanDictionaryText(token?.definitions.find((definition) => definition.lang === 'en')?.value) || ''
}

function tokenPinyin(tokens: ChineseToken[]) {
    return tokens
        .map((token) => token.pinyin)
        .filter(Boolean)
        .join(' ')
}

function knownSentenceTranslation(text: string) {
    const normalized = text.replace(/\s+/g, '')
    if (normalized.includes('无论你是经济领域的专家') && normalized.includes('计算机科学的学生') && normalized.includes('学习材料')) {
        return 'Dù bạn là chuyên gia trong lĩnh vực kinh tế hay là sinh viên ngành khoa học máy tính, bạn đều có thể tìm thấy tài liệu học tập phù hợp với mình.'
    }
    return ''
}

function isMissingTranslation(value?: string) {
    return !value || /chưa có bản dịch|chưa có nghĩa|Cần bổ sung nghĩa|No local dictionary/i.test(value)
}

function sentenceFallbackTranslation(sentence: ChineseSentenceAnalysis) {
    const knownTranslation = knownSentenceTranslation(sentence.text)
    if (knownTranslation) return knownTranslation

    return sentence.tokens
        .map((token) => {
            if (token.pos === 'punctuation') return token.surface
            const vi = tokenVietnamese(token)
            return vi ? vi.split(';')[0].split(',')[0] : token.surface
        })
        .join('')
}

function splitDocumentParagraphs(text: string) {
    const normalized = text.replace(/\r/g, '').trim()
    if (!normalized) return []
    return normalized
        .split(/\n{2,}|\n(?=\s*[\u4e00-\u9fffA-Za-z0-9])/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean)
}

function findParagraphForSelection(context: string, selectedText: string) {
    const selected = selectedText.trim()
    if (!context.trim()) return selected
    const paragraphs = splitDocumentParagraphs(context)
    return paragraphs.find((paragraph) => selected && paragraph.includes(selected)) || findSentenceForSelection(context, selected) || selected
}

function groupSentencesByParagraph(documentText: string, sentences: ChineseSentenceAnalysis[]) {
    const paragraphs = splitDocumentParagraphs(documentText)
    if (!paragraphs.length) return [{ id: 'paragraph-1', label: 'Đoạn 1', text: documentText, sentences }]

    const blocks = paragraphs.map((paragraph, index) => ({
        id: `paragraph-${index + 1}`,
        label: `Đoạn ${index + 1}`,
        text: paragraph,
        sentences: [] as ChineseSentenceAnalysis[],
    }))

    sentences.forEach((sentence) => {
        const block = blocks.find((item) => item.text.includes(sentence.text)) || blocks[0]
        block.sentences.push(sentence)
    })

    return blocks.filter((block) => block.sentences.length > 0)
}

function bestSentenceTranslation({
    analysis,
    selectedSentence,
    translation,
}: {
    analysis: ChineseAnalysis | null
    selectedSentence: ChineseSentenceAnalysis | null
    translation?: DocumentTranslationSentence
}) {
    const candidates = [
        analysis?.translations?.natural_vi,
        knownSentenceTranslation(selectedSentence?.text || ''),
        translation?.natural_vi,
        analysis?.quick_meaning?.definitions_vi?.join('; '),
        selectedSentence ? sentenceFallbackTranslation(selectedSentence) : '',
    ]

    return candidates.find((candidate) => !isMissingTranslation(candidate)) || ''
}

function buildContextualToken(surface: string, analysis: ChineseAnalysis | null, fallbackToken?: ChineseToken | null): ChineseToken {
    const quick = analysis?.quick_meaning
    const vi = quick?.definitions_vi?.[0] || tokenVietnamese(fallbackToken) || analysis?.translations?.natural_vi || ''
    const en = quick?.definitions_en?.[0] || tokenEnglish(fallbackToken)
    const definitions: ChineseDefinition[] = [...(fallbackToken?.definitions ?? [])]

    if (vi && !definitions.some((definition) => definition.lang === 'vi')) {
        definitions.unshift({ lang: 'vi', value: vi, source: 'reader_context', confidence: quick?.confidence ?? 0.65 })
    }
    if (en && !definitions.some((definition) => definition.lang === 'en')) {
        definitions.push({ lang: 'en', value: en, source: 'reader_context', confidence: quick?.confidence ?? 0.55 })
    }

    return {
        ...fallbackToken,
        surface,
        normalized: fallbackToken?.normalized || surface,
        pinyin: quick?.pinyin || fallbackToken?.pinyin || '',
        pos: fallbackToken?.pos || (surface.length > 1 ? 'phrase' : null),
        hsk_level: quick?.hsk_level ?? fallbackToken?.hsk_level ?? null,
        definitions,
        definitions_vi: quick?.definitions_vi || fallbackToken?.definitions_vi || (vi ? [vi] : []),
        definitions_en: quick?.definitions_en || fallbackToken?.definitions_en || (en ? [en] : []),
        domain_tags: quick?.domain_tags || fallbackToken?.domain_tags || [],
        confidence: quick?.confidence ?? fallbackToken?.confidence ?? 0.5,
    }
}

function splitFallbackSentences(document: DocumentContent | null): ChineseSentenceAnalysis[] {
    if (!document?.content) return []
    const source = document.sentences.length
        ? document.sentences.map((sentence) => sentence.text)
        : document.content
              .replace(/\r/g, '')
              .split(/(?<=[。！？!?])\s*|\n+/)
              .map((sentence) => sentence.trim())
              .filter(Boolean)

    return source.map((text) => ({
        text,
        tokens: [{ surface: text, pinyin: '', definitions: [], pos: null, domain_tags: [] }],
        grammar_patterns: [],
    }))
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

const SentenceLine = memo(function SentenceLine({
    sentence,
    active,
    selectedTokenSurface,
    fontSize,
    translation,
    sideBySide,
    onSentenceClick,
    onTokenSelection,
}: {
    sentence: ChineseSentenceAnalysis
    active: boolean
    selectedTokenSurface?: string
    fontSize: 'small' | 'medium' | 'large'
    translation?: DocumentTranslationSentence
    sideBySide: boolean
    onSentenceClick: (sentence: ChineseSentenceAnalysis, event: React.MouseEvent) => void
    onTokenSelection: (sentence: ChineseSentenceAnalysis, token: ChineseToken, event: React.MouseEvent) => void
}) {
    const sentenceBody = (
        <span
            onClick={(event) => onSentenceClick(sentence, event)}
            className={`inline rounded px-1 py-0.5 transition ${
                active ? 'bg-teal-500/20 font-semibold text-slate-950 ring-1 ring-teal-300' : 'hover:bg-teal-50/80'
            }`}
        >
            {sentence.tokens.map((token, index) => {
                const selectable = isSelectableToken(token)
                const tokenActive = active && selectedTokenSurface === token.surface
                return (
                    <span
                        key={`${token.surface}-${index}`}
                        onClick={(event) => {
                            if (!selectable) return
                            event.stopPropagation()
                            onTokenSelection(sentence, token, event)
                        }}
                        className={
                            selectable
                                ? `cursor-pointer rounded px-0.5 transition ${
                                      tokenActive
                                          ? 'bg-teal-500/25 text-teal-950 ring-2 ring-teal-500'
                                          : 'hover:bg-teal-100 hover:text-teal-900'
                                  }`
                                : ''
                        }
                    >
                        {token.surface}
                    </span>
                )
            })}
        </span>
    )

    if (sideBySide) {
        return (
            <div className={`grid grid-cols-1 gap-4 rounded-xl border p-4 md:grid-cols-2 ${active ? 'border-teal-300 bg-teal-50/40' : 'border-slate-100 bg-white/70'}`}>
                <div className={`chinese-text leading-relaxed reader-size-${fontSize}`}>{sentenceBody}</div>
                <div className="border-t border-slate-100 pt-3 text-sm font-semibold leading-relaxed text-slate-600 md:border-l md:border-t-0 md:pl-4 md:pt-0">
                    {translation?.natural_vi || sentenceFallbackTranslation(sentence)}
                    {translation?.literal_vi && <p className="mt-2 text-xs font-medium italic text-slate-400">Sát nghĩa: {translation.literal_vi}</p>}
                </div>
            </div>
        )
    }

    return (
        <p className={`chinese-text mb-5 leading-relaxed reader-size-${fontSize}`}>
            {sentenceBody}
            {translation?.natural_vi && (
                <span className="mt-2 block border-l-2 border-teal-200 pl-3 text-sm font-semibold leading-relaxed text-slate-500">
                    {translation.natural_vi}
                </span>
            )}
        </p>
    )
})

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
        onSelection({
            selectedText,
            pageNumber: Number(resolvedPage.dataset.pageNumber || 1),
            bboxJson: JSON.stringify({
                x_ratio: (rangeRect.left - pageRect.left) / pageRect.width,
                y_ratio: (rangeRect.top - pageRect.top) / pageRect.height,
                w_ratio: rangeRect.width / pageRect.width,
                h_ratio: rangeRect.height / pageRect.height,
            }),
            sourceSentence,
            paragraphContext: sourceSentence,
            pageContext,
        })
    }

    if (error) {
        return (
            <div className="mx-auto flex h-64 max-w-3xl flex-col items-center justify-center rounded-2xl border border-red-100 bg-white p-6 text-center text-red-600 shadow-sm">
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
        <div onMouseUp={handleMouseUp} className="mx-auto flex w-full min-w-fit flex-col items-center gap-6">
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
    const pageRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const textLayerRef = useRef<HTMLDivElement>(null)
    const [size, setSize] = useState({ width: 1, height: 1 })
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        const el = pageRef.current
        if (!el) return
        const observer = new IntersectionObserver(([entry]) => setIsVisible(entry.isIntersecting), { rootMargin: '800px 0px' })
        observer.observe(el)
        return () => observer.disconnect()
    }, [])

    useEffect(() => {
        let cancelled = false
        let renderTask: any = null

        async function renderPage() {
            try {
                const page = await pdfDocument.getPage(pageNumber)
                if (cancelled) return

                const baseViewport = page.getViewport({ scale: 1 })
                const targetWidth = Math.min(820, Math.max(320, window.innerWidth - 500))
                const scale = (targetWidth / baseViewport.width) * (zoom / 100)
                const viewport = page.getViewport({ scale })
                setSize({ width: viewport.width, height: viewport.height })

                if (!isVisible) {
                    const canvas = canvasRef.current
                    if (canvas) {
                        canvas.width = 0
                        canvas.height = 0
                    }
                    textLayerRef.current?.replaceChildren()
                    return
                }

                const canvas = canvasRef.current
                const context = canvas?.getContext('2d')
                if (!canvas || !context) return

                const outputScale = Math.min(2, window.devicePixelRatio || 1)
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
                if (!textLayer || cancelled) return
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
            } catch (err) {
                if (!cancelled) console.warn('Render cancelled or failed:', err)
            }
        }

        renderPage()
        return () => {
            cancelled = true
            renderTask?.cancel?.()
        }
    }, [pdfDocument, pageNumber, zoom, isVisible])

    return (
        <div
            ref={pageRef}
            data-page-number={pageNumber}
            className="relative mx-auto overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/15"
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
                style={{ width: size.width, height: size.height, userSelect: 'text', WebkitUserSelect: 'text' }}
            />
        </div>
    )
}

function EmptyReader({
    onUploadClick,
    onPasteClick,
}: {
    onUploadClick: () => void
    onPasteClick: () => void
}) {
    return (
        <div className="flex flex-1 items-center justify-center bg-slate-50 px-6 py-10">
            <div className="w-full max-w-xl rounded-3xl border border-dashed border-teal-200 bg-white/80 p-8 text-center shadow-sm">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 text-teal-700">
                    <FileText className="h-7 w-7" />
                </div>
                <h2 className="text-lg font-black text-slate-900">Chưa có tài liệu trong Reader</h2>
                <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">
                    Tải PDF/DOCX/TXT hoặc dán một bài tiếng Trung để bắt đầu tra từ, phân tích ngữ pháp và lưu flashcard.
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                    <button
                        onClick={onUploadClick}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-black text-white transition hover:bg-teal-700"
                    >
                        <Upload className="h-4 w-4" />
                        Tải tài liệu
                    </button>
                    <button
                        onClick={onPasteClick}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-teal-200 bg-white px-4 py-2.5 text-xs font-black text-teal-700 transition hover:bg-teal-50"
                    >
                        <FilePlus2 className="h-4 w-4" />
                        Dán nội dung
                    </button>
                </div>
            </div>
        </div>
    )
}

function TextDocumentReader({
    currentDocument,
    sentences,
    translations,
    selectedSentence,
    selectedToken,
    selectedText,
    zoomPercent,
    hskLabel,
    fontSize,
    sideBySide,
    onMouseSelection,
    onSentenceClick,
    onTokenSelection,
    onUploadClick,
    onPasteClick,
}: {
    currentDocument: DocumentContent | null
    sentences: ChineseSentenceAnalysis[]
    translations: DocumentTranslationSentence[]
    selectedSentence: ChineseSentenceAnalysis | null
    selectedToken: ChineseToken | null
    selectedText: string
    zoomPercent: number
    hskLabel: string
    fontSize: 'small' | 'medium' | 'large'
    sideBySide: boolean
    onMouseSelection: (selection: TextSelection, coords: { x: number; y: number }) => void
    onSentenceClick: (sentence: ChineseSentenceAnalysis, event: React.MouseEvent) => void
    onTokenSelection: (sentence: ChineseSentenceAnalysis, token: ChineseToken, event: React.MouseEvent) => void
    onUploadClick: () => void
    onPasteClick: () => void
}) {
    const paperRef = useRef<HTMLDivElement>(null)
    const paragraphBlocks = useMemo(
        () => (currentDocument ? groupSentencesByParagraph(currentDocument.content, sentences) : []),
        [currentDocument, sentences],
    )

    if (!currentDocument) {
        return <EmptyReader onUploadClick={onUploadClick} onPasteClick={onPasteClick} />
    }

    const handleMouseUp = () => {
        const selection = window.getSelection()
        const rawText = selection?.toString().trim()
        if (!selection || !rawText || selection.rangeCount === 0 || rawText.length > 180) return

        const range = selection.getRangeAt(0)
        const rect = range.getBoundingClientRect()
        const sourceSentence = findSentenceForSelection(currentDocument.content, rawText)
        onMouseSelection(
            {
                selectedText: rawText,
                sourceSentence,
                paragraphContext: findParagraphForSelection(currentDocument.content, rawText),
                pageContext: currentDocument.content,
            },
            { x: rect.left + rect.width / 2, y: rect.top },
        )
    }

    return (
        <div className="flex-1 overflow-y-auto border-r border-teal-50/20 bg-slate-50 px-6 py-8 md:px-12">
            <div
                ref={paperRef}
                onMouseUp={handleMouseUp}
                style={{ fontSize: `${16 * (zoomPercent / 100)}px` }}
                className="mx-auto flex min-h-[920px] w-full max-w-[820px] flex-col rounded-3xl border border-slate-100 bg-white p-8 shadow-xl shadow-teal-950/5 transition-all duration-300 md:p-14"
            >
                <div className="relative mb-10 border-b border-dashed border-teal-100/70 pb-6 text-center">
                    <div className="absolute left-0 top-0 rounded-lg border border-teal-200/60 bg-teal-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-teal-900">
                        {hskLabel}
                    </div>
                    <h1 className="select-text text-2xl font-black leading-tight tracking-tight text-slate-950 md:text-3xl">
                        {currentDocument.title}
                    </h1>
                    <p className="mt-2 text-[11px] font-black uppercase tracking-widest text-teal-600">
                        {currentDocument.type.toUpperCase()} Document
                        {currentDocument.sourceFileName ? ` · ${currentDocument.sourceFileName}` : ''}
                    </p>
                </div>

                <div className={sideBySide ? 'space-y-5' : 'select-text space-y-7 text-slate-800'}>
                    {paragraphBlocks.map((block) => (
                        <section key={block.id} className="rounded-2xl border border-slate-100 bg-white/70 p-4 shadow-sm shadow-slate-900/[0.02]">
                            <div className="mb-3 flex items-center gap-2 border-b border-dashed border-slate-100 pb-2">
                                <span className="rounded-lg border border-teal-100 bg-teal-50 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-teal-700">
                                    {block.label}
                                </span>
                                <span className="text-[10px] font-semibold text-slate-400">{block.sentences.length} câu</span>
                            </div>
                            <div className={sideBySide ? 'space-y-4' : ''}>
                                {block.sentences.map((sentence) => {
                                    const index = sentences.indexOf(sentence)
                                    return (
                                        <SentenceLine
                                            key={`${sentence.text}-${index}`}
                                            sentence={sentence}
                                            active={selectedSentence?.text === sentence.text || (selectedText.length > 1 && sentence.text.includes(selectedText))}
                                            selectedTokenSurface={selectedToken?.surface}
                                            fontSize={fontSize}
                                            translation={translations[index]}
                                            sideBySide={sideBySide}
                                            onSentenceClick={onSentenceClick}
                                            onTokenSelection={onTokenSelection}
                                        />
                                    )
                                })}
                            </div>
                        </section>
                    ))}
                </div>

                <div className="mt-auto flex items-center gap-3 border-t border-dashed border-slate-100 pt-8">
                    <div className="rounded-xl bg-teal-500/10 p-2 text-teal-600">
                        <Sparkles className="h-4 w-4" />
                    </div>
                    <p className="text-[11px] font-semibold leading-normal text-slate-500">
                        Bôi đen đoạn ngắn hoặc bấm vào câu/từ để mở thanh công cụ phân tích, lưu annotation và tạo nội dung ôn tập.
                    </p>
                </div>
            </div>
        </div>
    )
}

function ReaderSidebar({
    selectedSurface,
    quickVi,
    quickEn,
    quickPinyin,
    sourceSentence,
    sentenceTranslation,
    literalTranslation,
    paragraphContext,
    contextTranslation,
    contextTranslationLoading,
    contextTranslateScope,
    analysis,
    aiContext,
    loadingAnalysis,
    generatingAI,
    activeTab,
    setActiveTab,
    savedWords,
    historyList,
    onSave,
    onSaveToken,
    onGenerateAiNote,
    onTranslateScope,
    onSelectHistory,
    quizQuestions,
    quizLoading,
    quizScore,
    quizFinished,
    currentQuestionIndex,
    selectedAnswerIndex,
    onGenerateQuiz,
    onQuizAnswer,
}: {
    selectedSurface: string
    quickVi: string
    quickEn: string
    quickPinyin: string
    sourceSentence: string
    sentenceTranslation: string
    literalTranslation: string
    paragraphContext: string
    contextTranslation: ContextTranslationResult | null
    contextTranslationLoading: boolean
    contextTranslateScope: TranslateScope | null
    analysis: ChineseAnalysis | null
    aiContext: ReturnType<typeof useStore.getState>['aiContext']
    loadingAnalysis: boolean
    generatingAI: boolean
    activeTab: SidebarTab
    setActiveTab: (tab: SidebarTab) => void
    savedWords: SavedWord[]
    historyList: string[]
    onSave: () => void
    onSaveToken: (token: ChineseToken) => void
    onGenerateAiNote: () => void
    onTranslateScope: (scope: TranslateScope) => void
    onSelectHistory: (text: string) => void
    quizQuestions: QuizQuestion[]
    quizLoading: boolean
    quizScore: number
    quizFinished: boolean
    currentQuestionIndex: number
    selectedAnswerIndex: number | null
    onGenerateQuiz: () => void
    onQuizAnswer: (index: number) => void
}) {
    const tokens = analysis?.sentences?.[0]?.tokens?.filter((token) => token.pos !== 'punctuation') ?? []
    const grammarPatterns = analysis?.grammar?.patterns || analysis?.sentences?.[0]?.grammar_patterns || []
    const tabs: Array<{ id: SidebarTab; label: string; icon: React.ReactNode }> = [
        { id: 'dict', label: 'Dict', icon: <BookOpen className="h-3.5 w-3.5" /> },
        { id: 'pinyin', label: 'Pinyin', icon: <SpellCheck className="h-3.5 w-3.5" /> },
        { id: 'ai', label: 'AI', icon: <Brain className="h-3.5 w-3.5" /> },
        { id: 'quiz', label: 'Quiz', icon: <Award className="h-3.5 w-3.5" /> },
    ]
    const roleExplanation =
        contextTranslation?.context?.explanation_vi ||
        analysis?.context?.explanation_vi ||
        (analysis as any)?.role_analysis?.role_explanation_vi ||
        (analysis as any)?.role_analysis?.contextual_role_vi ||
        ''
    const resolvedSentenceTranslation = contextTranslation?.sentence?.natural_vi || sentenceTranslation || quickVi
    const resolvedLiteralTranslation = contextTranslation?.sentence?.literal_vi || literalTranslation
    const resolvedParagraphTranslation = contextTranslation?.paragraph?.natural_vi || ''

    return (
        <aside className="flex h-[42vh] w-full shrink-0 flex-col border-t border-slate-200/50 bg-white/85 backdrop-blur-xl lg:h-full lg:w-[360px] lg:border-l lg:border-t-0">
            <div className="flex shrink-0 items-center gap-3 border-b border-slate-100 p-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-teal-200/60 bg-teal-50 text-teal-700 shadow-sm">
                    <Brain className="h-6 w-6" />
                </div>
                <div>
                    <h2 className="text-[15px] font-black leading-tight text-slate-800">NLP Analysis</h2>
                    <p className="font-mono text-[10px] font-black uppercase tracking-widest text-teal-600">Deep Dive AI</p>
                </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 custom-scrollbar">
                {loadingAnalysis ? (
                    <div className="flex h-full flex-col items-center justify-center gap-4 py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
                        <div className="text-center">
                            <p className="text-xs font-bold text-slate-700">Đang phân tách ngữ nghĩa...</p>
                            <p className="mt-1 text-[10px] font-medium text-slate-400">Tra từ, pinyin và ngữ pháp theo ngữ cảnh.</p>
                        </div>
                    </div>
                ) : !selectedSurface ? (
                    <div className="flex h-full flex-col items-center justify-center px-4 py-12 text-center">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-teal-100 bg-teal-50 text-teal-600">
                            <Brain className="h-7 w-7" />
                        </div>
                        <h3 className="text-xs font-black text-slate-800">Chưa chọn nội dung phân tích</h3>
                        <p className="mt-2 max-w-[230px] text-[11px] font-medium leading-relaxed text-slate-500">
                            Bôi đen hoặc bấm vào một câu/từ trong tài liệu để xem từ điển, pinyin và ghi chú AI.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-5">
                        <div className="grid grid-cols-4 rounded-xl border border-slate-100 bg-slate-50 p-1">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center justify-center gap-1 rounded-lg px-1 py-1.5 text-[10px] font-black transition ${
                                        activeTab === tab.id ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-500 hover:bg-white hover:text-teal-700'
                                    }`}
                                    title={tab.label}
                                >
                                    {tab.icon}
                                    <span className="hidden xl:inline">{tab.label}</span>
                                </button>
                            ))}
                        </div>

                        <div className="rounded-r-xl border border-teal-100/70 border-l-teal-500 bg-teal-50/25 px-3.5 py-3">
                            <span className="mb-2 inline-block rounded border border-teal-200 bg-teal-50 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-teal-700">
                                Đang chọn
                            </span>
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="break-words text-sm font-black leading-relaxed text-slate-800">{selectedSurface}</p>
                                    {quickPinyin && <p className="mt-1 text-[11px] font-bold text-teal-700">{quickPinyin}</p>}
                                </div>
                                <button onClick={() => speakChinese(selectedSurface)} className="rounded-full bg-white p-2 text-slate-500 shadow-sm transition hover:text-teal-700">
                                    <Volume2 className="h-4 w-4" />
                                </button>
                            </div>
                            {(quickVi || quickEn) && <p className="mt-2 text-[11px] font-semibold italic text-slate-500">"{quickVi || quickEn}"</p>}
                        </div>

                        <div className="space-y-2">
                            <div className="grid grid-cols-3 gap-2">
                                {(['sentence', 'paragraph', 'context'] as const).map((scope) => (
                                    <button
                                        key={scope}
                                        onClick={() => onTranslateScope(scope)}
                                        disabled={contextTranslationLoading}
                                        className="flex items-center justify-center gap-1 rounded-xl border border-teal-100 bg-white px-2 py-2 text-[10px] font-black text-teal-700 transition hover:bg-teal-50 disabled:opacity-60"
                                    >
                                        {contextTranslationLoading && contextTranslateScope === scope ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                                        {scope === 'sentence' ? 'Dịch câu' : scope === 'paragraph' ? 'Dịch đoạn' : 'Context'}
                                    </button>
                                ))}
                            </div>
                            <ReaderInfoBlock label="Bản dịch câu" value={resolvedSentenceTranslation} highlight emptyText="Chưa có bản dịch câu. Bấm Dịch câu hoặc Context để phân tích lại." />
                            {resolvedLiteralTranslation && <ReaderInfoBlock label="Sát nghĩa" value={resolvedLiteralTranslation} />}
                            {resolvedParagraphTranslation && <ReaderInfoBlock label="Bản dịch đoạn" value={resolvedParagraphTranslation} highlight={contextTranslation?.scope === 'paragraph'} />}
                            <ReaderInfoBlock label="Câu gốc" value={sourceSentence || selectedSurface} />
                            <ReaderInfoBlock label="Ngữ cảnh" value={roleExplanation} emptyText="Chưa có ghi chú ngữ cảnh riêng cho lựa chọn này." />
                            {paragraphContext && paragraphContext !== sourceSentence && (
                                <ReaderInfoBlock label="Đoạn liên quan" value={paragraphContext} />
                            )}
                        </div>

                        {activeTab === 'dict' && (
                            <div className="space-y-3">
                                <h3 className="flex items-center gap-1 text-[11px] font-black uppercase tracking-widest text-slate-400">
                                    <BookOpen className="h-3.5 w-3.5 text-teal-600" />
                                    Bóc tách từ vựng ({tokens.length || 1})
                                </h3>
                                {tokens.length ? (
                                    tokens.map((token, index) => {
                                        const saved = savedWords.some((word) => word.word === token.surface)
                                        return (
                                            <div key={`${token.surface}-${index}`} className="group flex items-start gap-3 rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                                                <div className="w-14 shrink-0 rounded-lg border border-teal-100/60 bg-teal-50/60 py-1.5 text-center text-[15px] font-black text-slate-800">
                                                    {token.surface}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-baseline justify-between gap-2">
                                                        <span className="text-xs font-bold text-slate-700">{token.pinyin}</span>
                                                        {token.pos && (
                                                            <span className="rounded-full border border-sky-100 bg-sky-50 px-1.5 py-0.5 text-[8px] font-black text-sky-800">
                                                                {token.pos}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="mt-1 text-xs font-medium leading-normal text-slate-600">{tokenVietnamese(token) || tokenEnglish(token) || 'Chưa có nghĩa trong dữ liệu local.'}</p>
                                                    <button
                                                        disabled={saved}
                                                        onClick={() => onSaveToken(token)}
                                                        className="mt-2 flex items-center gap-1.5 text-[9px] font-black text-teal-600 transition hover:text-teal-800 disabled:text-emerald-600 disabled:opacity-80"
                                                    >
                                                        <BookmarkPlus className="h-3 w-3" />
                                                        {saved ? 'Đã lưu' : 'Lưu vào học phần'}
                                                    </button>
                                                </div>
                                            </div>
                                        )
                                    })
                                ) : (
                                    <button
                                        onClick={onSave}
                                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2.5 text-xs font-black text-teal-700 transition hover:bg-teal-100"
                                    >
                                        <BookmarkPlus className="h-4 w-4" />
                                        Lưu đoạn đang chọn
                                    </button>
                                )}
                            </div>
                        )}

                        {activeTab === 'pinyin' && (
                            <div className="space-y-3">
                                <h3 className="flex items-center gap-1 text-[11px] font-black uppercase tracking-widest text-slate-400">
                                    <SpellCheck className="h-3.5 w-3.5 text-teal-600" />
                                    Phát âm pinyin
                                </h3>
                                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm font-black leading-relaxed tracking-wide text-slate-800 shadow-inner">
                                    {quickPinyin || tokenPinyin(tokens) || 'Chưa có pinyin cho đoạn này.'}
                                </div>
                                {sourceSentence && <p className="text-[10px] font-medium italic text-slate-400">Ngữ cảnh: {sourceSentence}</p>}
                            </div>
                        )}

                        {activeTab === 'ai' && (
                            <div className="space-y-3">
                                <h3 className="flex items-center gap-1 text-[11px] font-black uppercase tracking-widest text-slate-400">
                                    <Brain className="h-3.5 w-3.5 text-teal-600" />
                                    Phân tích ngữ pháp AI
                                </h3>
                                <div className="rounded-2xl border border-teal-100 bg-gradient-to-br from-white to-slate-50/70 p-4 shadow-sm">
                                    <div className="space-y-3 text-xs font-semibold leading-relaxed text-slate-700">
                                        {analysis?.translations?.natural_vi && <p><span className="font-black text-teal-700">Dịch tự nhiên:</span> {analysis.translations.natural_vi}</p>}
                                        {analysis?.translations?.literal_vi && <p><span className="font-black text-teal-700">Sát nghĩa:</span> {analysis.translations.literal_vi}</p>}
                                        {roleExplanation && <p>{roleExplanation}</p>}
                                        {grammarPatterns.length > 0 ? (
                                            <div className="space-y-2">
                                                {grammarPatterns.map((pattern, index) => (
                                                    <div key={`${pattern.pattern}-${index}`} className="rounded-xl border border-slate-100 bg-white p-3">
                                                        <p className="font-black text-slate-900">{pattern.pattern}</p>
                                                        <p className="mt-1 text-slate-600">{pattern.meaning_vi}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p>Chưa nhận diện được mẫu ngữ pháp nổi bật trong đoạn chọn.</p>
                                        )}
                                        {aiContext?.response?.context_explanation_vi && (
                                            <div className="rounded-xl border border-amber-100 bg-amber-50/70 p-3 text-amber-900">
                                                {aiContext.response.context_explanation_vi}
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-4 grid grid-cols-2 gap-2">
                                        <button
                                            onClick={onGenerateAiNote}
                                            disabled={generatingAI}
                                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-3 py-2 text-[11px] font-black text-white transition hover:bg-teal-700 disabled:opacity-60"
                                        >
                                            {generatingAI ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                                            AI Context
                                        </button>
                                        <button
                                            onClick={onSave}
                                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-teal-600 px-3 py-2 text-[11px] font-black text-teal-700 transition hover:bg-teal-50"
                                        >
                                            <BookmarkPlus className="h-3.5 w-3.5" />
                                            Lưu cấu trúc
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'quiz' && (
                            <QuizPanel
                                quizQuestions={quizQuestions}
                                quizLoading={quizLoading}
                                quizScore={quizScore}
                                quizFinished={quizFinished}
                                currentQuestionIndex={currentQuestionIndex}
                                selectedAnswerIndex={selectedAnswerIndex}
                                onGenerateQuiz={onGenerateQuiz}
                                onQuizAnswer={onQuizAnswer}
                            />
                        )}
                    </div>
                )}
            </div>

            {historyList.length > 0 && selectedSurface && (
                <div className="shrink-0 border-t border-slate-100 bg-slate-50/60 p-3">
                    <span className="mb-2 flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-slate-400">
                        <History className="h-3 w-3 text-teal-600" />
                        Vừa phân tích
                    </span>
                    <div className="flex max-h-16 flex-wrap gap-1.5 overflow-y-auto">
                        {historyList.slice(0, 6).map((item) => (
                            <button
                                key={item}
                                onClick={() => onSelectHistory(item)}
                                className="max-w-[140px] truncate rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 transition hover:border-teal-300 hover:bg-teal-50"
                            >
                                {item}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </aside>
    )
}

function ChatPanel({
    chatMessages,
    chatLoading,
    chatInput,
    onChatInputChange,
    onChatSubmit,
}: {
    chatMessages: ChatMessage[]
    chatLoading: boolean
    chatInput: string
    onChatInputChange: (value: string) => void
    onChatSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
    return (
        <div className="flex h-full min-h-[320px] flex-col">
            <div className="mb-4 flex-1 space-y-3 overflow-y-auto pr-1">
                {chatMessages.length === 0 && (
                    <div className="rounded-2xl border border-slate-100 bg-white p-5 text-center">
                        <MessageSquare className="mx-auto h-6 w-6 text-teal-600" />
                        <p className="mt-2 text-xs font-semibold text-slate-500">Hỏi thêm về văn bản, sắc thái nghĩa hoặc cách dùng từ đang chọn.</p>
                    </div>
                )}
                {chatMessages.map((message) => {
                    const isUser = message.role === 'user'
                    return (
                        <div key={message.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                            <div className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed shadow-sm ${isUser ? 'rounded-tr-none bg-teal-600 text-white' : 'rounded-tl-none border border-slate-100 bg-white text-slate-700'}`}>
                                <p className="whitespace-pre-wrap">{message.content}</p>
                            </div>
                            <span className="mt-1 px-1 text-[9px] text-slate-400">{message.timestamp}</span>
                        </div>
                    )
                })}
                {chatLoading && (
                    <div className="flex items-center gap-2 p-1 text-xs text-slate-400">
                        <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
                        <span>Hanora AI đang soạn câu trả lời...</span>
                    </div>
                )}
            </div>
            <form onSubmit={onChatSubmit} className="relative flex items-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <input
                    value={chatInput}
                    onChange={(event) => onChatInputChange(event.target.value)}
                    placeholder="Hỏi về văn bản này..."
                    className="w-full bg-transparent py-3 pl-4 pr-12 text-sm outline-none"
                />
                <button
                    type="submit"
                    disabled={chatLoading || !chatInput.trim()}
                    className="absolute right-2 rounded-xl bg-teal-600 p-2 text-white transition hover:bg-teal-700 disabled:opacity-50"
                >
                    <Send className="h-4 w-4" />
                </button>
            </form>
        </div>
    )
}

function FloatingChatWidget({
    open,
    onOpenChange,
    selectedSurface,
    chatMessages,
    chatLoading,
    chatInput,
    onChatInputChange,
    onChatSubmit,
}: {
    open: boolean
    onOpenChange: (value: boolean) => void
    selectedSurface: string
    chatMessages: ChatMessage[]
    chatLoading: boolean
    chatInput: string
    onChatInputChange: (value: string) => void
    onChatSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
    if (!open) {
        return (
            <button
                onClick={() => onOpenChange(true)}
                className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-teal-200/70 bg-white text-teal-700 shadow-2xl shadow-teal-500/20 transition hover:scale-105 hover:bg-teal-50"
                title="Mở chat AI"
            >
                <MessageSquare className="h-6 w-6" />
                {chatLoading && <span className="absolute right-0 top-0 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-white" />}
            </button>
        )
    }

    return (
        <div className="fixed bottom-6 right-6 z-50 flex h-[min(620px,calc(100vh-120px))] w-[min(440px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border border-teal-100 bg-white shadow-2xl shadow-slate-900/20">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-teal-100 bg-teal-50/80 px-4 py-3">
                <div className="min-w-0">
                    <h3 className="text-sm font-black text-slate-900">Hanora AI Chat</h3>
                    <p className="truncate text-[10px] font-semibold text-teal-700">
                        {selectedSurface ? `Đang hỏi theo: ${selectedSurface}` : 'Hỏi theo tài liệu hiện tại'}
                    </p>
                </div>
                <button
                    onClick={() => onOpenChange(false)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm transition hover:text-slate-800"
                    title="Đóng chat"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
            <div className="min-h-0 flex-1 p-4">
                <ChatPanel
                    chatMessages={chatMessages}
                    chatLoading={chatLoading}
                    chatInput={chatInput}
                    onChatInputChange={onChatInputChange}
                    onChatSubmit={onChatSubmit}
                />
            </div>
        </div>
    )
}

function ReaderInfoBlock({
    label,
    value,
    highlight,
    emptyText,
}: {
    label: string
    value?: string
    highlight?: boolean
    emptyText?: string
}) {
    const hasValue = Boolean(value?.trim())
    return (
        <div className={`rounded-xl border p-3 ${highlight ? 'border-teal-100 bg-teal-50/60' : 'border-slate-100 bg-white'}`}>
            <p className={`mb-1 text-[9px] font-black uppercase tracking-widest ${highlight ? 'text-teal-700' : 'text-slate-400'}`}>{label}</p>
            <p className={`whitespace-pre-wrap text-xs font-semibold leading-relaxed ${hasValue ? 'text-slate-700' : 'text-slate-400'}`}>
                {hasValue ? value : emptyText || 'Chưa có dữ liệu.'}
            </p>
        </div>
    )
}

function QuizPanel({
    quizQuestions,
    quizLoading,
    quizScore,
    quizFinished,
    currentQuestionIndex,
    selectedAnswerIndex,
    onGenerateQuiz,
    onQuizAnswer,
}: {
    quizQuestions: QuizQuestion[]
    quizLoading: boolean
    quizScore: number
    quizFinished: boolean
    currentQuestionIndex: number
    selectedAnswerIndex: number | null
    onGenerateQuiz: () => void
    onQuizAnswer: (index: number) => void
}) {
    if (quizQuestions.length === 0) {
        return (
            <div className="rounded-2xl border border-slate-100 bg-white p-6 text-center shadow-sm">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-teal-700">
                    <Award className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-sm font-black text-slate-800">Tạo trắc nghiệm thông minh</h3>
                <p className="mt-1 text-xs font-medium text-slate-500">Quét bài hiện tại để tạo câu hỏi nghĩa, pinyin và ngữ cảnh.</p>
                <button
                    onClick={onGenerateQuiz}
                    disabled={quizLoading}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 py-2.5 text-xs font-black text-white transition hover:bg-teal-700 disabled:opacity-60"
                >
                    {quizLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Bắt đầu tạo câu hỏi
                </button>
            </div>
        )
    }

    if (quizFinished) {
        return (
            <div className="rounded-2xl border border-slate-100 bg-white p-6 text-center shadow-sm">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-xl font-black text-amber-600 shadow-inner">
                    {quizScore}
                </div>
                <h3 className="mt-4 text-base font-black text-slate-800">Hoàn thành thử thách</h3>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                    Kết quả: <span className="font-black text-teal-700">{quizScore} / {quizQuestions.length}</span> câu chính xác
                </p>
                <button onClick={onGenerateQuiz} className="mt-4 rounded-xl border border-teal-200 px-4 py-2 text-xs font-black text-teal-700 transition hover:bg-teal-50">
                    Tạo bộ mới
                </button>
            </div>
        )
    }

    const currentQuestion = quizQuestions[currentQuestionIndex]
    return (
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between border-b border-slate-50 pb-2">
                <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-black text-teal-700">
                    Câu {currentQuestionIndex + 1} / {quizQuestions.length}
                </span>
                <span className="text-[11px] font-semibold text-slate-400">Score: {quizScore}</span>
            </div>
            <h4 className="text-sm font-black leading-snug text-slate-800">{currentQuestion?.question}</h4>
            <div className="mt-4 space-y-2">
                {currentQuestion?.options.map((option, index) => (
                    <button
                        key={`${option}-${index}`}
                        onClick={() => onQuizAnswer(index)}
                        disabled={selectedAnswerIndex !== null}
                        className={`w-full rounded-xl border p-3 text-left text-xs font-semibold transition disabled:cursor-not-allowed ${
                            selectedAnswerIndex === null
                                ? 'border-slate-100 bg-slate-50 text-slate-700 hover:border-teal-200 hover:bg-teal-50'
                                : index === currentQuestion.answerIndex
                                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                                  : selectedAnswerIndex === index
                                    ? 'border-red-300 bg-red-50 text-red-700'
                                    : 'border-slate-100 bg-slate-50 text-slate-400'
                        }`}
                    >
                        {option}
                    </button>
                ))}
            </div>
            {selectedAnswerIndex !== null && currentQuestion?.explanation && (
                <p className="mt-4 rounded-xl bg-teal-50 p-3 text-[11px] font-semibold text-teal-800">{currentQuestion.explanation}</p>
            )}
        </div>
    )
}

function SavedHub({
    viewType,
    savedWords,
    annotations,
    flashCards,
    onRemoveWord,
    onRemoveAnnotation,
    onSubmitReview,
}: {
    viewType: 'library' | 'study-hub'
    savedWords: SavedWord[]
    annotations: AnnotationRecord[]
    flashCards: FlashCard[]
    onRemoveWord: (id: string) => void
    onRemoveAnnotation: (id: string) => void
    onSubmitReview: (id: string, rating: number) => void
}) {
    const [searchTerm, setSearchTerm] = useState('')
    const [activeTab, setActiveTab] = useState<'vocab' | 'grammar'>('vocab')
    const [flashcardIndex, setFlashcardIndex] = useState(0)
    const [isFlipped, setIsFlipped] = useState(false)

    const filteredWords = savedWords.filter((item) => {
        const term = searchTerm.toLowerCase()
        return item.word.includes(searchTerm) || item.pinyin?.toLowerCase().includes(term) || item.translation.toLowerCase().includes(term)
    })

    const grammarNotes = annotations.filter((annotation) => annotation.annotation_type !== 'word' || annotation.selected_text.length > 1)
    const filteredGrammars = grammarNotes.filter((item) => {
        const term = searchTerm.toLowerCase()
        return item.selected_text.toLowerCase().includes(term) || (item.explanation_vi || item.note || '').toLowerCase().includes(term)
    })

    const deck = flashCards.length
        ? flashCards
        : savedWords.map((word) => ({
              id: word.id,
              front: word.word,
              back: word.translation,
              example: word.context,
              difficulty: 'beginner' as const,
              reviewed: word.learned,
              createdAt: word.createdAt,
              pinyin: word.pinyin,
              hskLevel: word.hskLevel,
          }))
    const currentCard = deck[Math.min(flashcardIndex, Math.max(0, deck.length - 1))]
    const canSubmitReview = flashCards.length > 0 && Boolean(currentCard)

    if (viewType === 'study-hub') {
        return (
            <div className="min-h-full w-full overflow-y-auto bg-slate-50/60 px-6 py-8">
                <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
                    <div>
                        <h1 className="flex items-center gap-2 text-2xl font-black text-teal-900">
                            <Layers className="h-6 w-6 text-teal-600" />
                            Trạm Ôn Luyện
                        </h1>
                        <p className="mt-1 text-sm font-medium text-slate-500">Ôn lại flashcards được tạo từ annotation, lookup và quét từ trong Reader.</p>
                    </div>

                    {currentCard ? (
                        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
                            <div className="rounded-3xl border border-teal-100/60 bg-white/80 p-6 shadow-sm lg:col-span-7">
                                <div className="mb-6 flex items-center justify-between">
                                    <h2 className="flex items-center gap-1.5 text-sm font-black text-slate-800">
                                        <BookMarked className="h-4 w-4 text-teal-600" />
                                        Flashcards ({deck.length})
                                    </h2>
                                    <span className="rounded-full border border-teal-200/60 bg-teal-50 px-2.5 py-1 text-xs font-black text-teal-700">
                                        Thẻ {Math.min(flashcardIndex + 1, deck.length)}/{deck.length}
                                    </span>
                                </div>

                                <button
                                    onClick={() => setIsFlipped((value) => !value)}
                                    className="flex h-[260px] w-full max-w-[440px] flex-col items-center justify-between rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-600 to-emerald-700 p-6 text-white shadow-md transition hover:scale-[1.01]"
                                >
                                    <span className="w-full text-right font-mono text-xs font-black uppercase tracking-wider text-teal-100">
                                        {isFlipped ? 'Click để úp lại' : 'Click để lật'}
                                    </span>
                                    <div className="text-center">
                                        <span className="break-words text-5xl font-black tracking-wide">{isFlipped ? currentCard.back : currentCard.front}</span>
                                        <p className="mt-3 text-sm font-semibold text-teal-100">{isFlipped ? currentCard.example || currentCard.pinyin : currentCard.pinyin}</p>
                                    </div>
                                    <span className="text-xs font-semibold text-white/80">{isFlipped ? currentCard.front : 'Nhớ nghĩa trước khi lật'}</span>
                                </button>

                                <div className="mt-8 grid w-full max-w-[440px] grid-cols-2 gap-4">
                                    <button
                                        onClick={() => {
                                            setIsFlipped(false)
                                            setFlashcardIndex((index) => (index > 0 ? index - 1 : deck.length - 1))
                                        }}
                                        className="rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-black text-slate-700 transition hover:bg-slate-100"
                                    >
                                        Thẻ trước
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsFlipped(false)
                                            setFlashcardIndex((index) => (index + 1) % deck.length)
                                        }}
                                        className="rounded-xl bg-teal-600 py-2.5 text-xs font-black text-white transition hover:bg-teal-700"
                                    >
                                        Thẻ sau
                                    </button>
                                </div>
                            </div>

                            <div className="rounded-3xl border border-teal-100/60 bg-white/80 p-6 shadow-sm lg:col-span-5">
                                <h3 className="flex items-center gap-2 text-sm font-black text-slate-800">
                                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                                    Chấm ôn tập
                                </h3>
                                <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500">
                                    Khi thẻ có review item từ backend, nút dưới sẽ cập nhật lịch SRS. Với thẻ chỉ đến từ lookup local, hãy tạo flashcard từ Reader để có lịch ôn.
                                </p>
                                <div className="mt-5 grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => currentCard && onSubmitReview(currentCard.id, 2)}
                                        disabled={!canSubmitReview}
                                        className="rounded-xl border border-amber-200 bg-amber-50 py-2.5 text-xs font-black text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        Cần ôn lại
                                    </button>
                                    <button
                                        onClick={() => currentCard && onSubmitReview(currentCard.id, 4)}
                                        disabled={!canSubmitReview}
                                        className="rounded-xl border border-emerald-200 bg-emerald-50 py-2.5 text-xs font-black text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        Đã nhớ
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-3xl border border-teal-100 bg-white/70 px-6 py-24 text-center">
                            <BookMarked className="mx-auto h-10 w-10 text-teal-600" />
                            <h3 className="mt-3 text-sm font-black text-slate-800">Chưa có flashcard</h3>
                            <p className="mt-1 text-xs font-medium text-slate-500">Quay lại Documents, chọn từ/câu và lưu vào học phần.</p>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-full w-full overflow-y-auto bg-slate-50/60 px-6 py-8">
            <div className="mx-auto w-full max-w-5xl">
                <div className="mb-6 flex flex-col justify-between gap-4 border-b border-teal-100/40 pb-6 md:flex-row md:items-center">
                    <div>
                        <h1 className="flex items-center gap-2 text-2xl font-black text-teal-900">
                            <BookOpen className="h-6 w-6 text-teal-600" />
                            Thư viện của tôi
                        </h1>
                        <p className="mt-1 text-sm font-medium text-slate-500">Quản lý từ vựng và annotation đã lưu từ Reader.</p>
                    </div>
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="Tìm kiếm từ hoặc cấu trúc..."
                            className="w-full rounded-xl border border-teal-200/60 bg-white/80 py-2 pl-9 pr-4 text-xs font-semibold outline-none transition focus:border-teal-500"
                        />
                    </div>
                </div>

                <div className="mb-6 flex gap-2">
                    <button
                        onClick={() => setActiveTab('vocab')}
                        className={`rounded-xl px-4 py-2 text-xs font-black transition ${activeTab === 'vocab' ? 'bg-teal-600 text-white shadow-sm' : 'bg-teal-50 text-teal-800 hover:bg-teal-100'}`}
                    >
                        Từ vựng ({savedWords.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('grammar')}
                        className={`rounded-xl px-4 py-2 text-xs font-black transition ${activeTab === 'grammar' ? 'bg-teal-600 text-white shadow-sm' : 'bg-teal-50 text-teal-800 hover:bg-teal-100'}`}
                    >
                        Annotation ({grammarNotes.length})
                    </button>
                </div>

                {activeTab === 'vocab' ? (
                    filteredWords.length ? (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {filteredWords.map((word) => (
                                <div key={word.id} className="group rounded-2xl border border-teal-100/60 bg-white/85 p-4 shadow-sm transition hover:shadow-md">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <div className="shrink-0 rounded-xl border border-teal-100 bg-teal-50 px-2.5 py-1 text-lg font-black text-teal-700">
                                                {word.word}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-slate-700">{word.pinyin || 'pinyin'}</p>
                                                {word.hskLevel && (
                                                    <span className="mt-1 inline-block rounded-full border border-sky-100 bg-sky-50 px-2 py-0.5 text-[9px] font-black text-sky-800">
                                                        HSK {word.hskLevel}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => onRemoveWord(word.id)}
                                            className="rounded-full bg-slate-50 p-1.5 text-slate-400 opacity-0 transition hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100"
                                            title="Xóa khỏi thư viện"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                    <div className="mt-4 border-t border-slate-100 pt-3">
                                        <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400">Định nghĩa</h4>
                                        <p className="mt-1 text-xs font-semibold text-slate-700">{word.translation}</p>
                                    </div>
                                    {word.context && (
                                        <div className="mt-3 rounded-xl border border-teal-100/40 bg-teal-50/30 p-2 text-[11px] text-slate-600">
                                            <span className="font-black text-teal-800">Ví dụ:</span> {word.context}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-3xl border border-teal-100 bg-white/60 px-6 py-24 text-center">
                            <BookOpen className="mx-auto h-10 w-10 text-teal-600" />
                            <h3 className="mt-3 text-sm font-black text-slate-800">Chưa có từ vựng phù hợp</h3>
                            <p className="mt-1 text-xs font-medium text-slate-500">Chọn từ trong Documents và lưu vào học phần.</p>
                        </div>
                    )
                ) : filteredGrammars.length ? (
                    <div className="space-y-4">
                        {filteredGrammars.map((grammar) => (
                            <div key={grammar.id} className="group rounded-2xl border border-teal-100 bg-white/85 p-5 shadow-sm">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h3 className="text-[15px] font-black text-teal-900">{grammar.selected_text}</h3>
                                        {grammar.pinyin && <p className="mt-0.5 text-xs font-semibold italic text-slate-500">{grammar.pinyin}</p>}
                                    </div>
                                    <button
                                        onClick={() => onRemoveAnnotation(grammar.id)}
                                        className="rounded-full bg-slate-50 p-1.5 text-slate-400 opacity-0 transition hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                                <div className="mt-3 whitespace-pre-line text-xs font-semibold leading-relaxed text-slate-700">
                                    {grammar.explanation_vi || grammar.note || 'Annotation đã lưu.'}
                                </div>
                                {grammar.source_sentence && (
                                    <div className="mt-4 rounded-xl border-l-2 border-l-teal-500 bg-teal-50/30 p-2 text-[11px] text-teal-900">
                                        <span className="font-black">Mẫu trong bài:</span> {grammar.source_sentence}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="rounded-3xl border border-teal-100 bg-white/60 px-6 py-24 text-center">
                        <Brain className="mx-auto h-10 w-10 text-teal-600" />
                        <h3 className="mt-3 text-sm font-black text-slate-800">Chưa có annotation phù hợp</h3>
                        <p className="mt-1 text-xs font-medium text-slate-500">Lưu một cụm/câu trong tab AI để xem tại đây.</p>
                    </div>
                )}
            </div>
        </div>
    )
}

function PasteDocumentModal({
    isOpen,
    onClose,
    onSubmit,
}: {
    isOpen: boolean
    onClose: () => void
    onSubmit: (title: string, hskLevel: string, content: string) => void
}) {
    const [title, setTitle] = useState('')
    const [hskLevel, setHskLevel] = useState('HSK 1')
    const [content, setContent] = useState('')

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="flex items-center gap-1.5 text-sm font-black text-slate-800">
                        <FilePlus2 className="h-5 w-5 text-teal-600" />
                        Dán tài liệu của riêng bạn
                    </h3>
                    <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <form
                    onSubmit={(event) => {
                        event.preventDefault()
                        if (!title.trim() || !content.trim()) return
                        onSubmit(title.trim(), hskLevel, content.trim())
                        setTitle('')
                        setHskLevel('HSK 1')
                        setContent('')
                    }}
                    className="mt-4 space-y-4"
                >
                    <div>
                        <label className="mb-1 block text-[10px] font-black uppercase text-slate-400">Tiêu đề tài liệu</label>
                        <input
                            required
                            value={title}
                            onChange={(event) => setTitle(event.target.value)}
                            placeholder="Ví dụ: HSK 1 - Đàm thoại thường ngày"
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold outline-none focus:border-teal-500"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-[10px] font-black uppercase text-slate-400">Cấp độ</label>
                        <select
                            value={hskLevel}
                            onChange={(event) => setHskLevel(event.target.value)}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold outline-none focus:border-teal-500"
                        >
                            {['HSK 1', 'HSK 2', 'HSK 3', 'HSK 4', 'HSK 5', 'HSK 6', 'HSK 7-9'].map((level) => (
                                <option key={level} value={level}>{level}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="mb-1 block text-[10px] font-black uppercase text-slate-400">Nội dung chữ Hán</label>
                        <textarea
                            required
                            rows={7}
                            value={content}
                            onChange={(event) => setContent(event.target.value)}
                            placeholder="Dán hoặc gõ chữ Hán giản thể vào đây..."
                            className="w-full rounded-2xl border border-slate-200 p-3 text-xs font-semibold outline-none placeholder:text-slate-300 focus:border-teal-500"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 py-2.5 text-xs font-black text-slate-600 transition hover:bg-slate-50">
                            Hủy bỏ
                        </button>
                        <button type="submit" className="rounded-xl bg-teal-600 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-teal-700">
                            Nạp tài liệu
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
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
