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
} from 'lucide-react'
import { useStore } from '@/store/useStore'

function hskBuckets(savedWords: ReturnType<typeof useStore.getState>['savedWords']) {
    const buckets = [
        { label: 'HSK 1-3', count: 0, color: 'bg-emerald-500' },
        { label: 'HSK 4-6', count: 0, color: 'bg-amber-500' },
        { label: 'HSK 7-9', count: 0, color: 'bg-rose-500' },
        { label: 'Ngoài HSK', count: 0, color: 'bg-slate-400' },
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
    const { savedWords, documents, annotations, reviewItems, learningProgress, setCurrentDocument } = useStore()
    const dueReviews = reviewItems.filter((item) => new Date(item.due_at).getTime() <= Date.now())
    const buckets = hskBuckets(savedWords)
    const maxBucket = Math.max(1, ...buckets.map((bucket) => bucket.count))

    const stats = [
        { icon: FileText, label: 'Tổng tài liệu', value: documents.length, sub: 'PDF/DOCX/TXT', color: 'bg-teal-50 text-teal-600 border-teal-100' },
        { icon: BookMarked, label: 'Từ đã lưu', value: savedWords.length, sub: `${annotations.length} annotation`, color: 'bg-cyan-50 text-cyan-600 border-cyan-100' },
        { icon: Layers, label: 'Flashcards', value: reviewItems.length, sub: `${dueReviews.length} cần ôn`, color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
        { icon: Target, label: 'Mục tiêu ngày', value: `${learningProgress.todayProgress}/${learningProgress.dailyGoal}`, sub: `${learningProgress.streak} ngày streak`, color: 'bg-amber-50 text-amber-700 border-amber-100' },
    ]

    return (
        <div className="flex min-h-full flex-col gap-6 pb-8">
            <section className="glass custom-shadow overflow-hidden rounded-3xl border border-white p-6">
                <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
                    <div className="flex items-start gap-4">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-700 text-white shadow-lg shadow-teal-500/20">
                            <Activity className="h-8 w-8" />
                        </div>
                        <div>
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-teal-700">
                                    Offline-first MVP 0.1
                                </span>
                                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-amber-700">
                                    FastAPI + SQLite
                                </span>
                            </div>
                            <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
                                Chinese Context Reader
                            </h1>
                            <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-slate-500">
                                Đọc PDF có text layer, chọn từ/cụm trong ngữ cảnh, tra nghĩa Việt, lưu annotation và tạo review queue.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <NavLink
                            to="/upload"
                            className="flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-black text-white custom-shadow hover:bg-teal-700"
                        >
                            <Upload className="h-4 w-4" />
                            Tải tài liệu
                        </NavLink>
                        <NavLink
                            to="/reader"
                            className="flex items-center gap-2 rounded-xl border border-teal-100 bg-white px-5 py-3 text-sm font-black text-teal-700 hover:bg-teal-50"
                        >
                            <FileText className="h-4 w-4" />
                            Mở Reader
                        </NavLink>
                    </div>
                </div>
            </section>

            <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
                {stats.map((stat) => (
                    <div key={stat.label} className="custom-shadow rounded-2xl border border-teal-100 bg-white p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-black uppercase tracking-wider text-slate-400">{stat.label}</p>
                                <div className="mt-2 flex items-center gap-2">
                                    <h2 className="text-3xl font-black text-slate-900">{stat.value}</h2>
                                    {stat.label === 'Flashcards' && dueReviews.length > 0 && (
                                        <span className="relative flex h-2.5 w-2.5">
                                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                                            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                                        </span>
                                    )}
                                </div>
                                <p className="mt-1 text-xs font-semibold text-slate-500">{stat.sub}</p>
                            </div>
                            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl border ${stat.color}`}>
                                <stat.icon className="h-7 w-7" />
                            </div>
                        </div>
                    </div>
                ))}
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.45fr_0.9fr]">
                <div className="custom-shadow overflow-hidden rounded-2xl border border-teal-100 bg-white">
                    <div className="flex flex-col justify-between gap-3 border-b border-teal-100 bg-teal-50/40 p-4 md:flex-row md:items-center">
                        <div>
                            <h2 className="text-lg font-black text-slate-900">Tệp của tôi</h2>
                            <p className="text-xs font-semibold text-slate-500">Mở tài liệu để tiếp tục đọc và phân tích selection.</p>
                        </div>
                        <div className="relative w-full md:w-72">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                placeholder="Tìm kiếm tệp..."
                                className="w-full rounded-lg border border-teal-100 bg-white py-2 pl-9 pr-3 text-sm font-semibold outline-none focus:border-teal-400"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-teal-100 bg-slate-50/70 text-xs font-black uppercase tracking-wider text-slate-400">
                                <tr>
                                    <th className="px-6 py-4">Tên tệp</th>
                                    <th className="px-6 py-4">Ngày tải lên</th>
                                    <th className="px-6 py-4">Loại</th>
                                    <th className="px-6 py-4">Tiến độ</th>
                                    <th className="px-6 py-4 text-right">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-teal-50">
                                {documents.map((document) => (
                                    <tr key={document.id} className="group transition-colors hover:bg-teal-50/30">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-teal-100 bg-teal-50 text-teal-600">
                                                    <FileText className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800">{document.title}</p>
                                                    <p className="text-xs font-semibold text-slate-400">
                                                        {document.sentences.length || 'N'} câu đã index
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-semibold text-slate-500">
                                            {new Date(document.uploadedAt).toLocaleDateString('vi-VN')}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span
                                                className={`inline-flex rounded-md border px-2 py-1 text-[10px] font-black uppercase tracking-wider ${
                                                    document.type === 'pdf'
                                                        ? 'border-amber-200 bg-amber-100 text-amber-700'
                                                        : 'border-slate-200 bg-slate-100 text-slate-700'
                                                }`}
                                            >
                                                {document.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-100">
                                                <div className="h-full rounded-full bg-teal-500" style={{ width: `${document.readingProgress}%` }} />
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <NavLink
                                                to="/reader"
                                                onClick={() => setCurrentDocument(document)}
                                                className="rounded-lg bg-teal-50 px-3 py-2 text-xs font-black text-teal-700 hover:bg-teal-100"
                                            >
                                                Đọc & dịch
                                            </NavLink>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="flex flex-col gap-6">
                    <div className="custom-shadow rounded-2xl border border-teal-100 bg-white p-6">
                        <div className="mb-5 flex items-center justify-between">
                            <div>
                                <h2 className="font-black text-slate-900">Phân bố HSK</h2>
                                <p className="text-xs font-semibold text-slate-500">Tính từ vocabulary đã lưu.</p>
                            </div>
                            <TrendingUp className="h-5 w-5 text-teal-700" />
                        </div>
                        <div className="space-y-4">
                            {buckets.map((bucket) => (
                                <div key={bucket.label}>
                                    <div className="mb-1 flex justify-between text-xs font-bold text-slate-500">
                                        <span>{bucket.label}</span>
                                        <span>{bucket.count}</span>
                                    </div>
                                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                        <div className={`h-full rounded-full ${bucket.color}`} style={{ width: `${(bucket.count / maxBucket) * 100}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="custom-shadow rounded-2xl border border-teal-100 bg-white p-6">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="font-black text-slate-900">Hoạt động gần đây</h2>
                            <CalendarDays className="h-5 w-5 text-teal-700" />
                        </div>
                        <div className="space-y-3 border-l-2 border-teal-100 pl-5">
                            {annotations.slice(0, 4).map((annotation) => (
                                <div key={annotation.id} className="relative rounded-xl p-2 hover:bg-slate-50">
                                    <span className="absolute -left-[27px] top-4 h-3 w-3 rounded-full bg-teal-500 ring-4 ring-white" />
                                    <p className="font-bold text-slate-800">Lưu "{annotation.selected_text}"</p>
                                    <p className="text-xs font-semibold text-slate-500">{annotation.explanation_vi || 'Annotation mới'}</p>
                                </div>
                            ))}
                            {annotations.length === 0 && (
                                <div className="relative rounded-xl p-2">
                                    <span className="absolute -left-[27px] top-4 h-3 w-3 rounded-full bg-slate-300 ring-4 ring-white" />
                                    <p className="font-bold text-slate-800">Chưa có annotation</p>
                                    <p className="text-xs font-semibold text-slate-500">Mở Reader và lưu từ đầu tiên.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}
