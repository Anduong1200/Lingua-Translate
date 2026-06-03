import { useState, useRef, useMemo, type ChangeEvent, type FormEvent } from 'react'
import {
    Activity, ArrowRightLeft, BookMarked, BookOpen, Calendar, CheckCircle2, ChevronRight, CreditCard,
    FilePlus2, FileText, Layers, Languages, LayoutDashboard, Loader2, Mic, MoreVertical, Search,
    Target, Trash2, Trophy, Upload, User, Volume2, X, type LucideIcon,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import type { DocumentContent, FlashCard, LearningProgress, SavedWord, TranslationResult } from '@/types'
import { StatCard, AchievementRow, EmptyState, PasteDocumentModal, PronunciationRecorder } from './components'
import { documentTypeLabel, typeBadgeClass, formatDate, resolveWordSource, speakChinese, scoreSample, type UploadingRow, type DashboardFlashCard, type PracticeSentence, type WordGroup, defaultPracticeSentences } from '../dashboardUtils'

export function TranslationTab({
    sourceText,
    sourceLang,
    result,
    isTranslating,
    setSourceText,
    setSourceLang,
    onTranslate,
}: {
    sourceText: string
    sourceLang: 'zh' | 'vi'
    result: TranslationResult | null
    isTranslating: boolean
    setSourceText: (value: string) => void
    setSourceLang: (value: 'zh' | 'vi') => void
    onTranslate: () => void
}) {
    const targetLang = sourceLang === 'zh' ? 'vi' : 'zh'

    return (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-2xl border border-teal-100 bg-white p-6 custom-shadow dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-5 flex items-center justify-between">
                    <div>
                        <h1 className="mb-1 text-2xl font-black text-slate-900 dark:text-slate-100">Dịch thuật</h1>
                        <p className="text-sm text-slate-500">Dịch nhanh câu hoặc đoạn văn ngắn.</p>
                    </div>
                    <button
                        onClick={() => setSourceLang(sourceLang === 'zh' ? 'vi' : 'zh')}
                        className="flex items-center gap-2 rounded-xl border border-teal-100 bg-teal-50 px-3 py-2 text-xs font-bold text-teal-700 hover:bg-teal-100 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-300"
                    >
                        <ArrowRightLeft className="h-4 w-4" />
                        {sourceLang.toUpperCase()} → {targetLang.toUpperCase()}
                    </button>
                </div>
                <textarea
                    value={sourceText}
                    onChange={(event) => setSourceText(event.target.value)}
                    rows={12}
                    placeholder={sourceLang === 'zh' ? 'Nhập tiếng Trung cần dịch...' : 'Nhập tiếng Việt cần dịch sang tiếng Trung...'}
                    className="mb-4 w-full resize-none rounded-2xl border border-teal-100 bg-slate-50/60 p-4 text-sm leading-7 text-slate-800 outline-none transition-colors focus:border-teal-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
                <button
                    onClick={onTranslate}
                    disabled={!sourceText.trim() || isTranslating}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 py-3.5 text-sm font-black text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                    {isTranslating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Languages className="h-5 w-5" />}
                    Dịch ngay
                </button>
            </div>

            <div className="rounded-2xl border border-teal-100 bg-white p-6 custom-shadow dark:border-slate-800 dark:bg-slate-900">
                <h2 className="mb-4 text-lg font-bold text-slate-800 dark:text-slate-100">Kết quả</h2>
                {result ? (
                    <div className="space-y-4">
                        <div className="rounded-2xl border border-teal-100 bg-teal-50/50 p-4 dark:border-teal-900 dark:bg-teal-950/20">
                            <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-teal-700 dark:text-teal-300">Bản dịch</p>
                            <p className="text-base font-bold leading-7 text-slate-900 dark:text-slate-100">{result.translatedText}</p>
                        </div>
                        {result.pronunciation && (
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                                <p className="mb-1 text-xs font-bold text-slate-400">Pinyin</p>
                                <p className="font-mono text-sm font-bold text-teal-700 dark:text-teal-300">{result.pronunciation}</p>
                            </div>
                        )}
                        {result.grammarExplanation && (
                            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                                <p className="mb-1 text-xs font-bold text-slate-400">Ngữ pháp / ngữ cảnh</p>
                                <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{result.grammarExplanation}</p>
                            </div>
                        )}
                        {result.usageExamples?.length ? (
                            <div className="space-y-2">
                                {result.usageExamples.slice(0, 2).map((example, index) => (
                                    <div key={`${example.original}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-950">
                                        <p className="font-bold text-slate-800 dark:text-slate-100">{example.original}</p>
                                        <p className="mt-1 text-slate-500">{example.translation}</p>
                                    </div>
                                ))}
                            </div>
                        ) : null}
                    </div>
                ) : (
                    <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-8 text-center dark:border-slate-800 dark:bg-slate-950/40">
                        <Languages className="mb-3 h-10 w-10 text-slate-300" />
                        <p className="font-bold text-slate-600 dark:text-slate-300">Kết quả dịch sẽ hiển thị tại đây.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
