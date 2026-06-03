import { useState, type FormEvent } from 'react'
import { type LucideIcon, FileText, CheckCircle2, Loader2, Search, Trash2, X, MoreVertical, Mic } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

export function AchievementRow({ icon: Icon, label, value, color }: { icon: LucideIcon; label: string; value: string; color: string }) {
    return (
        <div className="flex items-center gap-4">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl border ${color}`}>
                <Icon className="h-6 w-6" />
            </div>
            <div>
                <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{value}</p>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p>
            </div>
        </div>
    )
}

export function StatCard({ title, value, icon: Icon, color, alert }: { title: string; value: string; icon: LucideIcon; color: string; alert?: boolean }) {
    return (
        <div className="flex items-center justify-between rounded-2xl border border-teal-100 bg-white p-5 custom-shadow dark:border-slate-800 dark:bg-slate-900">
            <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{title}</p>
                <div className="flex items-center gap-2">
                    <h4 className="text-3xl font-black text-slate-800 dark:text-slate-100">{value}</h4>
                    {alert && (
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                        </span>
                    )}
                </div>
            </div>
            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl border ${color}`}>
                <Icon className="h-7 w-7" />
            </div>
        </div>
    )
}

export function EmptyState({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
    return (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-teal-100 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 dark:bg-slate-800 dark:text-teal-400">
                <Icon className="h-8 w-8" />
            </div>
            <h3 className="mb-2 text-lg font-black text-slate-800 dark:text-slate-100">{title}</h3>
            <p className="max-w-xs text-sm font-medium text-slate-500 dark:text-slate-400">{description}</p>
        </div>
    )
}

export function PasteDocumentModal({
    visible,
    title,
    content,
    setTitle,
    setContent,
    onClose,
    onSubmit,
}: {
    visible: boolean
    title: string
    content: string
    setTitle: (v: string) => void
    setContent: (v: string) => void
    onClose: () => void
    onSubmit: (e: FormEvent) => void
}) {
    if (!visible) return null
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm dark:bg-slate-900/60">
            <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
                <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-800">
                    <h3 className="font-bold text-slate-800 dark:text-slate-100">Nhập văn bản mới</h3>
                    <button onClick={onClose} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800">
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <form onSubmit={onSubmit} className="p-4">
                    <div className="space-y-4">
                        <div>
                            <label className="mb-1.5 block text-xs font-bold text-slate-500">Tiêu đề (sẽ được lưu dưới dạng .txt)</label>
                            <input autoFocus type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: Bài báo khoa học hôm nay..." className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-teal-500 focus:bg-white dark:border-slate-700 dark:bg-slate-950/50" />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-xs font-bold text-slate-500">Nội dung tiếng Trung</label>
                            <textarea rows={8} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Dán nội dung vào đây..." className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-teal-500 focus:bg-white dark:border-slate-700 dark:bg-slate-950/50" />
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
                            Hủy
                        </button>
                        <button type="submit" disabled={!title.trim() || !content.trim()} className="rounded-xl bg-teal-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-teal-700 disabled:opacity-50">
                            Tạo tài liệu
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export function PronunciationRecorder({ score, isRecording, onRecord, compact }: { score: number | null; isRecording: boolean; onRecord: () => void; compact?: boolean }) {
    if (compact) {
        return (
            <button
                onClick={(e) => {
                    e.stopPropagation()
                    onRecord()
                }}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all ${
                    isRecording
                        ? 'animate-pulse bg-red-100 text-red-600 dark:bg-red-900/30'
                        : score !== null
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30'
                        : 'border border-slate-200 bg-white text-slate-400 hover:border-teal-200 hover:bg-teal-50 hover:text-teal-600 dark:border-slate-700 dark:bg-slate-800'
                }`}
            >
                <Mic className="h-4 w-4" />
            </button>
        )
    }

    return (
        <button
            onClick={onRecord}
            className={`flex w-full items-center justify-between rounded-xl p-4 transition-all sm:w-auto ${
                isRecording
                    ? 'animate-pulse border border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-900/20'
                    : score !== null
                    ? 'border border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-900/20'
                    : 'border border-slate-200 bg-white hover:border-teal-300 hover:bg-teal-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-teal-800/50 dark:hover:bg-teal-950/30'
            }`}
        >
            <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    isRecording ? 'bg-red-200 dark:bg-red-800' : score !== null ? 'bg-emerald-200 dark:bg-emerald-800' : 'bg-slate-100 dark:bg-slate-800'
                }`}>
                    <Mic className={`h-5 w-5 ${isRecording ? 'text-red-700 dark:text-red-300' : score !== null ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400'}`} />
                </div>
                <div className="text-left">
                    <h5 className={`font-bold ${isRecording ? 'text-red-700 dark:text-red-300' : score !== null ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-200'}`}>
                        {isRecording ? 'Đang ghi âm...' : 'Đọc câu này'}
                    </h5>
                    <p className={`text-xs ${isRecording ? 'text-red-600 dark:text-red-400' : score !== null ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
                        {isRecording ? 'Nhấn để dừng' : score !== null ? 'Nhấn để đọc lại' : 'Đánh giá AI'}
                    </p>
                </div>
            </div>
            {score !== null && !isRecording && (
                <div className="ml-6 flex h-10 w-10 items-center justify-center rounded-xl bg-white font-black text-emerald-600 shadow-sm dark:bg-slate-950 dark:text-emerald-400">
                    {score}
                </div>
            )}
        </button>
    )
}
