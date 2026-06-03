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

export function ChatPanel({
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

export function FloatingChatWidget({
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

