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

export function VocabularyTab({ groups, onRemoveWord, onSpeak }: { groups: WordGroup[]; onRemoveWord: (id: string) => void; onSpeak: (text: string) => void }) {
    const [selectedFile, setSelectedFile] = useState<string | null>(null)
    const [openDropdownWord, setOpenDropdownWord] = useState<string | null>(null)
    const activeGroup = selectedFile ? groups.find((group) => group.name === selectedFile) : null

    if (activeGroup) {
        return (
            <>
                <div className="flex flex-col justify-between gap-4 rounded-2xl border border-teal-100 bg-white p-6 custom-shadow dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center">
                    <div>
                        <button onClick={() => setSelectedFile(null)} className="mb-2 text-sm font-bold text-teal-600 hover:text-teal-700">
                            Quay lại danh sách tệp
                        </button>
                        <h1 className="mb-1 flex items-center gap-2 text-2xl font-black text-slate-900 dark:text-slate-100">
                            Từ vựng: {activeGroup.name}
                            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-black uppercase text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                                Experimental
                            </span>
                        </h1>
                        <p className="text-sm text-slate-500">Bạn đã lưu {activeGroup.words.length} từ từ nguồn này.</p>
                    </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-teal-100 bg-white custom-shadow dark:border-slate-800 dark:bg-slate-900">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[780px] text-left text-sm">
                            <thead className="border-b border-teal-100 bg-slate-50/70 text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:border-slate-800 dark:bg-slate-950">
                                <tr>
                                    <th className="px-6 py-4">Từ vựng</th>
                                    <th className="px-6 py-4">Pinyin</th>
                                    <th className="px-6 py-4">Nghĩa tiếng Việt</th>
                                    <th className="px-6 py-4">Ngày lưu</th>
                                    <th className="px-6 py-4" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-teal-50 dark:divide-slate-800">
                                {activeGroup.words.map((word) => (
                                    <tr key={word.id} className="transition-colors hover:bg-teal-50/30 dark:hover:bg-slate-800/50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg font-black text-teal-700 dark:text-teal-300">{word.word}</span>
                                                <button onClick={() => onSpeak(word.word)} className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-teal-50 hover:text-teal-600">
                                                    <Volume2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-500">{word.pinyin || '—'}</td>
                                        <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-100">{word.translation || 'Chưa có nghĩa'}</td>
                                        <td className="px-6 py-4 font-medium text-slate-500">{formatDate(word.createdAt)}</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="relative inline-flex">
                                                <button
                                                    onClick={() => setOpenDropdownWord(openDropdownWord === word.id ? null : word.id)}
                                                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                                                >
                                                    <MoreVertical className="h-5 w-5" />
                                                </button>
                                                {openDropdownWord === word.id && (
                                                    <>
                                                        <button className="fixed inset-0 z-40 cursor-default" onClick={() => setOpenDropdownWord(null)} />
                                                        <div className="absolute right-0 z-50 mt-8 w-40 rounded-lg border border-slate-100 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-950">
                                                            <button
                                                                onClick={() => {
                                                                    onRemoveWord(word.id)
                                                                    setOpenDropdownWord(null)
                                                                }}
                                                                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-bold text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-950/20"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                                Xóa từ
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </>
        )
    }

    return (
        <>
            <div className="rounded-2xl border border-teal-100 bg-white p-6 custom-shadow dark:border-slate-800 dark:bg-slate-900">
                <h1 className="mb-1 flex items-center gap-2 text-2xl font-black text-slate-900 dark:text-slate-100">
                    Từ vựng đã lưu
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-black uppercase text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                        Experimental
                    </span>
                </h1>
                <p className="text-sm text-slate-500">Chọn một nguồn tài liệu để xem danh sách từ đã lưu.</p>
            </div>

            {groups.length ? (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                    {groups.map((group) => (
                        <button
                            key={group.name}
                            onClick={() => setSelectedFile(group.name)}
                            className="group rounded-2xl border border-teal-100 bg-white p-5 text-left custom-shadow transition-colors hover:border-teal-300 dark:border-slate-800 dark:bg-slate-900"
                        >
                            <div className="mb-5 flex items-center justify-between gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-teal-100 bg-teal-50 text-teal-600 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-300">
                                    <BookMarked className="h-6 w-6" />
                                </div>
                                <ChevronRight className="h-5 w-5 text-slate-300 transition-transform group-hover:translate-x-1" />
                            </div>
                            <h3 className="mb-2 line-clamp-2 text-base font-black text-slate-800 dark:text-slate-100">{group.name}</h3>
                            <p className="text-sm font-medium text-slate-500">{group.words.length} từ vựng đã lưu</p>
                        </button>
                    ))}
                </div>
            ) : (
                <EmptyState icon={BookMarked} title="Chưa lưu từ vựng" description="Khi bạn lưu từ trong reader, nguồn tài liệu và bảng từ sẽ xuất hiện ở đây." />
            )}
        </>
    )
}
