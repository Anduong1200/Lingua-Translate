import { useMemo, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, Layers, RotateCcw, Volume2, X, Award, HelpCircle, Sparkles } from 'lucide-react'
import { useStore } from '@/store/useStore'

// Web Speech API wrapper
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
    const dueToday = reviewItems.filter((item) => new Date(item.due_at).getTime() <= Date.now()).length
    const reviewedCount = reviewItems.filter((item) => item.reviewed).length
    const totalTracked = Math.max(reviewItems.length, dueCards.length)
    const todayProgress = totalTracked ? Math.round((reviewedCount / totalTracked) * 100) : 100

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
        <div className="mx-auto flex min-h-full max-w-4xl flex-col gap-6 pb-8 transition-colors duration-300">
            {/* Page Header */}
            <section className="glass border border-white/60 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 p-6 custom-shadow rounded-3xl backdrop-blur-md">
                <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
                    <div className="flex items-start gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0d9488] to-teal-500 text-white shadow-lg shadow-teal-500/20">
                            <Layers className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-display font-black tracking-tight text-slate-900 dark:text-slate-100">Hàng đợi ôn tập</h1>
                            <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
                                Luyện tập trí nhớ dãn cách Simple SRS dựa trên mức độ thuộc của bạn.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            setCurrentIndex(0)
                            setIsFlipped(false)
                        }}
                        className="flex items-center gap-2 rounded-2xl border border-teal-100/40 dark:border-slate-800 bg-white dark:bg-slate-950 px-5 py-3 text-sm font-bold text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-slate-900 shadow-lg shadow-teal-500/5 transition-all"
                    >
                        <RotateCcw className="h-4 w-4" />
                        Làm lại từ đầu
                    </button>
                </div>
            </section>

            {/* Progress Bar Panel */}
            <section className="custom-shadow rounded-2xl border border-teal-100/40 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 p-5 backdrop-blur-sm">
                <div className="grid gap-5 md:grid-cols-[140px_1fr] md:items-center">
                    <div
                        className="mx-auto grid h-28 w-28 place-items-center rounded-full p-2 shadow-inner"
                        style={{ background: `conic-gradient(#16a34a ${todayProgress}%, #e5e7eb 0)` }}
                    >
                        <div className="grid h-full w-full place-items-center rounded-full bg-white text-center dark:bg-slate-900">
                            <div>
                                <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{dueToday}</p>
                                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">cần ôn</p>
                            </div>
                        </div>
                    </div>
                    <div>
                        <div className="mb-3 flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                            <span className="uppercase tracking-wider">
                                Thẻ {dueCards.length ? currentIndex + 1 : 0} trên {dueCards.length}
                            </span>
                            <span className="font-black text-teal-650 dark:text-teal-400">{Math.round(progress)}% PHIÊN HIỆN TẠI</span>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-950">
                            <div className="h-full rounded-full bg-gradient-to-r from-teal-500 via-teal-400 to-cyan-500 transition-all duration-350" style={{ width: `${progress}%` }} />
                        </div>
                        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[10px] font-black">
                            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">Đã ôn {reviewedCount}</div>
                            <div className="rounded-xl bg-amber-50 p-2 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">Còn {dueToday}</div>
                            <div className="rounded-xl bg-slate-50 p-2 text-slate-600 dark:bg-slate-800 dark:text-slate-300">Tổng {reviewItems.length}</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Flashcard Box with CSS 3D Flipping Effect */}
            {currentCard ? (
                <section
                    onClick={() => setIsFlipped((value) => !value)}
                    className="perspective-1000 min-h-[440px] cursor-pointer overflow-visible select-none"
                >
                    <div
                        className={`relative w-full min-h-[440px] preserve-3d duration-500 ease-out transform ${
                            isFlipped ? 'rotate-y-180' : ''
                        }`}
                    >
                        {/* Front Side Card */}
                        <div className="absolute inset-0 backface-hidden flex flex-col items-center justify-center bg-white/80 dark:bg-slate-900/70 border border-white/60 dark:border-slate-800/40 rounded-[2.5rem] p-8 shadow-2xl backdrop-blur-md">
                            <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-cyan-500/5 pointer-events-none rounded-[2.5rem]" />
                            <div className="space-y-6 flex flex-col items-center z-10">
                                <span className="rounded-full bg-teal-50 dark:bg-teal-950/40 border border-teal-100/50 dark:border-teal-900/40 px-4 py-1.5 text-xs font-black uppercase tracking-wider text-teal-700 dark:text-teal-400">
                                    MẶT TRƯỚC
                                </span>
                                <h2 className="chinese-text font-display text-7xl font-black text-[#102a3a] dark:text-slate-100 md:text-8xl select-all tracking-tight leading-none">{currentCard.front}</h2>
                                {currentCard.pinyin && (
                                    <p className="rounded-2xl border border-teal-100/40 dark:border-slate-800 bg-white/90 dark:bg-slate-950/80 px-5 py-2 font-mono text-lg font-bold text-teal-700 dark:text-teal-400 shadow-sm">
                                        /{currentCard.pinyin}/
                                    </p>
                                )}
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={(event) => {
                                            event.stopPropagation()
                                            speak(currentCard.front)
                                        }}
                                        className="rounded-2xl border border-teal-100/40 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-slate-900 transition-all shadow-md transform hover:scale-105 active:scale-95 duration-100"
                                        title="Phát âm tiếng Trung"
                                    >
                                        <Volume2 className="h-5 w-5" />
                                    </button>
                                </div>
                                <p className="text-xs font-semibold text-slate-400 dark:text-slate-400 flex items-center gap-1.5">
                                    <HelpCircle className="h-3.5 w-3.5" />
                                    Click vào thẻ để lật xem nghĩa Việt và câu ví dụ
                                </p>
                            </div>
                        </div>

                        {/* Back Side Card (rotated 180 degrees) */}
                        <div className="absolute inset-0 backface-hidden rotate-y-180 flex flex-col items-center justify-center bg-white/90 dark:bg-slate-900/90 border border-white/60 dark:border-slate-800/40 rounded-[2.5rem] p-8 shadow-2xl backdrop-blur-md">
                            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5 pointer-events-none rounded-[2.5rem]" />
                            <div className="space-y-6 flex flex-col items-center z-10 w-full">
                                <span className="rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-100/50 dark:border-amber-900/40 px-4 py-1.5 text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
                                    MẶT SAU
                                </span>
                                <h2 className="max-w-2xl text-center text-3xl font-display font-black text-[#102a3a] dark:text-slate-100 leading-relaxed">{currentCard.back}</h2>

                                {currentCard.example && (
                                    <div className="w-full max-w-xl rounded-2xl border border-slate-100 dark:border-slate-800/60 bg-white/70 dark:bg-slate-950/60 p-5 shadow-sm text-left">
                                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5 flex items-center gap-1">
                                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                            <span>Ngữ cảnh nguyên bản</span>
                                        </p>
                                        <p className="chinese-text text-lg leading-relaxed text-slate-800 dark:text-slate-200">{currentCard.example}</p>
                                    </div>
                                )}

                                <div className="flex flex-wrap gap-2 justify-center pt-2">
                                    {currentCard.hskLevel && (
                                        <span className="rounded-lg bg-amber-50 dark:bg-amber-950/30 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-400 border border-amber-100/40 shadow-sm">
                                            HSK {currentCard.hskLevel}
                                        </span>
                                    )}
                                    <span className="rounded-lg bg-cyan-50 dark:bg-cyan-950/30 px-3 py-1 text-xs font-bold text-cyan-700 dark:text-cyan-400 border border-cyan-150/40 shadow-sm capitalize">
                                        Độ khó: {currentCard.difficulty === 'beginner' ? 'Cơ bản' : currentCard.difficulty === 'intermediate' ? 'Trung cấp' : 'Cao cấp'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            ) : (
                /* Empty queue state */
                <section className="custom-shadow rounded-3xl border border-dashed border-teal-200 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/30 p-16 text-center text-slate-500 backdrop-blur-md">
                    <Award className="h-16 w-16 mx-auto text-teal-600 dark:text-teal-400 mb-4 animate-bounce" />
                    <p className="font-display font-black text-xl text-slate-900 dark:text-slate-100">Tuyệt vời! Đã hoàn thành ôn tập hôm nay</p>
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-2">Không còn thẻ nào cần ôn tập. Hãy mở mục tài liệu, lưu thêm từ vựng mới.</p>
                </section>
            )}

            {/* Grading Controllers */}
            {currentCard && (
                <section className="flex flex-wrap items-center justify-center gap-3">
                    <button
                        onClick={() => move(-1)}
                        disabled={currentIndex === 0}
                        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 text-slate-500 dark:text-slate-400 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-900 shadow-lg active:scale-95 duration-100 disabled:pointer-events-none"
                        title="Thẻ trước"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>

                    <button
                        onClick={() => grade(1)}
                        className="flex items-center gap-2 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-200/40 dark:border-red-900/30 px-6 py-4 text-xs font-black uppercase tracking-wider text-red-650 dark:text-red-400 hover:-translate-y-0.5 shadow-lg active:scale-95 duration-100 cursor-pointer"
                    >
                        <X className="h-4 w-4" />
                        Again (Khó quá)
                    </button>
                    <button
                        onClick={() => grade(2)}
                        className="rounded-2xl bg-orange-50 dark:bg-orange-950/20 border border-orange-200/40 dark:border-orange-900/30 px-6 py-4 text-xs font-black uppercase tracking-wider text-orange-700 dark:text-orange-400 hover:-translate-y-0.5 shadow-lg active:scale-95 duration-100 cursor-pointer"
                    >
                        Hard (Sắp quên)
                    </button>
                    <button
                        onClick={() => grade(3)}
                        className="rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/40 dark:border-amber-900/30 px-6 py-4 text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 hover:-translate-y-0.5 shadow-lg active:scale-95 duration-100 cursor-pointer"
                    >
                        Good (Vừa thuộc)
                    </button>
                    <button
                        onClick={() => grade(4)}
                        className="flex items-center gap-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/40 dark:border-emerald-900/30 px-6 py-4 text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 hover:-translate-y-0.5 shadow-lg active:scale-95 duration-100 cursor-pointer"
                    >
                        <Check className="h-4 w-4" />
                        Easy (Rất dễ)
                    </button>

                    <button
                        onClick={() => move(1)}
                        disabled={currentIndex === dueCards.length - 1}
                        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 text-slate-500 dark:text-slate-400 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-900 shadow-lg active:scale-95 duration-100 disabled:pointer-events-none"
                        title="Thẻ sau"
                    >
                        <ChevronRight className="h-5 w-5" />
                    </button>
                </section>
            )}
        </div>
    )
}
