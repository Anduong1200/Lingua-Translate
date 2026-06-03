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

export function FlashcardsTab({
    cards,
    onSpeak,
    onSubmitReview,
    onRemoveWord,
}: {
    cards: DashboardFlashCard[]
    onSpeak: (text: string) => void
    onSubmitReview: (id: string, rating: number) => void
    onRemoveWord: (id: string) => void
}) {
    const [selectedSource, setSelectedSource] = useState<string | null>(null)
    const [index, setIndex] = useState(0)
    const [flipped, setFlipped] = useState(false)

    const grouped = useMemo(
        () =>
            cards.reduce<Record<string, DashboardFlashCard[]>>((acc, card) => {
                acc[card.source] = acc[card.source] || []
                acc[card.source].push(card)
                return acc
            }, {}),
        [cards],
    )
    const sources = Object.keys(grouped)
    const activeSource = selectedSource && grouped[selectedSource] ? selectedSource : sources[0]
    const activeCards = activeSource ? grouped[activeSource] : []
    const card = activeCards.length ? activeCards[index % activeCards.length] : null

    const goToCard = (nextIndex: number) => {
        if (!activeCards.length) return
        setIndex((nextIndex + activeCards.length) % activeCards.length)
        setFlipped(false)
    }

    const chooseSource = (source: string) => {
        setSelectedSource(source)
        setIndex(0)
        setFlipped(false)
    }

    const review = (rating: number) => {
        if (card?.reviewId) onSubmitReview(card.reviewId, rating)
        goToCard(index + 1)
    }

    if (!cards.length) {
        return <EmptyState icon={Layers} title="Chưa có flashcard" description="Lưu từ hoặc tạo mục ôn tập từ reader để bắt đầu luyện flashcard." />
    }

    return (
        <>
            <div className="rounded-2xl border border-teal-100 bg-white p-6 custom-shadow dark:border-slate-800 dark:bg-slate-900">
                <h1 className="mb-1 text-2xl font-black text-slate-900 dark:text-slate-100">Flashcards</h1>
                <p className="text-sm text-slate-500">Ôn tập theo từng nguồn tài liệu giống prototype dashboard.</p>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
                <div className="rounded-2xl border border-teal-100 bg-white p-5 custom-shadow dark:border-slate-800 dark:bg-slate-900">
                    <h3 className="mb-4 text-xs font-black uppercase tracking-[0.16em] text-slate-400">Nguồn flashcard</h3>
                    <div className="space-y-3">
                        {sources.map((source) => (
                            <button
                                key={source}
                                onClick={() => chooseSource(source)}
                                className={`w-full rounded-xl border p-4 text-left transition-colors ${
                                    activeSource === source
                                        ? 'border-teal-300 bg-teal-50 text-teal-800 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-200'
                                        : 'border-slate-100 bg-white text-slate-700 hover:border-teal-200 hover:bg-teal-50/40 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300'
                                }`}
                            >
                                <p className="line-clamp-2 text-sm font-black">{source}</p>
                                <p className="mt-1 text-xs font-medium text-slate-500">{grouped[source].length} thẻ</p>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="rounded-2xl border border-teal-100 bg-white p-6 custom-shadow dark:border-slate-800 dark:bg-slate-900">
                    {card && (
                        <div className="flex min-h-[520px] flex-col">
                            <div className="mb-5 flex items-center justify-between gap-3">
                                <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-teal-700 dark:bg-teal-950 dark:text-teal-300">
                                    Thẻ {index + 1}/{activeCards.length}
                                </span>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => onSpeak(card.front)} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
                                        <Volume2 className="h-5 w-5" />
                                    </button>
                                    {card.savedWordId && (
                                        <button onClick={() => onRemoveWord(card.savedWordId!)} className="rounded-xl border border-red-100 bg-red-50 p-2 text-red-600 hover:bg-red-100">
                                            <Trash2 className="h-5 w-5" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={() => setFlipped((value) => !value)}
                                className="flex flex-1 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-teal-200 bg-gradient-to-br from-teal-50 to-cyan-50 p-8 text-center transition-colors hover:border-teal-400 dark:border-slate-700 dark:from-slate-950 dark:to-slate-900"
                            >
                                {!flipped ? (
                                    <>
                                        <p className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-slate-400">Mặt trước</p>
                                        <h2 className="mb-4 text-6xl font-black text-slate-900 dark:text-slate-100">{card.front}</h2>
                                        {card.pinyin && <p className="rounded-xl border border-teal-100 bg-white px-4 py-2 font-mono text-lg font-bold text-teal-700 dark:border-teal-900 dark:bg-slate-950 dark:text-teal-300">/{card.pinyin}/</p>}
                                        <p className="mt-8 text-sm font-bold text-slate-400">Nhấn vào thẻ để lật</p>
                                    </>
                                ) : (
                                    <>
                                        <p className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-slate-400">Mặt sau</p>
                                        <h2 className="mb-4 max-w-xl text-3xl font-black leading-tight text-teal-700 dark:text-teal-300">{card.back}</h2>
                                        {card.example && (
                                            <p className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-7 text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                                                {card.example}
                                            </p>
                                        )}
                                    </>
                                )}
                            </button>

                            <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950 sm:flex-row sm:items-center sm:justify-between">
                                <button onClick={() => goToCard(index - 1)} className="rounded-xl px-5 py-3 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800">
                                    Thẻ trước
                                </button>
                                <div className="flex justify-center gap-2">
                                    <button onClick={() => review(2)} className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-black text-rose-600 hover:bg-rose-100">Khó</button>
                                    <button onClick={() => review(3)} className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-black text-amber-700 hover:bg-amber-100">Ổn</button>
                                    <button onClick={() => review(4)} className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700 hover:bg-emerald-100">Nhớ</button>
                                </div>
                                <button onClick={() => goToCard(index + 1)} className="rounded-xl bg-teal-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-teal-700">
                                    Thẻ sau
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}
