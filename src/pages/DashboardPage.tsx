import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
    Activity,
    BookMarked,
    CalendarDays,
    FileText,
    Layers,
    Search,
    Target,
    TrendingUp,
    Upload,
    Award,
    Clock,
    Percent,
    Zap,
} from 'lucide-react'
import { useStore } from '@/store/useStore'

function hskBuckets(savedWords: ReturnType<typeof useStore.getState>['savedWords']) {
    const buckets = [
        { label: 'HSK 1-3', count: 0, color: 'bg-emerald-500 shadow-emerald-500/20' },
        { label: 'HSK 4-6', count: 0, color: 'bg-amber-500 shadow-amber-500/20' },
        { label: 'HSK 7-9', count: 0, color: 'bg-rose-500 shadow-rose-500/20' },
        { label: 'Ngoài HSK', count: 0, color: 'bg-slate-400 dark:bg-slate-600 shadow-slate-400/20' },
    ]

    savedWords.forEach((word) => {
        const level = word.hskLevel
        if (!level) buckets[3].count += 1
        else if (level <= 3) buckets[0].count += 1
        else if (level <= 6) buckets[1].count += 1
        else buckets[2].count += 1
    })

    return buckets
}

export default function DashboardPage() {
    const { savedWords, documents, annotations, reviewItems, learningProgress, setCurrentDocument, settings } = useStore()
    const [searchQuery, setSearchQuery] = useState('')

    const dueReviews = reviewItems.filter((item) => new Date(item.due_at).getTime() <= Date.now())
    const buckets = hskBuckets(savedWords)
    const maxBucket = Math.max(1, ...buckets.map((bucket) => bucket.count))

    // Advanced calculated stats
    const totalSentences = documents.reduce((sum, doc) => sum + (doc.sentences?.length || 0), 0)
    const estimatedMinutesRead = Math.round(totalSentences * 0.15 + savedWords.length * 0.5)

    // Streak visual calendar mapping (last 7 days)
    const weekdaysVi = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
    const todayIndex = new Date().getDay()
    const streakDays = Array.from({ length: 7 }, (_, i) => {
        const index = (todayIndex - 6 + i + 7) % 7
        const isActive = i < learningProgress.streak || (i === 6 && learningProgress.todayProgress > 0)
        return {
            label: weekdaysVi[index],
            active: isActive,
            isToday: i === 6,
        }
    })

    // SVG Circular Progress config
    const targetProgress = learningProgress.dailyGoal > 0 ? learningProgress.todayProgress / learningProgress.dailyGoal : 0
    const percentage = Math.min(100, Math.round(targetProgress * 100))
    const radius = 36
    const circumference = 2 * Math.PI * radius
    const strokeDashoffset = circumference - (percentage / 100) * circumference

    // Filter documents
    const filteredDocs = documents.filter((doc) =>
        doc.title.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const stats = [
        {
            icon: FileText,
            label: 'Tổng tài liệu',
            value: documents.length,
            sub: `${totalSentences} câu đã index`,
            color: 'bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 border-teal-100 dark:border-teal-900/40'
        },
        {
            icon: BookMarked,
            label: 'Từ vựng đã lưu',
            value: savedWords.length,
            sub: `${annotations.length} annotations`,
            color: 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 border-cyan-100 dark:border-cyan-900/40'
        },
        {
            icon: Layers,
            label: 'Thẻ Review SRS',
            value: reviewItems.length,
            sub: `${dueReviews.length} cần học hôm nay`,
            color: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/40'
        },
        {
            icon: Clock,
            label: 'Thời gian học ước tính',
            value: estimatedMinutesRead > 60 ? `${(estimatedMinutesRead / 60).toFixed(1)}h` : `${estimatedMinutesRead}m`,
            sub: 'Đọc & tra cứu tích lũy',
            color: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900/40'
        },
    ]

    return (
        <div className="flex min-h-full flex-col gap-6 pb-8 transition-colors duration-300">
            {/* Top Welcome Panel */}
            <section className="relative overflow-hidden rounded-3xl border border-white/60 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 p-6 custom-shadow backdrop-blur-md">
                <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-teal-500/10 blur-3xl dark:bg-teal-400/5" />
                <div className="absolute -left-24 -bottom-24 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl dark:bg-cyan-400/5" />

                <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
                    <div className="flex items-start gap-4">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-lg shadow-teal-500/20">
                            <Activity className="h-8 w-8 animate-pulse" />
                        </div>
                        <div>
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-teal-50 dark:bg-teal-950/50 px-3 py-1 text-xs font-black uppercase tracking-wider text-teal-700 dark:text-teal-400 border border-teal-100/50 dark:border-teal-900/30">
                                    Offline-First Pro
                                </span>
                                <span className="rounded-full bg-cyan-50 dark:bg-cyan-950/50 px-3 py-1 text-xs font-black uppercase tracking-wider text-cyan-700 dark:text-cyan-400 border border-cyan-100/50 dark:border-cyan-900/30">
                                    FSRS Enabled
                                </span>
                            </div>
                            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100 md:text-4xl">
                                Chinese Context Reader
                            </h1>
                            <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-slate-500 dark:text-slate-400">
                                Phân tích ngữ cảnh tiếng Trung thông minh, học tập ngắt quãng FSRS, tra từ điển song song và đồng bộ hóa đám mây cao cấp.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <NavLink
                            to="/upload"
                            className="flex items-center gap-2 rounded-xl bg-teal-600 dark:bg-teal-600 hover:bg-teal-700 dark:hover:bg-teal-500 px-5 py-3 text-sm font-black text-white custom-shadow border border-teal-500/20 shadow-md shadow-teal-600/10 hover:scale-[1.02] transition-all"
                        >
                            <Upload className="h-4 w-4" />
                            Tải tài liệu
                        </NavLink>
                        <NavLink
                            to="/reader"
                            className="flex items-center gap-2 rounded-xl border border-teal-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-teal-50 dark:hover:bg-slate-800 px-5 py-3 text-sm font-black text-teal-700 dark:text-teal-400 hover:scale-[1.02] transition-all"
                        >
                            <FileText className="h-4 w-4" />
                            Mở Reader
                        </NavLink>
                    </div>
                </div>
            </section>

            {/* Core Stats Section */}
            <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
                {stats.map((stat) => (
                    <div key={stat.label} className="custom-shadow rounded-2xl border border-teal-100/40 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/50 p-6 backdrop-blur-sm transition-all hover:scale-[1.02] duration-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">{stat.label}</p>
                                <div className="mt-2 flex items-center gap-2">
                                    <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100">{stat.value}</h2>
                                    {stat.label === 'Thẻ Review SRS' && dueReviews.length > 0 && (
                                        <span className="relative flex h-2.5 w-2.5">
                                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                                            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                                        </span>
                                    )}
                                </div>
                                <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{stat.sub}</p>
                            </div>
                            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl border shadow-sm ${stat.color}`}>
                                <stat.icon className="h-7 w-7" />
                            </div>
                        </div>
                    </div>
                ))}
            </section>

            {/* Advanced Charts Grid */}
            <section className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
                {/* Left Column: My Documents */}
                <div className="custom-shadow overflow-hidden rounded-2xl border border-teal-100/40 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/50 backdrop-blur-sm">
                    <div className="flex flex-col justify-between gap-3 border-b border-teal-100/40 dark:border-slate-800/60 bg-teal-50/20 dark:bg-slate-950/20 p-5 md:flex-row md:items-center">
                        <div>
                            <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">Tài liệu của tôi</h2>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Chọn hoặc tải tài liệu để bắt đầu phân tích câu chữ.</p>
                        </div>
                        <div className="relative w-full md:w-72">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                            <input
                                placeholder="Tìm kiếm tệp..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full rounded-xl border border-teal-100/50 dark:border-slate-800 bg-white dark:bg-slate-900 py-2.5 pl-9 pr-4 text-sm font-semibold outline-none focus:border-teal-400 dark:focus:border-teal-500 text-slate-800 dark:text-slate-200"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-teal-100/30 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                <tr>
                                    <th className="px-6 py-4">Tên tệp</th>
                                    <th className="px-6 py-4">Ngày tải lên</th>
                                    <th className="px-6 py-4">Loại</th>
                                    <th className="px-6 py-4">Tiến độ</th>
                                    <th className="px-6 py-4 text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-teal-50/50 dark:divide-slate-800/50">
                                {filteredDocs.map((document) => (
                                    <tr key={document.id} className="group transition-colors hover:bg-teal-50/20 dark:hover:bg-slate-800/10">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-teal-100/40 dark:border-slate-800 bg-teal-50/50 dark:bg-slate-800/40 text-teal-600 dark:text-teal-400">
                                                    <FileText className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800 dark:text-slate-200">{document.title}</p>
                                                    <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                                                        {document.sentences?.length || 0} câu đã phân đoạn
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-semibold text-slate-500 dark:text-slate-400">
                                            {new Date(document.uploadedAt).toLocaleDateString('vi-VN')}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span
                                                className={`inline-flex rounded-md border px-2 py-1 text-[10px] font-black uppercase tracking-wider ${
                                                    document.type === 'pdf'
                                                        ? 'border-amber-200/50 bg-amber-50/50 text-amber-700 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-400'
                                                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300'
                                                }`}
                                            >
                                                {document.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                                    <div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 shadow-sm" style={{ width: `${document.readingProgress}%` }} />
                                                </div>
                                                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{document.readingProgress}%</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <NavLink
                                                to="/reader"
                                                onClick={() => setCurrentDocument(document)}
                                                className="rounded-lg bg-teal-50 dark:bg-teal-950/40 px-3 py-2 text-xs font-black text-teal-700 dark:text-teal-400 hover:bg-teal-100 dark:hover:bg-teal-900/40 border border-teal-100/40 dark:border-teal-900/30 hover:scale-[1.02] inline-block transition-all"
                                            >
                                                Mở đọc
                                            </NavLink>
                                        </td>
                                    </tr>
                                ))}
                                {filteredDocs.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center font-bold text-slate-400 dark:text-slate-500">
                                            Chưa có tài liệu nào phù hợp. Hãy tải file mới!
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right Column: Streak, Daily Goal Ring, HSK buckets */}
                <div className="flex flex-col gap-6">
                    {/* Visual Streak & SVG Daily Goal Gauge */}
                    <div className="custom-shadow rounded-2xl border border-teal-100/40 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/50 p-6 backdrop-blur-sm">
                        <h2 className="font-black text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                            <Target className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                            Tiến độ mục tiêu ngày
                        </h2>

                        <div className="flex flex-col sm:flex-row items-center gap-6 justify-around py-2">
                            {/* Circular SVG Gauge */}
                            <div className="relative flex items-center justify-center">
                                <svg className="h-28 w-28 transform -rotate-90">
                                    <circle
                                        cx="56"
                                        cy="56"
                                        r={radius}
                                        className="stroke-slate-100 dark:stroke-slate-800"
                                        strokeWidth="8"
                                        fill="transparent"
                                    />
                                    <circle
                                        cx="56"
                                        cy="56"
                                        r={radius}
                                        className="stroke-teal-500 transition-all duration-1000 ease-out"
                                        strokeWidth="8"
                                        fill="transparent"
                                        strokeDasharray={circumference}
                                        strokeDashoffset={strokeDashoffset}
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <div className="absolute flex flex-col items-center justify-center text-center">
                                    <span className="text-2xl font-black text-slate-800 dark:text-slate-100">{percentage}%</span>
                                    <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Hôm nay</span>
                                </div>
                            </div>

                            {/* Streak days visual map */}
                            <div className="flex-1 space-y-4">
                                <div className="rounded-xl bg-slate-50 dark:bg-slate-950/20 p-4 border border-slate-100 dark:border-slate-800/60">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-1.5">
                                            <Zap className="h-4 w-4 text-amber-500 animate-bounce" />
                                            <span className="text-xs font-black text-slate-800 dark:text-slate-200">Chuỗi học tập</span>
                                        </div>
                                        <span className="text-xs font-black text-amber-600 dark:text-amber-400">{learningProgress.streak} ngày streak</span>
                                    </div>

                                    <div className="flex justify-between items-center gap-1.5 mt-3">
                                        {streakDays.map((day, idx) => (
                                            <div key={idx} className="flex flex-col items-center gap-1">
                                                <div
                                                    className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                                                        day.active
                                                            ? 'bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-md shadow-emerald-500/10'
                                                            : day.isToday
                                                            ? 'border-2 border-teal-500 text-teal-600 dark:text-teal-400 dark:border-teal-500'
                                                            : 'bg-slate-200/60 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                                                    }`}
                                                >
                                                    {day.label}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* HSK Distribution */}
                    <div className="custom-shadow rounded-2xl border border-teal-100/40 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/50 p-6 backdrop-blur-sm">
                        <div className="mb-5 flex items-center justify-between">
                            <div>
                                <h2 className="font-black text-slate-900 dark:text-slate-100">Cơ cấu cấp độ HSK</h2>
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Dựa trên từ vựng đã lưu trong SQLite.</p>
                            </div>
                            <TrendingUp className="h-5 w-5 text-teal-700 dark:text-teal-400" />
                        </div>
                        <div className="space-y-4">
                            {buckets.map((bucket) => {
                                const percent = Math.round((bucket.count / Math.max(1, savedWords.length)) * 100)
                                return (
                                    <div key={bucket.label}>
                                        <div className="mb-1.5 flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                                            <span className="flex items-center gap-1.5">
                                                <span className={`h-2.5 w-2.5 rounded-full ${bucket.color}`} />
                                                {bucket.label}
                                            </span>
                                            <span className="font-black text-slate-800 dark:text-slate-200">
                                                {bucket.count} từ ({percent}%)
                                            </span>
                                        </div>
                                        <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                            <div
                                                className={`h-full rounded-full transition-all duration-1000 ${bucket.color}`}
                                                style={{ width: `${(bucket.count / maxBucket) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Recent Activities */}
                    <div className="custom-shadow rounded-2xl border border-teal-100/40 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/50 p-6 backdrop-blur-sm">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                <CalendarDays className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                                Hoạt động gần đây
                            </h2>
                        </div>
                        <div className="space-y-3.5 border-l-2 border-teal-100 dark:border-slate-800 pl-4">
                            {annotations.slice(0, 3).map((annotation) => (
                                <div key={annotation.id} className="relative rounded-xl p-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                    <span className="absolute -left-[23px] top-3.5 h-2.5 w-2.5 rounded-full bg-teal-500 ring-4 ring-white dark:ring-slate-900" />
                                    <p className="font-bold text-slate-850 dark:text-slate-200">Lưu từ "{annotation.selected_text}"</p>
                                    <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 truncate max-w-[260px]">
                                        {annotation.explanation_vi || annotation.selected_meaning_vi || 'Đã ghi nhớ nghĩa Việt'}
                                    </p>
                                </div>
                            ))}
                            {annotations.length === 0 && (
                                <div className="relative rounded-xl p-2 text-center text-slate-400 py-6">
                                    <Award className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                                    <p className="font-bold text-sm">Chưa có hoạt động</p>
                                    <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mt-1">Mở Reader, nhấp chọn từ bất kỳ để bắt đầu hành trình học.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}
