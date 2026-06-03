import { useState, useRef, useMemo, type ChangeEvent, type FormEvent } from 'react'
import {
    Activity, ArrowRightLeft, BookMarked, BookOpen, Calendar, CheckCircle2, ChevronRight, CreditCard,
    FilePlus2, FileText, Layers, Languages, LayoutDashboard, Loader2, Mic, MoreVertical, Search,
    Target, Trash2, Trophy, Upload, User, Volume2, X, type LucideIcon,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import type { DocumentContent, FlashCard, LearningProgress, SavedWord, TranslationResult } from '@/types'
import { StatCard, AchievementRow, EmptyState, PasteDocumentModal, PronunciationRecorder } from './components'
import { documentTypeLabel, typeBadgeClass, formatDate, resolveWordSource, speakChinese, scoreSample, type UploadingRow, type DashboardFlashCard, type PracticeSentence, type WordGroup, defaultPracticeSentences } from '../dashboardUtils'

export function FilesTab({
    documents,
    totalDocuments,
    savedWordsCount,
    dueReviewsCount,
    uploadingRows,
    fileSearch,
    setFileSearch,
    dragActive,
    translatingDocumentId,
    onDrag,
    onDrop,
    onUploadClick,
    onPasteClick,
    onOpenDocument,
    onTranslateDocument,
    onDeleteDocument,
}: {
    documents: DocumentContent[]
    totalDocuments: number
    savedWordsCount: number
    dueReviewsCount: number
    uploadingRows: UploadingRow[]
    fileSearch: string
    setFileSearch: (value: string) => void
    dragActive: boolean
    translatingDocumentId: string | null
    onDrag: (event: React.DragEvent<HTMLDivElement>) => void
    onDrop: (event: React.DragEvent<HTMLDivElement>) => void
    onUploadClick: () => void
    onPasteClick: () => void
    onOpenDocument: (document: DocumentContent) => void
    onTranslateDocument: (document: DocumentContent) => void
    onDeleteDocument: (document: DocumentContent) => void
}) {
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)

    return (
        <>
            <div className="flex flex-col justify-between gap-5 rounded-2xl border border-teal-100 bg-white p-6 custom-shadow dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center">
                <div>
                    <h1 className="mb-1 text-2xl font-black text-slate-900 dark:text-slate-100">Tệp của tôi</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Quản lý, tải lên và mở tài liệu tiếng Trung trong reader.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={onPasteClick}
                        className="inline-flex items-center gap-2 rounded-xl border border-teal-100 bg-teal-50 px-4 py-2.5 text-sm font-bold text-teal-700 transition-colors hover:bg-teal-100 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-300"
                    >
                        <FilePlus2 className="h-4 w-4" />
                        Nhập văn bản
                    </button>
                    <button
                        onClick={onUploadClick}
                        className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-teal-700"
                    >
                        <Upload className="h-4 w-4" />
                        Tải tệp lên
                    </button>
                </div>
            </div>

            <div
                onDragEnter={onDrag}
                onDragOver={onDrag}
                onDragLeave={onDrag}
                onDrop={onDrop}
                onClick={onUploadClick}
                className={`flex min-h-[150px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-teal-50/40 p-6 text-center transition-colors dark:bg-teal-950/10 ${
                    dragActive ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/30' : 'border-teal-200 hover:border-teal-400 dark:border-slate-700'
                }`}
            >
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-teal-600 shadow-sm dark:bg-slate-900 dark:text-teal-300">
                    <Upload className="h-6 w-6" />
                </div>
                <h3 className="mb-1 text-sm font-black text-slate-800 dark:text-slate-100">Kéo thả tài liệu vào đây</h3>
                <p className="text-xs font-medium text-slate-500">PDF, DOCX, TXT và ảnh rõ nét. File sẽ xuất hiện trong bảng với trạng thái đang xử lý.</p>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                <StatCard title="Tổng số tệp" value={String(totalDocuments)} icon={FileText} color="bg-teal-50 border-teal-100 text-teal-600" />
                <StatCard title="Từ vựng đã lưu" value={String(savedWordsCount)} icon={BookMarked} color="bg-cyan-50 border-cyan-100 text-cyan-600" />
                <StatCard title="Flashcards cần ôn" value={String(dueReviewsCount)} icon={Layers} color="bg-emerald-50 border-emerald-100 text-emerald-600" alert={dueReviewsCount > 0} />
            </div>

            <div className="overflow-hidden rounded-2xl border border-teal-100 bg-white custom-shadow dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-col justify-between gap-3 border-b border-teal-100 bg-teal-50/30 p-4 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center">
                    <div className="relative w-full sm:max-w-sm">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={fileSearch}
                            onChange={(event) => setFileSearch(event.target.value)}
                            placeholder="Tìm kiếm tệp..."
                            className="w-full rounded-lg border border-teal-100 bg-white py-2 pl-9 pr-4 text-sm font-medium text-slate-700 outline-none transition-colors focus:border-teal-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                        />
                    </div>
                    {uploadingRows.length > 0 && <p className="text-xs font-bold text-teal-700 dark:text-teal-300">{uploadingRows.length} tệp đang xử lý</p>}
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[860px] text-left text-sm">
                        <thead className="border-b border-teal-100 bg-slate-50/70 text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:border-slate-800 dark:bg-slate-950/60">
                            <tr>
                                <th className="px-6 py-4">Tên tệp</th>
                                <th className="px-6 py-4">Ngày tải lên</th>
                                <th className="px-6 py-4">Trạng thái</th>
                                <th className="px-6 py-4">Loại</th>
                                <th className="px-6 py-4 text-right">Hành động</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-teal-50 dark:divide-slate-800">
                            {uploadingRows.map((row) => (
                                <tr key={row.id} className="bg-teal-50/30 dark:bg-teal-950/10">
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-teal-100 bg-white text-teal-600 dark:border-slate-800 dark:bg-slate-950">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 dark:text-slate-100">{row.name}</p>
                                                <p className="text-xs font-medium text-teal-700 dark:text-teal-300">Đang tải tệp lên Hanora, vui lòng đợi...</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-slate-500">{formatDate(row.startedAt)}</td>
                                    <td className="px-6 py-5">
                                        <span className="inline-flex items-center rounded-full bg-cyan-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-700">Đang xử lý</span>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className={`inline-flex items-center rounded-md border px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${typeBadgeClass(row.type)}`}>{row.type}</span>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <Loader2 className="ml-auto h-4 w-4 animate-spin text-teal-500" />
                                    </td>
                                </tr>
                            ))}

                            {documents.map((document) => {
                                const type = documentTypeLabel(document.type)
                                const isTranslating = translatingDocumentId === document.id
                                return (
                                    <tr key={document.id} className="group transition-colors hover:bg-teal-50/30 dark:hover:bg-slate-800/50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-teal-100 bg-teal-50 text-teal-600 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-300">
                                                    <FileText className="h-4 w-4" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="truncate font-bold text-slate-800 dark:text-slate-100">{document.title}</p>
                                                    <p className="text-xs text-slate-400">{document.sentences.length || 0} câu • {Math.round(document.readingProgress || 0)}% đã đọc</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-500">{formatDate(document.uploadedAt)}</td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700">
                                                <CheckCircle2 className="mr-1 h-3 w-3" />
                                                Hoàn thành
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center rounded-md border px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${typeBadgeClass(type)}`}>
                                                {type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => onTranslateDocument(document)}
                                                    disabled={isTranslating}
                                                    className="inline-flex items-center gap-1.5 rounded-lg bg-amber-100 px-2.5 py-1.5 text-[11px] font-black text-amber-700 transition-colors hover:bg-amber-200 disabled:opacity-60"
                                                >
                                                    {isTranslating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRightLeft className="h-3.5 w-3.5" />}
                                                    Dịch Toàn Bộ
                                                </button>
                                                <button
                                                    onClick={() => onOpenDocument(document)}
                                                    className="rounded-lg bg-teal-50 px-2.5 py-1.5 text-[11px] font-black text-teal-700 transition-colors hover:bg-teal-100 dark:bg-teal-950/40 dark:text-teal-300"
                                                >
                                                    Đọc & Dịch
                                                </button>
                                                <div className="relative">
                                                    <button
                                                        onClick={() => setOpenDropdownId(openDropdownId === document.id ? null : document.id)}
                                                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                                                    >
                                                        <MoreVertical className="h-5 w-5" />
                                                    </button>
                                                    {openDropdownId === document.id && (
                                                        <>
                                                            <button className="fixed inset-0 z-40 cursor-default" onClick={() => setOpenDropdownId(null)} />
                                                            <div className="absolute right-0 z-50 mt-2 w-44 rounded-lg border border-slate-100 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-950">
                                                                <button
                                                                    onClick={() => {
                                                                        setOpenDropdownId(null)
                                                                        onDeleteDocument(document)
                                                                    }}
                                                                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-bold text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-950/20"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                    Xóa tệp
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}

                            {!uploadingRows.length && !documents.length && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-14 text-center">
                                        <div className="mx-auto flex max-w-sm flex-col items-center">
                                            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-950">
                                                <FileText className="h-7 w-7" />
                                            </div>
                                            <p className="font-bold text-slate-700 dark:text-slate-200">Chưa có tài liệu phù hợp</p>
                                            <p className="mt-1 text-sm text-slate-500">Tải file mới hoặc đổi từ khóa tìm kiếm.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    )
}
