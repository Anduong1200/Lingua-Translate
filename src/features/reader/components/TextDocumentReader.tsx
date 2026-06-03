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
import { EmptyReader } from './EmptyReader'
import { SentenceLine } from './SentenceLine'

export function TextDocumentReader({
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

