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

export function PronunciationTab({
    words,
    documents,
    onSpeak,
    onUpload,
}: {
    words: SavedWord[]
    documents: DocumentContent[]
    onSpeak: (text: string) => void
    onUpload: (files: FileList) => void
}) {
    const [mode, setMode] = useState<'words' | 'files'>('words')
    const [wordIndex, setWordIndex] = useState(0)
    const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(documents[0]?.id ?? null)
    const [sentenceIndex, setSentenceIndex] = useState(0)
    const [isRecording, setIsRecording] = useState(false)
    const [score, setScore] = useState<number | null>(null)
    const pronunFileInputRef = useRef<HTMLInputElement>(null)

    const selectedDocument = documents.find((document) => document.id === selectedDocumentId) || documents[0]
    const fileSentences = selectedDocument?.sentences.length
        ? selectedDocument.sentences.slice(0, 12).map((sentence) => ({ text: sentence.text, pinyin: sentence.translation }))
        : defaultPracticeSentences
    const currentSentence = fileSentences[Math.min(sentenceIndex, fileSentences.length - 1)] || defaultPracticeSentences[0]
    const currentWord = words.length ? words[wordIndex % words.length] : null

    const startRecording = () => {
        setScore(null)
        setIsRecording(true)
        window.setTimeout(() => {
            setIsRecording(false)
            setScore(scoreSample())
        }, 1200)
    }

    const nextWord = () => {
        if (!words.length) return
        setScore(null)
        setWordIndex((index) => (index + 1) % words.length)
    }

    const chooseDocument = (documentId: string) => {
        setSelectedDocumentId(documentId)
        setSentenceIndex(0)
        setScore(null)
    }

    return (
        <>
            <div className="rounded-2xl border border-teal-100 bg-white p-6 custom-shadow dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <h1 className="mb-1 text-2xl font-black text-slate-900 dark:text-slate-100">Luyện phát âm</h1>
                        <p className="text-sm text-slate-500">Luyện theo từ đã lưu hoặc theo câu trong file đã tải.</p>
                    </div>
                    <div className="flex rounded-xl border border-teal-100 bg-teal-50 p-1 dark:border-slate-800 dark:bg-slate-950">
                        <button onClick={() => { setMode('words'); setScore(null) }} className={`rounded-lg px-4 py-2 text-sm font-bold ${mode === 'words' ? 'bg-white text-teal-700 shadow-sm dark:bg-slate-900 dark:text-teal-300' : 'text-slate-500'}`}>
                            Từ vựng
                        </button>
                        <button onClick={() => { setMode('files'); setScore(null) }} className={`rounded-lg px-4 py-2 text-sm font-bold ${mode === 'files' ? 'bg-white text-teal-700 shadow-sm dark:bg-slate-900 dark:text-teal-300' : 'text-slate-500'}`}>
                            Theo file
                        </button>
                    </div>
                </div>
            </div>

            {mode === 'words' ? (
                <div className="rounded-2xl border border-teal-100 bg-white p-8 text-center custom-shadow dark:border-slate-800 dark:bg-slate-900">
                    {currentWord ? (
                        <>
                            <div className="mb-4 flex justify-center">
                                <button onClick={() => onSpeak(currentWord.word)} className="rounded-xl border border-teal-100 bg-teal-50 p-3 text-teal-600 hover:bg-teal-100 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-300">
                                    <Volume2 className="h-5 w-5" />
                                </button>
                            </div>
                            <h2 className="mb-4 text-7xl font-black tracking-normal text-slate-900 dark:text-slate-100">{currentWord.word}</h2>
                            <p className="mx-auto mb-3 inline-flex rounded-lg border border-teal-100 bg-teal-50 px-4 py-1.5 font-mono text-xl font-bold text-teal-700 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-300">/{currentWord.pinyin || 'pinyin'}/</p>
                            <p className="mb-10 text-lg font-semibold text-slate-500">{currentWord.translation}</p>

                            <PronunciationRecorder score={score} isRecording={isRecording} onRecord={startRecording} />
                            {score ? (
                                <button onClick={nextWord} className="mt-6 rounded-xl bg-slate-900 px-8 py-3.5 text-sm font-bold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900">
                                    Tiếp tục luyện tập
                                </button>
                            ) : null}
                        </>
                    ) : (
                        <EmptyState icon={Mic} title="Chưa có từ để luyện" description="Lưu vài từ trong reader để luyện phát âm theo từ." />
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
                    <div className="rounded-2xl border border-teal-100 bg-white p-5 custom-shadow dark:border-slate-800 dark:bg-slate-900">
                        <h3 className="mb-4 text-xs font-black uppercase tracking-[0.16em] text-slate-400">Tệp sẵn sàng luyện tập</h3>
                        <div className="space-y-3">
                            {documents.map((document) => (
                                <button
                                    key={document.id}
                                    onClick={() => chooseDocument(document.id)}
                                    className={`w-full rounded-xl border p-4 text-left transition-colors ${
                                        selectedDocument?.id === document.id
                                            ? 'border-teal-300 bg-teal-50 dark:border-teal-900 dark:bg-teal-950/40'
                                            : 'border-slate-100 bg-white hover:border-teal-200 hover:bg-teal-50/40 dark:border-slate-800 dark:bg-slate-950'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-teal-100 bg-teal-50 text-teal-600 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-300">
                                            <FileText className="h-5 w-5" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-black text-slate-800 dark:text-slate-100">{document.title}</p>
                                            <p className="text-xs font-medium text-slate-500">{document.sentences.length || 0} câu luyện tập</p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => pronunFileInputRef.current?.click()}
                            className="mt-4 flex w-full flex-col items-center justify-center rounded-xl border border-dashed border-teal-300 bg-teal-50/70 p-4 text-center text-teal-700 transition-colors hover:bg-teal-50 dark:border-teal-900 dark:bg-teal-950/30 dark:text-teal-300"
                        >
                            <Upload className="mb-2 h-6 w-6" />
                            <p className="text-sm font-black">Tải tệp mới lên</p>
                            <p className="mt-1 text-xs font-medium">PDF, DOCX, TXT</p>
                        </button>
                        <input ref={pronunFileInputRef} type="file" className="hidden" accept=".pdf,.docx,.txt" multiple onChange={(event) => event.target.files && onUpload(event.target.files)} />
                    </div>

                    <div className="flex min-h-[600px] flex-col rounded-2xl border border-teal-100 bg-white p-6 custom-shadow dark:border-slate-800 dark:bg-slate-900">
                        <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                            <span className="rounded-lg bg-teal-100 px-4 py-1.5 text-sm font-black uppercase tracking-[0.14em] text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                                Câu {sentenceIndex + 1}/{fileSentences.length}
                            </span>
                            <button onClick={() => onSpeak(currentSentence.text)} className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
                                <Volume2 className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="mb-6 flex min-h-[160px] items-center rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950">
                            <h3 className="w-full text-center text-2xl font-black leading-[1.7] text-slate-900 dark:text-slate-100">{currentSentence.text}</h3>
                        </div>
                        <p className="mb-6 rounded-xl border border-teal-200 bg-teal-50 py-2 text-center font-mono text-lg font-bold text-teal-700 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-300">/{currentSentence.pinyin || 'nghe mẫu rồi đọc lại câu này'}/</p>

                        <div className="flex flex-1 items-center justify-center">
                            <PronunciationRecorder score={score} isRecording={isRecording} onRecord={startRecording} compact />
                        </div>

                        <div className="mt-auto flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                            <button
                                onClick={() => { setSentenceIndex(Math.max(0, sentenceIndex - 1)); setScore(null) }}
                                disabled={sentenceIndex === 0}
                                className="w-[130px] rounded-xl px-4 py-3 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-200 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                                Câu trước
                            </button>
                            <button
                                onClick={startRecording}
                                className={`flex h-20 w-20 items-center justify-center rounded-full shadow-xl transition-transform hover:scale-105 ${
                                    isRecording ? 'bg-rose-500 text-white shadow-rose-500/30' : 'bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-teal-500/30'
                                }`}
                            >
                                {isRecording ? <span className="h-5 w-5 rounded-sm bg-white" /> : <Mic className="h-8 w-8" />}
                            </button>
                            <button
                                onClick={() => { setSentenceIndex(Math.min(fileSentences.length - 1, sentenceIndex + 1)); setScore(null) }}
                                disabled={sentenceIndex === fileSentences.length - 1}
                                className="w-[130px] rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-bold text-teal-700 transition-colors hover:bg-teal-100 disabled:opacity-50 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-300"
                            >
                                Câu sau
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
