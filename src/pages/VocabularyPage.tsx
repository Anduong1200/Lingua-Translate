import { useMemo, useState } from 'react'
import { BookMarked, Check, FileText, Search, Trash2, Volume2 } from 'lucide-react'
import { useStore } from '@/store/useStore'

function speak(text: string) {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-CN'
    speechSynthesis.speak(utterance)
}

export default function VocabularyPage() {
    const { savedWords, removeSavedWord, toggleFavorite } = useStore()
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
        <div className="flex min-h-full flex-col gap-6 pb-8">
            <section className="glass custom-shadow rounded-3xl border border-white p-6">
                <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
                    <div className="flex items-start gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-600 text-white custom-shadow">
                            <BookMarked className="h-7 w-7" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight text-slate-900">Từ vựng đã lưu</h1>
                            <p className="mt-2 text-sm font-semibold text-slate-500">
                                Từ/cụm được tạo trực tiếp từ annotation và correction cá nhân.
                            </p>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="rounded-2xl border border-teal-100 bg-white px-4 py-3">
                            <p className="text-2xl font-black text-slate-900">{savedWords.length}</p>
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Tổng từ</p>
                        </div>
                        <div className="rounded-2xl border border-emerald-100 bg-white px-4 py-3">
                            <p className="text-2xl font-black text-emerald-700">{savedWords.filter((word) => word.learned).length}</p>
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Đã thuộc</p>
                        </div>
                        <div className="rounded-2xl border border-cyan-100 bg-white px-4 py-3">
                            <p className="text-2xl font-black text-cyan-700">{sourceCount}</p>
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Nguồn</p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="custom-shadow overflow-hidden rounded-2xl border border-teal-100 bg-white">
                <div className="flex flex-col justify-between gap-3 border-b border-teal-100 bg-teal-50/40 p-4 md:flex-row md:items-center">
                    <div className="flex flex-wrap items-center gap-2">
                        {(['all', 'due', 'learned'] as const).map((item) => (
                            <button
                                key={item}
                                onClick={() => setFilter(item)}
                                className={`rounded-lg px-3 py-2 text-xs font-black uppercase tracking-wider ${
                                    filter === item ? 'bg-teal-600 text-white' : 'border border-teal-100 bg-white text-slate-500 hover:bg-teal-50'
                                }`}
                            >
                                {item === 'all' ? 'Tất cả' : item === 'due' ? 'Chưa thuộc' : 'Đã thuộc'}
                            </button>
                        ))}
                    </div>
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Tìm từ, nghĩa, pinyin..."
                            className="w-full rounded-lg border border-teal-100 bg-white py-2.5 pl-10 pr-3 text-sm font-semibold outline-none focus:border-teal-400"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="border-b border-teal-100 bg-slate-50/70 text-xs font-black uppercase tracking-wider text-slate-400">
                            <tr>
                                <th className="px-6 py-4">Từ vựng</th>
                                <th className="px-6 py-4">Pinyin</th>
                                <th className="px-6 py-4">Nghĩa tiếng Việt</th>
                                <th className="px-6 py-4">Nguồn</th>
                                <th className="px-6 py-4">Tag</th>
                                <th className="px-6 py-4 text-right">Hành động</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-teal-50">
                            {filteredWords.map((word) => (
                                <tr key={word.id} className="group transition-colors hover:bg-teal-50/30">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <span className="chinese-text text-2xl font-black text-teal-700">{word.word}</span>
                                            {word.learned && (
                                                <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-black uppercase text-emerald-700">
                                                    learned
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-sm font-bold text-slate-500">{word.pinyin || '-'}</td>
                                    <td className="max-w-md px-6 py-4">
                                        <p className="font-bold text-slate-800">{word.translation}</p>
                                        {word.context && <p className="mt-1 line-clamp-2 text-xs font-semibold text-slate-500">{word.context}</p>}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center gap-1 rounded-md bg-teal-50 px-2 py-1 text-xs font-black text-teal-700">
                                            <FileText className="h-3 w-3" />
                                            {word.sourceFile || 'Local'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1">
                                            {word.hskLevel && <span className="rounded-md bg-amber-100 px-2 py-1 text-xs font-black text-amber-700">HSK {word.hskLevel}</span>}
                                            {word.domainTags?.slice(0, 2).map((tag) => (
                                                <span key={tag} className="rounded-md bg-cyan-100 px-2 py-1 text-xs font-black text-cyan-700">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => speak(word.word)}
                                                className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:border-teal-200 hover:text-teal-700"
                                                title="Nghe"
                                            >
                                                <Volume2 className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => toggleFavorite(word.id)}
                                                className={`rounded-lg border p-2 ${
                                                    word.learned
                                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                                        : 'border-slate-200 text-slate-400 hover:border-emerald-200 hover:text-emerald-700'
                                                }`}
                                                title="Đánh dấu đã thuộc"
                                            >
                                                <Check className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => removeSavedWord(word.id)}
                                                className="rounded-lg border border-slate-200 p-2 text-slate-400 hover:border-red-200 hover:text-red-600"
                                                title="Xóa"
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
                    <div className="p-12 text-center font-semibold text-slate-500">
                        Chưa có từ phù hợp. Vào Reader, chọn một từ và lưu annotation.
                    </div>
                )}
            </section>
        </div>
    )
}
