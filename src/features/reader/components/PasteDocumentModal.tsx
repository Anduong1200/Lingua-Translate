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

export function PasteDocumentModal({
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

