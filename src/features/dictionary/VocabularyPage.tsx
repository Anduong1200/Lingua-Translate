import { useMemo, useState } from 'react'
import { BookMarked, Check, FileText, Folder, PencilLine, Search, Trash2, Volume2, Sparkles, Star } from 'lucide-react'
import { useStore } from '@/store/useStore'

// Web Speech API
function speak(text: string) {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-CN'
    speechSynthesis.speak(utterance)
}

export default function VocabularyPage() {
    const { savedWords, userCorrections, knownWords, removeSavedWord, toggleFavorite, markSavedWordLearned } = useStore()
    const [search, setSearch] = useState('')
    const [filter, setFilter] = useState<'all' | 'learned' | 'due' | 'favorite'>('all')

    const filteredWords = useMemo(() => {
        return savedWords.filter((word) => {
            const text = `${word.word} ${word.translation} ${word.pinyin ?? ''} ${word.sourceFile ?? ''}`.toLowerCase()
            const matchesSearch = text.includes(search.toLowerCase())
            const matchesFilter =
                filter === 'all' ||
                (filter === 'learned' && word.learned) ||
                (filter === 'due' && !word.learned) ||
                (filter === 'favorite' && word.isFavorite)
            return matchesSearch && matchesFilter
        })
    }, [savedWords, search, filter])

    const sourceCount = new Set(savedWords.map((word) => word.sourceFile).filter(Boolean)).size
    const topicGroups = useMemo(() => {
        const groups = new Map<string, number>()
        for (const word of savedWords) {
            const key = word.topic || word.domainTags?.[0] || word.sourceFile || 'Chưa phân loại'
            groups.set(key, (groups.get(key) || 0) + 1)
        }
        return Array.from(groups.entries()).sort((a, b) => b[1] - a[1])
    }, [savedWords])

    return (
        <div className="flex min-h-full flex-col gap-6 pb-8 transition-colors duration-300">
            {/* Page Header */}
            <section className="glass-card border border-white/40 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 p-6 shadow-lg rounded-[2rem] backdrop-blur-md">
                <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
                    <div className="flex items-start gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#006b5f] to-[#0060ac] text-white shadow-lg shadow-teal-500/20">
                            <BookMarked className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-display font-black tracking-tight text-slate-900 dark:text-slate-100">Thư viện từ vựng</h1>
                            <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                                Quản lý từ vựng và các nghĩa bản dịch do bạn đè hiệu đính cá nhân.
                            </p>
                        </div>
                    </div>

                    {/* Header stats metrics */}
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="rounded-2xl border border-[#006b5f]/15 dark:border-slate-800 bg-white dark:bg-slate-950 px-5 py-3 shadow-md">
                            <p className="text-2xl font-display font-black text-slate-900 dark:text-slate-100">{savedWords.length}</p>
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">TỔNG SỐ TỪ</p>
                        </div>
                        <div className="rounded-2xl border border-emerald-100/50 dark:border-slate-800 bg-white dark:bg-slate-950 px-5 py-3 shadow-md">
                            <p className="text-2xl font-display font-black text-emerald-600 dark:text-emerald-400">{savedWords.filter((word) => word.learned).length}</p>
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">ĐÃ THUỘC</p>
                        </div>
                        <div className="rounded-2xl border border-cyan-100/50 dark:border-slate-800 bg-white dark:bg-slate-950 px-5 py-3 shadow-md">
                            <p className="text-2xl font-display font-black text-cyan-600 dark:text-cyan-400">{sourceCount}</p>
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">TỆP NGUỒN</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Main Content Grid */}
            <section className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
                {/* Left Column: Word Table container */}
                <div className="glass-card overflow-hidden rounded-[2rem] border border-white/40 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 shadow-lg">
                    <div className="flex flex-col justify-between gap-4 border-b border-slate-150/40 dark:border-slate-800 bg-[#006b5f]/5 dark:bg-slate-950/20 p-5 md:flex-row md:items-center">
                        <div className="flex flex-wrap gap-2">
                            {(['all', 'due', 'learned', 'favorite'] as const).map((item) => (
                                <button
                                    key={item}
                                    onClick={() => setFilter(item)}
                                    className={`rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                                        filter === item
                                            ? 'bg-[#006b5f] text-white shadow-lg shadow-[#006b5f]/25'
                                             : 'border border-[#006b5f]/15 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-500 dark:text-slate-400 hover:bg-[#006b5f]/5 hover:text-[#006b5f]'
                                    }`}
                                >
                                    {item === 'all' ? 'Tất cả' : item === 'due' ? 'Chưa thuộc' : item === 'learned' ? 'Đã thuộc' : 'Yêu thích'}
                                </button>
                            ))}
                        </div>
                        <div className="relative w-full md:w-80">
                            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                            <input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Tìm kiếm từ vựng, pinyin, Việt..."
                                className="w-full rounded-xl border border-[#006b5f]/15 dark:border-slate-800 bg-white dark:bg-slate-950 py-3 pl-11 pr-4 text-xs font-semibold outline-none focus:border-[#006b5f] focus:ring-1 focus:ring-[#006b5f] text-slate-800 dark:text-slate-200"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-slate-150/40 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                <tr>
                                    <th className="px-6 py-4">Từ vựng (Hanzi)</th>
                                    <th className="px-6 py-4">Pinyin</th>
                                    <th className="px-6 py-4">Giải nghĩa Việt</th>
                                    <th className="px-6 py-4">Nguồn gốc</th>
                                    <th className="px-6 py-4">Phân loại HSK</th>
                                    <th className="px-6 py-4 text-right">Tương tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                                {filteredWords.map((word) => (
                                    <tr key={word.id} className="group transition-colors hover:bg-[#006b5f]/5 dark:hover:bg-slate-800/10">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <span className="chinese-text text-2xl font-black text-[#006b5f] dark:text-[#006b5f]/90">{word.word}</span>
                                                {word.isFavorite && <Star className="h-4 w-4 fill-amber-400 text-amber-400" />}
                                                {word.learned && (
                                                    <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/40 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 border border-emerald-200/20">
                                                        ĐÃ THUỘC
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-mono font-bold text-slate-500 dark:text-slate-400 text-xs">/{word.pinyin || '-'}/</td>
                                        <td className="max-w-md px-6 py-4">
                                            <p className="font-bold text-slate-800 dark:text-slate-200 text-xs leading-relaxed">{word.translation}</p>
                                            {word.context && <p className="mt-1 line-clamp-2 text-[10px] font-semibold text-slate-400 dark:text-slate-500 italic">"{word.context}"</p>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-1 rounded-lg border border-[#006b5f]/15 dark:border-slate-800 bg-[#006b5f]/5 dark:bg-[#006b5f]/10 px-2.5 py-1 text-[10px] font-bold text-[#006b5f] dark:text-[#006b5f]/90">
                                                <FileText className="h-3 w-3" />
                                                {word.sourceFile || word.topic || 'Tra cứu rời'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {word.hskLevel && (
                                                    <span className={`rounded-lg px-2.5 py-1 text-[10px] font-black border shadow-sm ${
                                                        word.hskLevel <= 2
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100/50 dark:bg-emerald-950/30 dark:text-emerald-450 dark:border-emerald-900/30'
                                                            : word.hskLevel <= 4
                                                                ? 'bg-amber-50 text-amber-700 border-amber-100/50 dark:bg-amber-950/30 dark:text-amber-450 dark:border-amber-900/30'
                                                                : 'bg-red-50 text-red-700 border-red-100/50 dark:bg-red-950/30 dark:text-red-450 dark:border-red-900/30'
                                                    }`}>                                                        {word.hskLevel === 7 ? 'HSK 7–9' : 'HSK ' + word.hskLevel}
                                                    </span>
                                                )}
                                                {word.domainTags?.slice(0, 2).map((tag) => (
                                                    <span key={tag} className="rounded-lg bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-150/40 px-2.5 py-1 text-[10px] font-bold text-cyan-700 dark:text-cyan-400">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => speak(word.word)}
                                                    className="rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 text-slate-500 dark:text-slate-400 hover:border-[#006b5f] hover:text-[#006b5f] dark:hover:bg-slate-800 active:scale-95 duration-100 cursor-pointer"
                                                    title="Nghe phát âm"
                                                >
                                                    <Volume2 className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => toggleFavorite(word.id)}
                                                    className={`rounded-xl border p-2.5 transition-all active:scale-95 duration-100 cursor-pointer ${
                                                        word.isFavorite
                                                            ? 'border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                                                            : 'border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:border-amber-300 hover:text-amber-600 hover:bg-amber-50/20'
                                                    }`}
                                                    title={word.isFavorite ? 'Bỏ yêu thích' : 'Yêu thích'}
                                                >
                                                    <Star className={`h-4 w-4 ${word.isFavorite ? 'fill-current' : ''}`} />
                                                </button>
                                                <button
                                                    onClick={() => markSavedWordLearned(word.id, !word.learned)}
                                                    className={`rounded-xl border p-2.5 transition-all active:scale-95 duration-100 cursor-pointer ${
                                                        word.learned
                                                            ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                                                            : 'border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50/20'
                                                    }`}
                                                    title={word.learned ? 'Đánh dấu chưa học' : 'Đánh dấu đã học'}
                                                >
                                                    <Check className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => removeSavedWord(word.id)}
                                                    className="rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 text-slate-400 hover:border-red-400 hover:text-red-600 dark:hover:bg-red-950/15 active:scale-95 duration-100 cursor-pointer"
                                                    title="Xóa khỏi thư viện"
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
                        <div className="p-16 text-center font-bold text-slate-400 dark:text-slate-500 space-y-2">
                            <Sparkles className="w-8 h-8 mx-auto text-slate-300 animate-pulse" />
                            <p className="text-xs">Chưa tìm thấy từ phù hợp.</p>
                            <p className="text-[10px] font-normal text-slate-400">Hãy bắt đầu đọc tài liệu để tích lũy thêm từ mới.</p>
                        </div>
                    )}
                </div>

                {/* Right Column: User Corrections & Known Words */}
                <aside className="flex flex-col gap-6">
                    <div className="glass-card rounded-[2rem] border border-white/40 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 p-6 shadow-lg">
                        <div className="mb-5 flex items-center justify-between">
                            <div>
                                <h2 className="font-display font-bold text-slate-900 dark:text-slate-100">Kho cá nhân theo chủ đề</h2>
                                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1">Tự phân nhóm theo tài liệu, domain hoặc topic.</p>
                            </div>
                            <Folder className="h-5 w-5 text-amber-600" />
                        </div>
                        <div className="space-y-3">
                            {topicGroups.slice(0, 6).map(([topic, count]) => (
                                <div key={topic} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white/95 p-4 text-sm font-bold dark:border-slate-800 dark:bg-slate-950/50">
                                    <span className="truncate text-slate-700 dark:text-slate-200">{topic}</span>
                                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">{count} từ</span>
                                </div>
                            ))}
                            {topicGroups.length === 0 && (
                                <p className="rounded-2xl bg-slate-50/50 p-5 text-center text-[11px] font-semibold text-slate-500 dark:bg-slate-950/10">
                                    Chưa có chủ đề nào.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Corrections Card */}
                    <div className="glass-card rounded-[2rem] border border-white/40 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 p-6 shadow-lg">
                        <div className="mb-5 flex items-center justify-between">
                            <div>
                                <h2 className="font-display font-bold text-slate-900 dark:text-slate-100">Hiệu đính bản dịch</h2>
                                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1">Các điều chỉnh nghĩa tiếng Việt ưu tiên do bạn tùy biến.</p>
                            </div>
                            <PencilLine className="h-5 w-5 text-[#006b5f] dark:text-[#006b5f]/90" />
                        </div>
                        <div className="space-y-4">
                            {userCorrections.map((correction) => (
                                <div key={correction.id} className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-950/50 p-4 shadow-sm relative overflow-hidden group">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="chinese-text text-xl font-black text-[#006b5f] dark:text-[#006b5f]/90">{correction.original_term}</p>
                                        <span className="rounded-lg bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-100/50 px-2 py-0.5 text-[9px] font-black text-cyan-700 dark:text-cyan-400">
                                            {correction.domain}
                                        </span>
                                    </div>
                                    <p className="mt-2 text-xs font-bold text-slate-800 dark:text-slate-200">{correction.user_translation}</p>
                                    {correction.context && <p className="mt-1 line-clamp-2 text-[10px] font-semibold text-slate-400 dark:text-slate-500">"{correction.context}"</p>}
                                </div>
                            ))}
                            {userCorrections.length === 0 && (
                                <p className="rounded-2xl bg-slate-50/50 dark:bg-slate-950/10 p-5 text-[11px] font-semibold text-slate-500 text-center">
                                    Chưa có bản hiệu đính nghĩa Việt. Bạn có thể thay đổi nghĩa tại bảng dịch Reader để lưu lại.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Known Words Card */}
                    <div className="glass-card rounded-[2rem] border border-white/40 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 p-6 shadow-lg">
                        <div className="mb-5">
                            <h2 className="font-display font-bold text-slate-900 dark:text-slate-100">Các từ đã biết (Known)</h2>
                            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1">Hệ thống sẽ tự động lọc bớt phiên âm pinyin cho các từ đã thuộc này.</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {knownWords.map((word) => (
                                <span key={word.id} className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100/30 px-3 py-1.5 text-xs font-black text-emerald-700 dark:text-emerald-400 shadow-sm transition-all hover:scale-[1.03] cursor-default">
                                    {word.word}
                                </span>
                            ))}
                            {knownWords.length === 0 && (
                                <p className="rounded-2xl bg-slate-50/50 dark:bg-slate-950/10 p-5 text-[11px] font-semibold text-slate-500 text-center w-full">
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
