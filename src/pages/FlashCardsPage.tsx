import { useMemo, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, Layers, RotateCcw, Volume2, X } from 'lucide-react'
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
        <div className="mx-auto flex min-h-full max-w-6xl flex-col gap-6 pb-8">
            <section className="glass custom-shadow rounded-3xl border border-white p-6">
                <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
                    <div className="flex items-start gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-600 text-white custom-shadow">
                            <Layers className="h-7 w-7" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight text-slate-900">Flashcards / SRS</h1>
                            <p className="mt-2 text-sm font-semibold text-slate-500">
                                Hàng đợi ôn tập tạo từ annotation trong tài liệu thật.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            setCurrentIndex(0)
                            setIsFlipped(false)
                        }}
                        className="flex items-center gap-2 rounded-xl border border-teal-100 bg-white px-5 py-3 text-sm font-black text-teal-700 hover:bg-teal-50"
                    >
                        <RotateCcw className="h-4 w-4" />
                        Làm lại phiên
                    </button>
                </div>
            </section>

            <section className="custom-shadow rounded-2xl border border-teal-100 bg-white p-5">
                <div className="mb-3 flex items-center justify-between text-sm font-bold text-slate-500">
                    <span>
                        Thẻ {dueCards.length ? currentIndex + 1 : 0}/{dueCards.length}
                    </span>
                    <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-teal-600 transition-all" style={{ width: `${progress}%` }} />
                </div>
            </section>

            {currentCard ? (
                <section
                    onClick={() => setIsFlipped((value) => !value)}
                    className="custom-shadow min-h-[420px] cursor-pointer overflow-hidden rounded-[2rem] border border-teal-100 bg-white text-center"
                >
                    <div className="flex min-h-[420px] flex-col items-center justify-center bg-gradient-to-br from-white via-teal-50/60 to-cyan-50 p-8">
                        {!isFlipped ? (
                            <>
                                <span className="mb-5 rounded-full bg-teal-100 px-3 py-1 text-xs font-black uppercase tracking-wider text-teal-700">
                                    Mặt trước
                                </span>
                                <h2 className="chinese-text mb-5 text-7xl font-black text-slate-900 md:text-8xl">{currentCard.front}</h2>
                                {currentCard.pinyin && (
                                    <p className="mb-5 rounded-xl border border-teal-100 bg-white px-4 py-2 font-mono text-lg font-bold text-teal-700 custom-shadow">
                                        /{currentCard.pinyin}/
                                    </p>
                                )}
                                <button
                                    onClick={(event) => {
                                        event.stopPropagation()
                                        speak(currentCard.front)
                                    }}
                                    className="rounded-full border border-teal-100 bg-white p-3 text-teal-700 hover:bg-teal-50"
                                    title="Nghe"
                                >
                                    <Volume2 className="h-5 w-5" />
                                </button>
                                <p className="mt-8 text-sm font-semibold text-slate-400">Click thẻ để xem nghĩa.</p>
                            </>
                        ) : (
                            <>
                                <span className="mb-5 rounded-full bg-amber-100 px-3 py-1 text-xs font-black uppercase tracking-wider text-amber-700">
                                    Mặt sau
                                </span>
                                <h2 className="mb-4 max-w-3xl text-3xl font-black text-slate-900">{currentCard.back}</h2>
                                {currentCard.example && (
                                    <div className="max-w-3xl rounded-2xl border border-white bg-white/90 p-5 custom-shadow">
                                        <p className="chinese-text text-xl leading-loose text-slate-800">{currentCard.example}</p>
                                    </div>
                                )}
                                {currentCard.hskLevel && (
                                    <span className="mt-5 rounded-md bg-amber-100 px-2 py-1 text-xs font-black text-amber-700">
                                        HSK {currentCard.hskLevel}
                                    </span>
                                )}
                            </>
                        )}
                    </div>
                </section>
            ) : (
                <section className="custom-shadow rounded-2xl border border-dashed border-teal-200 bg-white p-12 text-center font-semibold text-slate-500">
                    Chưa có flashcard. Hãy lưu annotation trong Reader trước.
                </section>
            )}

            {currentCard && (
                <section className="flex flex-wrap items-center justify-center gap-3">
                    <button
                        onClick={() => move(-1)}
                        disabled={currentIndex === 0}
                        className="rounded-xl border border-slate-200 bg-white p-3 text-slate-500 disabled:opacity-40"
                        title="Thẻ trước"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button onClick={() => grade(1)} className="flex items-center gap-2 rounded-xl bg-red-50 px-5 py-3 text-sm font-black text-red-600 hover:bg-red-100">
                        <X className="h-4 w-4" />
                        Again
                    </button>
                    <button onClick={() => grade(2)} className="rounded-xl bg-orange-50 px-5 py-3 text-sm font-black text-orange-700 hover:bg-orange-100">
                        Hard
                    </button>
                    <button onClick={() => grade(3)} className="rounded-xl bg-amber-50 px-5 py-3 text-sm font-black text-amber-700 hover:bg-amber-100">
                        Good
                    </button>
                    <button onClick={() => grade(4)} className="flex items-center gap-2 rounded-xl bg-emerald-50 px-5 py-3 text-sm font-black text-emerald-700 hover:bg-emerald-100">
                        <Check className="h-4 w-4" />
                        Easy
                    </button>
                    <button
                        onClick={() => move(1)}
                        disabled={currentIndex === dueCards.length - 1}
                        className="rounded-xl border border-slate-200 bg-white p-3 text-slate-500 disabled:opacity-40"
                        title="Thẻ sau"
                    >
                        <ChevronRight className="h-5 w-5" />
                    </button>
                </section>
            )}
        </div>
    )
}
