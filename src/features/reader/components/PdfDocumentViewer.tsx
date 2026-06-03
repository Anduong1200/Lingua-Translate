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
import { type ChatMessage, findSentenceForSelection, formatAiChatReply, isSelectableToken, messageTime, type PdfSelection, type QuizQuestion, speakChinese } from '../readerUtils'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

import { ReaderView, SidebarTab, TranslateScope, TextSelection, FloatingCoords, BackendTranslationUnit, ContextTranslationResult, BackendQuizResponse, readStoredHistory, cleanDictionaryText, tokenVietnamese, tokenEnglish, tokenPinyin, knownSentenceTranslation, isMissingTranslation, sentenceFallbackTranslation, splitDocumentParagraphs, findParagraphForSelection, groupSentencesByParagraph, bestSentenceTranslation, buildContextualToken, splitFallbackSentences, safeBbox } from './readerShared'

export function PdfDocumentViewer({
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

