import { useState } from 'react'
import { BookMarked, BookOpen, Brain, CheckCircle, Layers, Search, Trash2 } from 'lucide-react'
import type { AnnotationRecord, FlashCard, SavedWord } from '@/types'

export function SavedHub({
    viewType,
    savedWords,
    annotations,
    flashCards,
    onRemoveWord,
    onRemoveAnnotation,
    onSubmitReview,
}: {
    viewType: 'library' | 'study-hub'
    savedWords: SavedWord[]
    annotations: AnnotationRecord[]
    flashCards: FlashCard[]
    onRemoveWord: (id: string) => void
    onRemoveAnnotation: (id: string) => void
    onSubmitReview: (id: string, rating: number) => void
}) {
    const [searchTerm, setSearchTerm] = useState('')
    const [activeTab, setActiveTab] = useState<'vocab' | 'grammar'>('vocab')
    const [flashcardIndex, setFlashcardIndex] = useState(0)
    const [isFlipped, setIsFlipped] = useState(false)

    const filteredWords = savedWords.filter((item) => {
        const term = searchTerm.toLowerCase()
        return item.word.includes(searchTerm) || item.pinyin?.toLowerCase().includes(term) || item.translation.toLowerCase().includes(term)
    })

    const grammarNotes = annotations.filter((annotation) => annotation.annotation_type !== 'word' || annotation.selected_text.length > 1)
    const filteredGrammars = grammarNotes.filter((item) => {
        const term = searchTerm.toLowerCase()
        return item.selected_text.toLowerCase().includes(term) || (item.explanation_vi || item.note || '').toLowerCase().includes(term)
    })

    const deck = flashCards.length
        ? flashCards
        : savedWords.map((word) => ({
              id: word.id,
              front: word.word,
              back: word.translation,
              example: word.context,
              difficulty: 'beginner' as const,
              reviewed: word.learned,
              createdAt: word.createdAt,
              pinyin: word.pinyin,
              hskLevel: word.hskLevel,
          }))
    const currentCard = deck[Math.min(flashcardIndex, Math.max(0, deck.length - 1))]
    const canSubmitReview = flashCards.length > 0 && Boolean(currentCard)

    if (viewType === 'study-hub') {
        return (
            <div className="min-h-full w-full overflow-y-auto bg-slate-50/60 px-6 py-8">
                <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
                    <div>
                        <h1 className="flex items-center gap-2 text-2xl font-black text-teal-900">
                            <Layers className="h-6 w-6 text-teal-600" />
                            Trạm Ôn Luyện
                        </h1>
                        <p className="mt-1 text-sm font-medium text-slate-500">Ôn lại flashcards được tạo từ annotation, lookup và quét từ trong Reader.</p>
                    </div>

                    {currentCard ? (
                        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
                            <div className="rounded-3xl border border-teal-100/60 bg-white/80 p-6 shadow-sm lg:col-span-7">
                                <div className="mb-6 flex items-center justify-between">
                                    <h2 className="flex items-center gap-1.5 text-sm font-black text-slate-800">
                                        <BookMarked className="h-4 w-4 text-teal-600" />
                                        Flashcards ({deck.length})
                                    </h2>
                                    <span className="rounded-full border border-teal-200/60 bg-teal-50 px-2.5 py-1 text-xs font-black text-teal-700">
                                        Thẻ {Math.min(flashcardIndex + 1, deck.length)}/{deck.length}
                                    </span>
                                </div>

                                <button
                                    onClick={() => setIsFlipped((value) => !value)}
                                    className="flex h-[260px] w-full max-w-[440px] flex-col items-center justify-between rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-600 to-emerald-700 p-6 text-white shadow-md transition hover:scale-[1.01]"
                                >
                                    <span className="w-full text-right font-mono text-xs font-black uppercase tracking-wider text-teal-100">
                                        {isFlipped ? 'Click để úp lại' : 'Click để lật'}
                                    </span>
                                    <div className="text-center">
                                        <span className="break-words text-5xl font-black tracking-wide">{isFlipped ? currentCard.back : currentCard.front}</span>
                                        <p className="mt-3 text-sm font-semibold text-teal-100">{isFlipped ? currentCard.example || currentCard.pinyin : currentCard.pinyin}</p>
                                    </div>
                                    <span className="text-xs font-semibold text-white/80">{isFlipped ? currentCard.front : 'Nhớ nghĩa trước khi lật'}</span>
                                </button>

                                <div className="mt-8 grid w-full max-w-[440px] grid-cols-2 gap-4">
                                    <button
                                        onClick={() => {
                                            setIsFlipped(false)
                                            setFlashcardIndex((index) => (index > 0 ? index - 1 : deck.length - 1))
                                        }}
                                        className="rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-black text-slate-700 transition hover:bg-slate-100"
                                    >
                                        Thẻ trước
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsFlipped(false)
                                            setFlashcardIndex((index) => (index + 1) % deck.length)
                                        }}
                                        className="rounded-xl bg-teal-600 py-2.5 text-xs font-black text-white transition hover:bg-teal-700"
                                    >
                                        Thẻ sau
                                    </button>
                                </div>
                            </div>

                            <div className="rounded-3xl border border-teal-100/60 bg-white/80 p-6 shadow-sm lg:col-span-5">
                                <h3 className="flex items-center gap-2 text-sm font-black text-slate-800">
                                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                                    Chấm ôn tập
                                </h3>
                                <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500">
                                    Khi thẻ có review item từ backend, nút dưới sẽ cập nhật lịch SRS. Với thẻ chỉ đến từ lookup local, hãy tạo flashcard từ Reader để có lịch ôn.
                                </p>
                                <div className="mt-5 grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => currentCard && onSubmitReview(currentCard.id, 2)}
                                        disabled={!canSubmitReview}
                                        className="rounded-xl border border-amber-200 bg-amber-50 py-2.5 text-xs font-black text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        Cần ôn lại
                                    </button>
                                    <button
                                        onClick={() => currentCard && onSubmitReview(currentCard.id, 4)}
                                        disabled={!canSubmitReview}
                                        className="rounded-xl border border-emerald-200 bg-emerald-50 py-2.5 text-xs font-black text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        Đã nhớ
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-3xl border border-teal-100 bg-white/70 px-6 py-24 text-center">
                            <BookMarked className="mx-auto h-10 w-10 text-teal-600" />
                            <h3 className="mt-3 text-sm font-black text-slate-800">Chưa có flashcard</h3>
                            <p className="mt-1 text-xs font-medium text-slate-500">Quay lại Documents, chọn từ/câu và lưu vào học phần.</p>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-full w-full overflow-y-auto bg-slate-50/60 px-6 py-8">
            <div className="mx-auto w-full max-w-5xl">
                <div className="mb-6 flex flex-col justify-between gap-4 border-b border-teal-100/40 pb-6 md:flex-row md:items-center">
                    <div>
                        <h1 className="flex items-center gap-2 text-2xl font-black text-teal-900">
                            <BookOpen className="h-6 w-6 text-teal-600" />
                            Thư viện của tôi
                        </h1>
                        <p className="mt-1 text-sm font-medium text-slate-500">Quản lý từ vựng và annotation đã lưu từ Reader.</p>
                    </div>
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="Tìm kiếm từ hoặc cấu trúc..."
                            className="w-full rounded-xl border border-teal-200/60 bg-white/80 py-2 pl-9 pr-4 text-xs font-semibold outline-none transition focus:border-teal-500"
                        />
                    </div>
                </div>

                <div className="mb-6 flex gap-2">
                    <button
                        onClick={() => setActiveTab('vocab')}
                        className={`rounded-xl px-4 py-2 text-xs font-black transition ${activeTab === 'vocab' ? 'bg-teal-600 text-white shadow-sm' : 'bg-teal-50 text-teal-800 hover:bg-teal-100'}`}
                    >
                        Từ vựng ({savedWords.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('grammar')}
                        className={`rounded-xl px-4 py-2 text-xs font-black transition ${activeTab === 'grammar' ? 'bg-teal-600 text-white shadow-sm' : 'bg-teal-50 text-teal-800 hover:bg-teal-100'}`}
                    >
                        Annotation ({grammarNotes.length})
                    </button>
                </div>

                {activeTab === 'vocab' ? (
                    filteredWords.length ? (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {filteredWords.map((word) => (
                                <div key={word.id} className="group rounded-2xl border border-teal-100/60 bg-white/85 p-4 shadow-sm transition hover:shadow-md">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <div className="shrink-0 rounded-xl border border-teal-100 bg-teal-50 px-2.5 py-1 text-lg font-black text-teal-700">
                                                {word.word}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-slate-700">{word.pinyin || 'pinyin'}</p>
                                                {word.hskLevel && (
                                                    <span className="mt-1 inline-block rounded-full border border-sky-100 bg-sky-50 px-2 py-0.5 text-[9px] font-black text-sky-800">
                                                        HSK {word.hskLevel}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => onRemoveWord(word.id)}
                                            className="rounded-full bg-slate-50 p-1.5 text-slate-400 opacity-0 transition hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100"
                                            title="Xóa khỏi thư viện"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                    <div className="mt-4 border-t border-slate-100 pt-3">
                                        <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400">Định nghĩa</h4>
                                        <p className="mt-1 text-xs font-semibold text-slate-700">{word.translation}</p>
                                    </div>
                                    {word.context && (
                                        <div className="mt-3 rounded-xl border border-teal-100/40 bg-teal-50/30 p-2 text-[11px] text-slate-600">
                                            <span className="font-black text-teal-800">Ví dụ:</span> {word.context}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-3xl border border-teal-100 bg-white/60 px-6 py-24 text-center">
                            <BookOpen className="mx-auto h-10 w-10 text-teal-600" />
                            <h3 className="mt-3 text-sm font-black text-slate-800">Chưa có từ vựng phù hợp</h3>
                            <p className="mt-1 text-xs font-medium text-slate-500">Chọn từ trong Documents và lưu vào học phần.</p>
                        </div>
                    )
                ) : filteredGrammars.length ? (
                    <div className="space-y-4">
                        {filteredGrammars.map((grammar) => (
                            <div key={grammar.id} className="group rounded-2xl border border-teal-100 bg-white/85 p-5 shadow-sm">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h3 className="text-[15px] font-black text-teal-900">{grammar.selected_text}</h3>
                                        {grammar.pinyin && <p className="mt-0.5 text-xs font-semibold italic text-slate-500">{grammar.pinyin}</p>}
                                    </div>
                                    <button
                                        onClick={() => onRemoveAnnotation(grammar.id)}
                                        className="rounded-full bg-slate-50 p-1.5 text-slate-400 opacity-0 transition hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                                <div className="mt-3 whitespace-pre-line text-xs font-semibold leading-relaxed text-slate-700">
                                    {grammar.explanation_vi || grammar.note || 'Annotation đã lưu.'}
                                </div>
                                {grammar.source_sentence && (
                                    <div className="mt-4 rounded-xl border-l-2 border-l-teal-500 bg-teal-50/30 p-2 text-[11px] text-teal-900">
                                        <span className="font-black">Mẫu trong bài:</span> {grammar.source_sentence}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="rounded-3xl border border-teal-100 bg-white/60 px-6 py-24 text-center">
                        <Brain className="mx-auto h-10 w-10 text-teal-600" />
                        <h3 className="mt-3 text-sm font-black text-slate-800">Chưa có annotation phù hợp</h3>
                        <p className="mt-1 text-xs font-medium text-slate-500">Lưu một cụm/câu trong tab AI để xem tại đây.</p>
                    </div>
                )}
            </div>
        </div>
    )
}

