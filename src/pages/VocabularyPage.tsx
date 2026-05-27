import { useMemo, useState } from 'react'
import { BookMarked, Check, FileText, PencilLine, Search, Trash2, Volume2 } from 'lucide-react'
import { useStore } from '@/store/useStore'

function speak(text: string) {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-CN'
    speechSynthesis.speak(utterance)
}

export default function VocabularyPage() {
    const { savedWords, userCorrections, knownWords, removeSavedWord, toggleFavorite } = useStore()
    const [search, setSearch] = useState('')
    const [filter, setFilter] = useState<'all' | 'learned' | 'due'>('all')

    const filteredWords = useMemo(() => {
        return savedWords.filter((word) => {
            const text = `${word.word} ${word.translation} ${word.pinyin ?? ''} ${word.sourceFile ?? ''}`.toLowerCase()
            const matchesSearch = text.includes(search.toLowerCase())
            const matchesFilter = filter === 'all' || (filter === 'learned' && word.learned) || (filter === 'due' && !word.learned)
            return matchesSearch && matchesFilter
        })
    }, [savedWords, search, filter])

    const sourceCount = new Set(savedWords.map((word) => word.sourceFile).filter(Boolean)).size

    return (
        <div className="flex min-h-full flex-col gap-6 pb-8 transition-colors duration-300">
            {/* Page Header */}
            <section className="glass border border-white/60 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 p-6 custom-shadow rounded-3xl backdrop-blur-md">
                <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
                    <div className="flex items-start gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-600 text-white custom-shadow">
                            <BookMarked className="h-7 w-7" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">Từ vựng đã lưu</h1>
                            <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
                                Quản lý từ vựng và các sửa đổi nghĩa Việt cá nhân được tạo từ trình đọc tài liệu.
                            </p>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="rounded-2xl border border-teal-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 shadow-sm">
                            <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{savedWords.length}</p>
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Tổng số từ</p>
                        </div>
                        <div className="rounded-2xl border border-emerald-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 shadow-sm">
                            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{savedWords.filter((word) => word.learned).length}</p>
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Đã thuộc</p>
                        </div>
                        <div className="rounded-2xl border border-cyan-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 shadow-sm">
                            <p className="text-2xl font-black text-cyan-600 dark:text-cyan-400">{sourceCount}</p>
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Nguồn tệp</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Main Content Grid */}
            <section className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
                {/* Left Column: Word Table */}
                <div className="custom-shadow overflow-hidden rounded-2xl border border-teal-100/40 dark:border-slate-800 bg-white dark:bg-slate-900/50 backdrop-blur-sm">
                    <div className="flex flex-col justify-between gap-3 border-b border-teal-100/40 dark:border-slate-805 bg-teal-50/20 dark:bg-slate-950/20 p-4 md:flex-row md:items-center">
                        <div className="flex flex-wrap items-center gap-2">
                            {(['all', 'due', 'learned'] as const).map((item) => (
                                <button
                                    key={item}
                                    onClick={() => setFilter(item)}
                                    className={`rounded-lg px-3 py-2 text-xs font-black uppercase tracking-wider transition-all ${
                                        filter === item
                                            ? 'bg-teal-600 text-white shadow-sm'
                                            : 'border border-teal-100/60 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-405 hover:bg-teal-50 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    {item === 'all' ? 'Tất cả' : item === 'due' ? 'Chưa thuộc' : 'Đã thuộc'}
                                </button>
                            ))}
                        </div>
                        <div className="relative w-full md:w-80">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                            <input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Tìm từ, nghĩa, pinyin..."
                                className="w-full rounded-xl border border-teal-100 dark:border-slate-800 bg-white dark:bg-slate-900 py-2.5 pl-10 pr-4 text-sm font-semibold outline-none focus:border-teal-400 dark:focus:border-slate-700 text-slate-800 dark:text-slate-200"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-teal-100/30 dark:border-slate-805 bg-slate-50/70 dark:bg-slate-900/40 text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                <tr>
                                    <th className="px-6 py-4">Từ vựng</th>
                                    <th className="px-6 py-4">Pinyin</th>
                                    <th className="px-6 py-4">Nghĩa tiếng Việt</th>
                                    <th className="px-6 py-4">Nguồn</th>
                                    <th className="px-6 py-4">Tag</th>
                                    <th className="px-6 py-4 text-right">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-teal-50/50 dark:divide-slate-800/50">
                                {filteredWords.map((word) => (
                                    <tr key={word.id} className="group transition-colors hover:bg-teal-50/20 dark:hover:bg-slate-800/10">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <span className="chinese-text text-2xl font-black text-teal-700 dark:text-teal-450">{word.word}</span>
                                                {word.learned && (
                                                    <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/40 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-700 dark:text-emerald-400 border border-emerald-200/20">
                                                        đã học
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-semibold text-slate-500 dark:text-slate-400">/{word.pinyin || '-'}/</td>
                                        <td className="max-w-md px-6 py-4">
                                            <p className="font-bold text-slate-800 dark:text-slate-200">{word.translation}</p>
                                            {word.context && <p className="mt-1 line-clamp-2 text-xs font-semibold text-slate-500 dark:text-slate-400 italic">"{word.context}"</p>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-1 rounded-md border border-teal-100/40 dark:border-teal-900/30 bg-teal-50/50 dark:bg-teal-950/20 px-2 py-1 text-xs font-black text-teal-750 dark:text-teal-400">
                                                <FileText className="h-3 w-3" />
                                                {word.sourceFile ? 'Tài liệu' : 'Từ ngoài'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {word.hskLevel && <span className="rounded-md bg-amber-100/60 dark:bg-amber-950/30 border border-amber-200/20 px-2 py-1 text-xs font-black text-amber-700 dark:text-amber-400">HSK {word.hskLevel}</span>}
                                                {word.domainTags?.slice(0, 2).map((tag) => (
                                                    <span key={tag} className="rounded-md bg-cyan-100/60 dark:bg-cyan-950/30 border border-cyan-200/20 px-2 py-1 text-xs font-black text-cyan-700 dark:text-cyan-400">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => speak(word.word)}
                                                    className="rounded-lg border border-slate-200 dark:border-slate-800 p-2 text-slate-500 dark:text-slate-400 hover:border-teal-200 hover:text-teal-750 dark:hover:bg-slate-800"
                                                    title="Nghe phát âm"
                                                >
                                                    <Volume2 className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => toggleFavorite(word.id)}
                                                    className={`rounded-lg border p-2 transition-colors ${
                                                        word.learned
                                                            ? 'border-emerald-250 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                                                            : 'border-slate-200 dark:border-slate-800 text-slate-405 dark:text-slate-500 hover:border-emerald-200 hover:text-emerald-700 hover:bg-emerald-50/20'
                                                    }`}
                                                    title={word.learned ? "Đánh dấu chưa thuộc" : "Đánh dấu đã thuộc"}
                                                >
                                                    <Check className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => removeSavedWord(word.id)}
                                                    className="rounded-lg border border-slate-205 dark:border-slate-800 p-2 text-slate-400 hover:border-red-200 hover:text-red-655 dark:hover:bg-red-950/10"
                                                    title="Xóa khỏi danh sách"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {filteredWords.length === 0 && (
                        <div className="p-12 text-center font-bold text-slate-400 dark:text-slate-500">
                            Chưa có từ phù hợp. Vào đầu đọc Reader, nhấp chọn từ và lưu Annotation.
                        </div>
                    )}
                </div>

                {/* Right Column: User Corrections & Known Words */}
                <aside className="flex flex-col gap-6">
                    {/* Corrections Card */}
                    <div className="custom-shadow rounded-2xl border border-teal-100/40 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-5 backdrop-blur-sm">
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <h2 className="font-black text-slate-900 dark:text-slate-100">Bản dịch sửa đổi (Corrections)</h2>
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Nghĩa Việt ưu tiên do bạn tùy biến khi học.</p>
                            </div>
                            <PencilLine className="h-5 w-5 text-teal-700 dark:text-teal-400" />
                        </div>
                        <div className="space-y-3">
                            {userCorrections.map((correction) => (
                                <div key={correction.id} className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/20 p-3 shadow-sm">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="chinese-text text-xl font-black text-teal-700 dark:text-teal-450">{correction.original_term}</p>
                                        <span className="rounded-md bg-cyan-100/60 dark:bg-cyan-950/30 border border-cyan-200/20 px-2 py-0.5 text-[10px] font-black text-cyan-705 dark:text-cyan-400">
                                            {correction.domain}
                                        </span>
                                    </div>
                                    <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-200">{correction.user_translation}</p>
                                    {correction.context && <p className="mt-1 line-clamp-2 text-xs font-semibold text-slate-400 dark:text-slate-500">"{correction.context}"</p>}
                                </div>
                            ))}
                            {userCorrections.length === 0 && (
                                <p className="rounded-xl bg-slate-50 dark:bg-slate-950/10 p-4 text-xs font-semibold text-slate-500 text-center">
                                    Chưa có sửa đổi nghĩa Việt. Hãy thêm ghi chú đè nghĩa Việt trong Tab 'Personal Note' tại Reader.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Known Words Card */}
                    <div className="custom-shadow rounded-2xl border border-emerald-100/40 dark:border-slate-805 bg-white dark:bg-slate-900/50 p-5 backdrop-blur-sm">
                        <div className="mb-4">
                            <h2 className="font-black text-slate-900 dark:text-slate-100">Từ vựng đã biết (Known)</h2>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Các từ đã thuộc giúp hệ thống tự động lọc bớt phiên âm pinyin.</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {knownWords.map((word) => (
                                <span key={word.id} className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100/30 px-2 py-1 text-sm font-black text-emerald-700 dark:text-emerald-450 shadow-sm transition-all hover:scale-[1.03]">
                                    {word.word}
                                </span>
                            ))}
                            {knownWords.length === 0 && (
                                <p className="rounded-xl bg-slate-50 dark:bg-slate-950/10 p-4 text-xs font-semibold text-slate-500 text-center w-full">
                                    Chưa có từ vựng đánh dấu đã biết.
                                </p>
                            )}
                        </div>
                    </div>
                </aside>
            </section>
        </div>
    )
}
