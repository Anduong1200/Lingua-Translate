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

export function QuizPanel({
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

