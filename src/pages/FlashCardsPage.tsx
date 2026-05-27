import { useMemo, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, Layers, RotateCcw, Volume2, X, Award, HelpCircle } from 'lucide-react'
import { useStore } from '@/store/useStore'

function speak(text: string) {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-CN'
    speechSynthesis.speak(utterance)
}

export default function FlashCardsPage() {
    const { flashCards, reviewItems, submitReview } = useStore()
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isFlipped, setIsFlipped] = useState(false)

    const dueCards = useMemo(() => {
        const dueIds = new Set(reviewItems.filter((item) => new Date(item.due_at).getTime() <= Date.now()).map((item) => item.id))
        const filtered = flashCards.filter((card) => dueIds.has(card.id) || !card.reviewed)
        return filtered.length ? filtered : flashCards
    }, [flashCards, reviewItems])

    const currentCard = dueCards[currentIndex]
    const progress = dueCards.length ? ((currentIndex + 1) / dueCards.length) * 100 : 0

    const move = (direction: 1 | -1) => {
        setCurrentIndex((index) => Math.min(Math.max(index + direction, 0), Math.max(0, dueCards.length - 1)))
        setIsFlipped(false)
    }

    const grade = async (rating: number) => {
        if (!currentCard) return
        await submitReview(currentCard.id, rating)
        if (currentIndex < dueCards.length - 1) move(1)
        else setIsFlipped(false)
    }

    return (
        <div className="mx-auto flex min-h-full max-w-5xl flex-col gap-6 pb-8 transition-colors duration-300">
            {/* Page Header */}
            <section className="glass border border-white/60 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 p-6 custom-shadow rounded-3xl backdrop-blur-md">
                <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
                    <div className="flex items-start gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-600 text-white custom-shadow">
                            <Layers className="h-7 w-7" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">Hàng đợi ôn tập (Flashcards)</h1>
                            <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
                                Ôn tập ngắt quãng FSRS tự động dãn cách dựa trên mức độ thuộc của bạn.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            setCurrentIndex(0)
                            setIsFlipped(false)
                        }}
                        className="flex items-center gap-2 rounded-xl border border-teal-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-3 text-sm font-black text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-slate-800 shadow-sm"
                    >
                        <RotateCcw className="h-4 w-4" />
                        Làm lại phiên
                    </button>
                </div>
            </section>

            {/* Progress Bar Panel */}
            <section className="custom-shadow rounded-2xl border border-teal-100/40 dark:border-slate-850 bg-white dark:bg-slate-900/50 p-5 backdrop-blur-sm">
                <div className="mb-3 flex items-center justify-between text-sm font-bold text-slate-500 dark:text-slate-400">
                    <span>
                        Thẻ {dueCards.length ? currentIndex + 1 : 0} trên {dueCards.length}
                    </span>
                    <span className="font-black text-teal-650 dark:text-teal-400">{Math.round(progress)}% hoàn thành</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
            </section>

            {/* Flashcard Box */}
            {currentCard ? (
                <section
                    onClick={() => setIsFlipped((value) => !value)}
                    className="custom-shadow min-h-[420px] cursor-pointer overflow-hidden rounded-[2rem] border border-teal-100/40 dark:border-slate-800 bg-white dark:bg-slate-900/40 text-center transition-all duration-200 hover:scale-[1.005]"
                >
                    <div className="flex min-h-[420px] flex-col items-center justify-center bg-gradient-to-br from-white via-teal-50/20 to-cyan-55/20 dark:from-slate-900/60 dark:via-slate-900/30 dark:to-teal-950/20 p-8">
                        {!isFlipped ? (
                            /* Front Side */
                            <div className="space-y-6 flex flex-col items-center animate-fadeIn">
                                <span className="rounded-full bg-teal-100 dark:bg-teal-900/40 px-3 py-1 text-xs font-black uppercase tracking-wider text-teal-700 dark:text-teal-350 border border-teal-200/20">
                                    Mặt trước
                                </span>
                                <h2 className="chinese-text text-7xl font-black text-slate-900 dark:text-slate-105 md:text-8xl select-all">{currentCard.front}</h2>
                                {currentCard.pinyin && (
                                    <p className="rounded-xl border border-teal-100/60 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 font-mono text-lg font-bold text-teal-700 dark:text-teal-400 custom-shadow">
                                        /{currentCard.pinyin}/
                                    </p>
                                )}
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={(event) => {
                                            event.stopPropagation()
                                            speak(currentCard.front)
                                        }}
                                        className="rounded-full border border-teal-100/60 dark:border-slate-805 bg-white dark:bg-slate-900 p-3 text-teal-700 dark:text-teal-400 hover:bg-teal-55 dark:hover:bg-slate-800 transition-colors shadow-sm"
                                        title="Phát âm tiếng Trung"
                                    >
                                        <Volume2 className="h-5 w-5" />
                                    </button>
                                </div>
                                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                                    <HelpCircle className="h-3.5 w-3.5" />
                                    Click vào thẻ để lật xem nghĩa Việt và câu ví dụ
                                </p>
                            </div>
                        ) : (
                            /* Back Side */
                            <div className="space-y-6 flex flex-col items-center animate-fadeIn">
                                <span className="rounded-full bg-amber-100 dark:bg-amber-950/40 px-3 py-1 text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 border border-amber-200/20">
                                    Mặt sau
                                </span>
                                <h2 className="max-w-3xl text-3xl font-black text-slate-900 dark:text-slate-100 leading-relaxed">{currentCard.back}</h2>

                                {currentCard.example && (
                                    <div className="max-w-3xl rounded-2xl border border-slate-100 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-5 shadow-sm">
                                        <p className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">Văn cảnh nguyên gốc</p>
                                        <p className="chinese-text text-xl leading-loose text-slate-800 dark:text-slate-200">{currentCard.example}</p>
                                    </div>
                                )}

                                <div className="flex flex-wrap gap-2">
                                    {currentCard.hskLevel && (
                                        <span className="rounded-md bg-amber-100 dark:bg-amber-950/40 px-2.5 py-1 text-xs font-black text-amber-700 dark:text-amber-400 border border-amber-200/20 shadow-sm">
                                            HSK {currentCard.hskLevel}
                                        </span>
                                    )}
                                    <span className="rounded-md bg-cyan-50 dark:bg-cyan-950/30 px-2.5 py-1 text-xs font-black text-cyan-705 dark:text-cyan-400 border border-cyan-200/20 shadow-sm capitalize">
                                        Mức độ: {currentCard.difficulty === 'beginner' ? 'Cơ bản' : currentCard.difficulty === 'intermediate' ? 'Trung cấp' : 'Cao cấp'}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            ) : (
                /* Empty queue state */
                <section className="custom-shadow rounded-2xl border border-dashed border-teal-200 dark:border-slate-800 bg-white dark:bg-slate-905/30 p-16 text-center text-slate-500">
                    <Award className="h-12 w-12 mx-auto text-teal-650 dark:text-teal-400 mb-3 animate-bounce" />
                    <p className="font-black text-lg text-slate-900 dark:text-slate-100">Tuyệt vời! Đã hoàn thành ôn tập hôm nay</p>
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-405 mt-2">Không còn thẻ nào cần ôn. Hãy mở đầu đọc Reader và lưu thêm từ vựng mới.</p>
                </section>
            )}

            {/* Grading Controllers */}
            {currentCard && (
                <section className="flex flex-wrap items-center justify-center gap-3">
                    <button
                        onClick={() => move(-1)}
                        disabled={currentIndex === 0}
                        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 text-slate-500 dark:text-slate-400 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-850"
                        title="Thẻ trước"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>

                    <button
                        onClick={() => grade(1)}
                        className="flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200/40 dark:border-red-900/30 px-5 py-3 text-sm font-black text-red-650 dark:text-red-400 hover:scale-[1.02] transition-transform"
                    >
                        <X className="h-4 w-4" />
                        Again (Quá khó)
                    </button>
                    <button
                        onClick={() => grade(2)}
                        className="rounded-xl bg-orange-50 dark:bg-orange-950/20 border border-orange-200/40 dark:border-orange-900/30 px-5 py-3 text-sm font-black text-orange-705 dark:text-orange-400 hover:scale-[1.02] transition-transform"
                    >
                        Hard (Sắp quên)
                    </button>
                    <button
                        onClick={() => grade(3)}
                        className="rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/40 dark:border-amber-900/30 px-5 py-3 text-sm font-black text-amber-705 dark:text-amber-400 hover:scale-[1.02] transition-transform"
                    >
                        Good (Vừa thuộc)
                    </button>
                    <button
                        onClick={() => grade(4)}
                        className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/40 dark:border-emerald-900/30 px-5 py-3 text-sm font-black text-emerald-705 dark:text-emerald-400 hover:scale-[1.02] transition-transform"
                    >
                        <Check className="h-4 w-4" />
                        Easy (Rất dễ)
                    </button>

                    <button
                        onClick={() => move(1)}
                        disabled={currentIndex === dueCards.length - 1}
                        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 text-slate-500 dark:text-slate-400 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-850"
                        title="Thẻ sau"
                    >
                        <ChevronRight className="h-5 w-5" />
                    </button>
                </section>
            )}
        </div>
    )
}
