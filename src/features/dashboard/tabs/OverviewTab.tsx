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

export function OverviewTab({
    stats,
    documents,
    savedWords,
    learningProgress,
    onOpenFiles,
    onUploadClick,
    onOpenVocabulary,
    onOpenFlashcards,
}: {
    stats: { totalFiles: number; savedWords: number; dueReviews: number; totalTranslations: number }
    documents: DocumentContent[]
    savedWords: SavedWord[]
    learningProgress: LearningProgress
    onOpenFiles: () => void
    onUploadClick: () => void
    onOpenVocabulary: () => void
    onOpenFlashcards: () => void
}) {
    const progress = learningProgress.dailyGoal > 0 ? Math.min(100, Math.round((learningProgress.todayProgress / learningProgress.dailyGoal) * 100)) : 0
    const recentDocuments = documents.slice(0, 3)

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col justify-between gap-5 rounded-2xl border border-teal-100 bg-white p-6 custom-shadow dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center">
                <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-teal-200 bg-teal-100 dark:border-teal-800 dark:bg-teal-950">
                        <User className="h-8 w-8 text-teal-600 dark:text-teal-300" />
                    </div>
                    <div>
                        <h1 className="mb-1 text-2xl font-black text-slate-900 dark:text-slate-100">Chào mừng quay lại</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Theo dõi tài liệu, từ vựng và lịch ôn tập trong một màn hình.</p>
                    </div>
                </div>
                <button
                    onClick={onUploadClick}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-teal-700"
                >
                    <Upload className="h-4 w-4" />
                    Tải tài liệu
                </button>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Tổng số tệp" value={String(stats.totalFiles)} icon={FileText} color="bg-teal-50 border-teal-100 text-teal-600" />
                <StatCard title="Từ đã lưu" value={String(stats.savedWords)} icon={BookMarked} color="bg-cyan-50 border-cyan-100 text-cyan-600" />
                <StatCard title="Cần ôn hôm nay" value={String(stats.dueReviews)} icon={Layers} color="bg-emerald-50 border-emerald-100 text-emerald-600" alert={stats.dueReviews > 0} />
                <StatCard title="Lượt dịch" value={String(stats.totalTranslations)} icon={Languages} color="bg-indigo-50 border-indigo-100 text-indigo-600" />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 flex flex-col gap-6">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <button
                            onClick={onOpenFlashcards}
                            className="group flex items-center gap-4 rounded-2xl border border-teal-100 bg-white p-6 text-left custom-shadow transition-colors hover:border-teal-300 dark:border-slate-800 dark:bg-slate-900"
                        >
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-orange-100 bg-orange-50 transition-transform group-hover:scale-105">
                                <Trophy className="h-7 w-7 text-orange-500" />
                            </div>
                            <div>
                                <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Chuỗi học tập</p>
                                <h4 className="text-3xl font-black text-slate-800 dark:text-slate-100">{learningProgress.streak || 0} <span className="text-lg font-medium text-slate-500">ngày</span></h4>
                            </div>
                        </button>

                        <button
                            onClick={onOpenVocabulary}
                            className="group flex items-center gap-4 rounded-2xl border border-teal-100 bg-white p-6 text-left custom-shadow transition-colors hover:border-teal-300 dark:border-slate-800 dark:bg-slate-900"
                        >
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 transition-transform group-hover:scale-105">
                                <Target className="h-7 w-7 text-emerald-500" />
                            </div>
                            <div>
                                <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Mục tiêu ngày</p>
                                <h4 className="text-3xl font-black text-slate-800 dark:text-slate-100">
                                    {learningProgress.todayProgress || 0}/{learningProgress.dailyGoal || 10}
                                    <span className="text-lg font-medium text-slate-500"> từ</span>
                                </h4>
                            </div>
                        </button>
                    </div>

                    <div className="rounded-2xl border border-teal-100 bg-white p-6 custom-shadow dark:border-slate-800 dark:bg-slate-900">
                        <div className="mb-6 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Hoạt động gần đây</h3>
                            <button onClick={onOpenFiles} className="text-sm font-bold text-teal-600 transition-colors hover:text-teal-700">
                                Xem tất cả
                            </button>
                        </div>
                        <div className="ml-2 flex flex-col gap-4 border-l-2 border-teal-100 py-2 pl-6 dark:border-slate-800">
                            {recentDocuments.length ? (
                                recentDocuments.map((document, index) => (
                                    <div key={document.id} className="relative rounded-xl p-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60">
                                        <div className={`absolute -left-[35px] top-4 h-3.5 w-3.5 rounded-full ring-4 ring-white dark:ring-slate-900 ${index === 0 ? 'bg-teal-500' : 'bg-teal-300'}`} />
                                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Tải lên tài liệu: {document.title}</h4>
                                        <p className="mt-1 text-xs font-medium text-slate-500">{formatDate(document.uploadedAt)} • {document.sentences.length || 0} câu đọc</p>
                                    </div>
                                ))
                            ) : (
                                <div className="relative rounded-xl p-2">
                                    <div className="absolute -left-[35px] top-4 h-3.5 w-3.5 rounded-full bg-slate-300 ring-4 ring-white dark:ring-slate-900" />
                                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Chưa có tài liệu nào</h4>
                                    <p className="mt-1 text-xs font-medium text-slate-500">Tải file đầu tiên để bắt đầu đọc và dịch theo ngữ cảnh.</p>
                                </div>
                            )}
                            <div className="relative rounded-xl p-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60">
                                <div className="absolute -left-[35px] top-4 h-3.5 w-3.5 rounded-full bg-cyan-300 ring-4 ring-white dark:ring-slate-900" />
                                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Lưu {savedWords.length} từ vựng</h4>
                                <p className="mt-1 text-xs font-medium text-slate-500">Nguồn từ reader và tra cứu ngữ cảnh.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-6">
                    <div className="rounded-2xl border border-teal-100 bg-white p-6 custom-shadow dark:border-slate-800 dark:bg-slate-900">
                        <h3 className="mb-6 text-lg font-bold text-slate-800 dark:text-slate-100">Tổng quan thành tích</h3>
                        <div className="space-y-5">
                            <AchievementRow icon={BookMarked} label="Từ vựng đã học" value={String(learningProgress.wordsLearned || 0)} color="bg-blue-50 text-blue-600 border-blue-100" />
                            <AchievementRow icon={Calendar} label="Tiến độ hôm nay" value={`${progress}%`} color="bg-purple-50 text-purple-600 border-purple-100" />
                            <AchievementRow icon={FileText} label="Tài liệu đã dịch" value={String(documents.length)} color="bg-cyan-50 text-cyan-600 border-cyan-100" />
                        </div>
                    </div>

                    <div className="relative flex min-h-[200px] flex-1 flex-col justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 p-6 text-white custom-shadow">
                        <Activity className="absolute right-4 top-4 h-28 w-28 text-white/10" />
                        <div className="relative z-10">
                            <div className="mb-2 flex items-center justify-between">
                                <h3 className="text-xl font-bold">Trợ giảng trực tuyến</h3>
                                <span className="relative flex h-3 w-3">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
                                    <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-300" />
                                </span>
                            </div>
                            <p className="mb-6 max-w-[220px] text-sm leading-relaxed text-teal-50/90">Mở reader để phân tích câu, lưu từ và tạo nội dung ôn tập.</p>
                            <button
                                onClick={onOpenFiles}
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3.5 font-bold text-teal-700 transition-colors hover:bg-slate-50"
                            >
                                <BookOpen className="h-5 w-5" />
                                Mở tài liệu
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
