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

export const SentenceLine = memo(function SentenceLine({
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

