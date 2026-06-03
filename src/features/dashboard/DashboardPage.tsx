import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Activity,
    ArrowRightLeft,
    BookMarked,
    BookOpen,
    Calendar,
    CheckCircle2,
    ChevronRight,
    CreditCard,
    FilePlus2,
    FileText,
    Layers,
    Languages,
    LayoutDashboard,
    Loader2,
    Mic,
    MoreVertical,
    Search,
    Target,
    Trash2,
    Trophy,
    Upload,
    User,
    Volume2,
    X,
    type LucideIcon,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from '@/store/useStore'
import { generateId } from '@/lib/utils'
import type { DocumentContent, FlashCard, LearningProgress, SavedWord, TranslationResult } from '@/types'

type DashboardTab = 'overview' | 'files' | 'translate' | 'vocabulary' | 'flashcards' | 'pronunciation'

type UploadingRow = {
    id: string
    name: string
    type: string
    startedAt: Date
}

type WordGroup = {
    name: string
    words: SavedWord[]
}

type DashboardFlashCard = {
    id: string
    front: string
    back: string
    pinyin?: string
    example?: string
    source: string
    dueAt?: Date
    reviewId?: string
    savedWordId?: string
}

type PracticeSentence = {
    text: string
    pinyin?: string
}

const emptyProgress: LearningProgress = {
    wordsLearned: 0,
    streak: 0,
    totalTranslations: 0,
    savedWords: 0,
    dailyGoal: 10,
    todayProgress: 0,
}

const defaultPracticeSentences: PracticeSentence[] = [
    { text: '如果你有时间，我们可以一起练习口语。', pinyin: 'rú guǒ nǐ yǒu shí jiān, wǒ men kě yǐ yì qǐ liàn xí kǒu yǔ' },
    { text: '学习语言最重要的是每天坚持。', pinyin: 'xué xí yǔ yán zuì zhòng yào de shì měi tiān jiān chí' },
    { text: '这篇文章帮助我理解新的词语。', pinyin: 'zhè piān wén zhāng bāng zhù wǒ lǐ jiě xīn de cí yǔ' },
]

const sidebarItems: Array<{ id: DashboardTab | 'pricing'; label: string; icon: LucideIcon }> = [
    { id: 'overview', label: 'Bảng điều khiển', icon: LayoutDashboard },
    { id: 'files', label: 'Dịch file', icon: FileText },
    { id: 'translate', label: 'Dịch thuật', icon: Languages },
    { id: 'vocabulary', label: 'Từ vựng', icon: BookMarked },
    { id: 'flashcards', label: 'Flashcards', icon: Layers },
    { id: 'pronunciation', label: 'Luyện phát âm', icon: Mic },
    { id: 'pricing', label: 'Bảng giá', icon: CreditCard },
]

function documentTypeLabel(value?: string) {
    const raw = value?.includes('.') ? value.split('.').pop() : value
    const ext = raw?.toLowerCase()
    if (ext === 'pdf') return 'PDF'
    if (ext === 'docx') return 'DOCX'
    return 'TXT'
}

function typeBadgeClass(type: string) {
    if (type === 'PDF') return 'bg-amber-50 border-amber-200 text-amber-700'
    if (type === 'DOCX') return 'bg-blue-50 border-blue-200 text-blue-700'
    return 'bg-slate-100 border-slate-200 text-slate-700'
}

function formatDate(value: Date | string | undefined) {
    if (!value) return 'Hôm nay'
    const date = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(date.getTime())) return 'Hôm nay'
    return date.toLocaleDateString('vi-VN')
}

function resolveWordSource(word: SavedWord | undefined, documents: DocumentContent[]) {
    if (!word) return 'Tài liệu không xác định'
    const sourceDocument = word.sourceDocumentId ? documents.find((document) => document.id === word.sourceDocumentId) : undefined
    return sourceDocument?.title || word.sourceFile || word.topic || 'Tài liệu không xác định'
}

function speakChinese(text: string) {
    if (!text || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-CN'
    utterance.rate = 0.85
    window.speechSynthesis.speak(utterance)
}

function scoreSample() {
    return Math.floor(82 + Math.random() * 15)
}

export default function DashboardPage() {
    const navigate = useNavigate()
    const store = useStore()

    const documents = store.documents ?? []
    const savedWords = store.savedWords ?? []
    const reviewItems = store.reviewItems ?? []
    const flashCards = store.flashCards ?? []
    const learningProgress = store.learningProgress ?? emptyProgress
    const currentTranslation = store.currentTranslation ?? null
    const isTranslating = store.isTranslating ?? false

    const [activeTab, setActiveTab] = useState<DashboardTab>('overview')
    const [uploadingRows, setUploadingRows] = useState<UploadingRow[]>([])
    const [dragActive, setDragActive] = useState(false)
    const [fileSearch, setFileSearch] = useState('')
    const [showPasteModal, setShowPasteModal] = useState(false)
    const [pasteTitle, setPasteTitle] = useState('')
    const [pasteContent, setPasteContent] = useState('')
    const [translationText, setTranslationText] = useState('')
    const [translationSource, setTranslationSource] = useState<'zh' | 'vi'>('zh')
    const [translatingDocumentId, setTranslatingDocumentId] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const dueReviews = useMemo(
        () => reviewItems.filter((item) => new Date(item.due_at).getTime() <= Date.now()),
        [reviewItems],
    )

    const wordGroups = useMemo<WordGroup[]>(() => {
        const groups = savedWords.reduce<Record<string, SavedWord[]>>((acc, word) => {
            const source = resolveWordSource(word, documents)
            acc[source] = acc[source] || []
            acc[source].push(word)
            return acc
        }, {})

        return Object.entries(groups)
            .sort(([a], [b]) => a.localeCompare(b, 'vi'))
            .map(([name, words]) => ({ name, words }))
    }, [documents, savedWords])

    const dashboardCards = useMemo<DashboardFlashCard[]>(() => {
        if (flashCards.length) {
            return flashCards.map((card: FlashCard) => {
                const sourceWord = savedWords.find((word) => word.word === card.front)
                return {
                    id: card.id,
                    front: card.front,
                    back: card.back,
                    pinyin: card.pinyin,
                    example: card.example || card.sourceSentence,
                    source: resolveWordSource(sourceWord, documents),
                    dueAt: card.nextReview,
                    reviewId: card.id,
                    savedWordId: sourceWord?.id,
                }
            })
        }

        return savedWords.map((word) => ({
            id: word.id,
            front: word.word,
            back: word.translation,
            pinyin: word.pinyin,
            example: word.context,
            source: resolveWordSource(word, documents),
            savedWordId: word.id,
        }))
    }, [documents, flashCards, savedWords])

    const filteredDocuments = useMemo(() => {
        const query = fileSearch.trim().toLowerCase()
        if (!query) return documents
        return documents.filter((document) => {
            const title = document.title.toLowerCase()
            const sourceName = document.sourceFileName?.toLowerCase() || ''
            return title.includes(query) || sourceName.includes(query)
        })
    }, [documents, fileSearch])

    const handleUploadFiles = async (fileList: FileList | File[], openAfterUpload = false) => {
        const files = Array.from(fileList)
        if (!files.length) return

        const rows = files.map((file) => ({
            id: generateId(),
            name: file.name,
            type: documentTypeLabel(file.name),
            startedAt: new Date(),
        }))
        setUploadingRows((current) => [...rows, ...current])

        const uploadedDocuments: DocumentContent[] = []
        for (const [index, file] of files.entries()) {
            try {
                const result = await store.translateFile?.(file)
                if (result) {
                    uploadedDocuments.push(result)
                } else {
                    alert(`Không thể đọc được file "${file.name}". Vui lòng thử PDF, DOCX, TXT hoặc ảnh rõ nét hơn.`)
                }
            } catch {
                alert(`Đã xảy ra lỗi khi tải file "${file.name}".`)
            } finally {
                setUploadingRows((current) => current.filter((row) => row.id !== rows[index].id))
            }
        }

        if (fileInputRef.current) fileInputRef.current.value = ''
        if (openAfterUpload && uploadedDocuments[0]) {
            store.setCurrentDocument?.(uploadedDocuments[0])
            navigate('/reader')
        }
    }

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        if (event.target.files?.length) {
            void handleUploadFiles(event.target.files, true)
        }
    }

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault()
        event.stopPropagation()
        setDragActive(false)
        if (event.dataTransfer.files.length) {
            void handleUploadFiles(event.dataTransfer.files)
        }
    }

    const handleDrag = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault()
        event.stopPropagation()
        setDragActive(event.type === 'dragenter' || event.type === 'dragover')
    }

    const openDocument = async (document: DocumentContent, translateWholeDocument = false) => {
        store.setCurrentDocument?.(document)
        if (translateWholeDocument) {
            setTranslatingDocumentId(document.id)
            await store.translateCurrentDocument?.(document.id)
            setTranslatingDocumentId(null)
        }
        navigate('/reader')
    }

    const deleteDocument = (document: DocumentContent) => {
        if (!confirm(`Xóa tài liệu "${document.title}"?`)) return
        void store.deleteDocument?.(document.id)
    }

    const handlePasteSubmit = (event: FormEvent) => {
        event.preventDefault()
        if (!pasteTitle.trim() || !pasteContent.trim()) return

        const documentId = generateId()
        const document: DocumentContent = {
            id: documentId,
            title: `${pasteTitle.trim()}.txt`,
            type: 'txt',
            content: pasteContent.trim(),
            sentences: [],
            uploadedAt: new Date(),
            readingProgress: 0,
            highlights: [],
            notes: [],
        }

        store.addDocument?.(document)
        const storedDocument = useStore.getState().documents.find((item) => item.id === documentId) || document
        store.setCurrentDocument?.(storedDocument)
        setPasteTitle('')
        setPasteContent('')
        setShowPasteModal(false)
        navigate('/reader')
    }

    const handleTranslateText = async () => {
        if (!translationText.trim()) return
        const targetLang = translationSource === 'zh' ? 'vi' : 'zh'
        await store.translateText?.(translationText.trim(), translationSource, targetLang)
    }

    const stats = {
        totalFiles: documents.length,
        savedWords: savedWords.length,
        dueReviews: dueReviews.length,
        totalTranslations: learningProgress.totalTranslations || 0,
    }

    return (
        <div className="flex min-h-[calc(100vh-140px)] w-full gap-6 overflow-hidden rounded-2xl border border-teal-100 bg-white/80 custom-shadow backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/70">
            <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.webp" multiple onChange={handleFileChange} />
            <aside className="hidden w-64 shrink-0 flex-col border-r border-teal-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 md:flex">
                <section>
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Menu chính</h3>
                    <nav className="flex flex-col gap-2">
                        {sidebarItems.map((item) => (
                            <SidebarItem
                                key={item.id}
                                icon={item.icon}
                                label={item.label}
                                active={item.id === activeTab}
                                onClick={() => {
                                    if (item.id === 'pricing') {
                                        navigate('/store')
                                        return
                                    }
                                    setActiveTab(item.id)
                                }}
                            />
                        ))}
                    </nav>
                </section>

                <section className="mt-auto">
                    <div className="rounded-xl bg-gradient-to-br from-teal-600 to-cyan-700 p-4 text-white">
                        <h4 className="mb-1 text-sm font-bold">Gói Premium</h4>
                        <p className="mb-3 text-[10px] leading-relaxed text-teal-50/90">Mở khóa PDF, DOCX nâng cao và trợ giảng AI.</p>
                        <button
                            onClick={() => navigate('/store')}
                            className="w-full rounded-lg border border-white/20 bg-white/20 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/30"
                        >
                            Nâng cấp ngay
                        </button>
                    </div>
                </section>
            </aside>

            <div className="flex-1 overflow-auto p-4 scrollbar-hide md:p-6">
                <div className="mb-4 flex gap-2 overflow-x-auto pb-2 md:hidden">
                    {sidebarItems.map((item) => {
                        const Icon = item.icon
                        return (
                            <button
                                key={item.id}
                                onClick={() => {
                                    if (item.id === 'pricing') navigate('/store')
                                    else setActiveTab(item.id)
                                }}
                                className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold ${
                                    item.id === activeTab
                                        ? 'border-teal-200 bg-teal-50 text-teal-700'
                                        : 'border-slate-200 bg-white text-slate-500 dark:border-slate-800 dark:bg-slate-900'
                                }`}
                            >
                                <Icon className="h-4 w-4" />
                                {item.label}
                            </button>
                        )
                    })}
                </div>

                <div className="mx-auto flex max-w-6xl flex-col gap-6">
                    {activeTab === 'overview' && (
                        <OverviewTab
                            stats={stats}
                            documents={documents}
                            savedWords={savedWords}
                            learningProgress={learningProgress}
                            onOpenFiles={() => setActiveTab('files')}
                            onUploadClick={() => fileInputRef.current?.click()}
                            onOpenVocabulary={() => setActiveTab('vocabulary')}
                            onOpenFlashcards={() => setActiveTab('flashcards')}
                        />
                    )}

                    {activeTab === 'files' && (
                        <FilesTab
                            documents={filteredDocuments}
                            totalDocuments={documents.length}
                            savedWordsCount={savedWords.length}
                            dueReviewsCount={dueReviews.length}
                            uploadingRows={uploadingRows}
                            fileSearch={fileSearch}
                            setFileSearch={setFileSearch}
                            dragActive={dragActive}
                            translatingDocumentId={translatingDocumentId}
                            onDrag={handleDrag}
                            onDrop={handleDrop}
                            onUploadClick={() => fileInputRef.current?.click()}
                            onPasteClick={() => setShowPasteModal(true)}
                            onOpenDocument={(document) => void openDocument(document)}
                            onTranslateDocument={(document) => void openDocument(document, true)}
                            onDeleteDocument={deleteDocument}
                        />
                    )}

                    {activeTab === 'translate' && (
                        <TranslationTab
                            sourceText={translationText}
                            sourceLang={translationSource}
                            result={currentTranslation}
                            isTranslating={isTranslating}
                            setSourceText={setTranslationText}
                            setSourceLang={setTranslationSource}
                            onTranslate={() => void handleTranslateText()}
                        />
                    )}

                    {activeTab === 'vocabulary' && (
                        <VocabularyTab
                            groups={wordGroups}
                            onRemoveWord={(id) => store.removeSavedWord?.(id)}
                            onSpeak={speakChinese}
                        />
                    )}

                    {activeTab === 'flashcards' && (
                        <FlashcardsTab
                            cards={dashboardCards}
                            onSpeak={speakChinese}
                            onSubmitReview={(id, rating) => void store.submitReview?.(id, rating)}
                            onRemoveWord={(id) => store.removeSavedWord?.(id)}
                        />
                    )}

                    {activeTab === 'pronunciation' && (
                        <PronunciationTab
                            words={savedWords}
                            documents={documents}
                            onSpeak={speakChinese}
                            onUpload={(files) => void handleUploadFiles(files)}
                        />
                    )}
                </div>
            </div>

            <PasteDocumentModal
                visible={showPasteModal}
                title={pasteTitle}
                content={pasteContent}
                setTitle={setPasteTitle}
                setContent={setPasteContent}
                onClose={() => setShowPasteModal(false)}
                onSubmit={handlePasteSubmit}
            />
        </div>
    )
}

function SidebarItem({ icon: Icon, label, active, onClick }: { icon: LucideIcon; label: string; active: boolean; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                active
                    ? 'border-teal-100 bg-teal-50 font-bold text-teal-700 dark:border-teal-900/60 dark:bg-teal-950/40 dark:text-teal-300'
                    : 'border-transparent font-medium text-slate-600 hover:border-slate-200 hover:bg-slate-50 dark:text-slate-400 dark:hover:border-slate-800 dark:hover:bg-slate-900'
            }`}
        >
            <Icon className={`h-5 w-5 ${active ? 'text-teal-600 dark:text-teal-300' : 'text-slate-400'}`} />
            <span className="text-sm">{label}</span>
        </button>
    )
}

function StatCard({ title, value, icon: Icon, color, alert }: { title: string; value: string; icon: LucideIcon; color: string; alert?: boolean }) {
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

function OverviewTab({
    stats,
    documents,
    savedWords,
    learningProgress,
    onOpenFiles,
    onUploadClick,
    onOpenVocabulary,
    onOpenFlashcards,
}: {
    stats: { totalFiles: number; savedWords: number; dueReviews: number; totalTranslations: number }
    documents: DocumentContent[]
    savedWords: SavedWord[]
    learningProgress: LearningProgress
    onOpenFiles: () => void
    onUploadClick: () => void
    onOpenVocabulary: () => void
    onOpenFlashcards: () => void
}) {
    const progress = learningProgress.dailyGoal > 0 ? Math.min(100, Math.round((learningProgress.todayProgress / learningProgress.dailyGoal) * 100)) : 0
    const recentDocuments = documents.slice(0, 3)

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col justify-between gap-5 rounded-2xl border border-teal-100 bg-white p-6 custom-shadow dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center">
                <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-teal-200 bg-teal-100 dark:border-teal-800 dark:bg-teal-950">
                        <User className="h-8 w-8 text-teal-600 dark:text-teal-300" />
                    </div>
                    <div>
                        <h1 className="mb-1 text-2xl font-black text-slate-900 dark:text-slate-100">Chào mừng quay lại</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Theo dõi tài liệu, từ vựng và lịch ôn tập trong một màn hình.</p>
                    </div>
                </div>
                <button
                    onClick={onUploadClick}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-teal-700"
                >
                    <Upload className="h-4 w-4" />
                    Tải tài liệu
                </button>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Tổng số tệp" value={String(stats.totalFiles)} icon={FileText} color="bg-teal-50 border-teal-100 text-teal-600" />
                <StatCard title="Từ đã lưu" value={String(stats.savedWords)} icon={BookMarked} color="bg-cyan-50 border-cyan-100 text-cyan-600" />
                <StatCard title="Cần ôn hôm nay" value={String(stats.dueReviews)} icon={Layers} color="bg-emerald-50 border-emerald-100 text-emerald-600" alert={stats.dueReviews > 0} />
                <StatCard title="Lượt dịch" value={String(stats.totalTranslations)} icon={Languages} color="bg-indigo-50 border-indigo-100 text-indigo-600" />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 flex flex-col gap-6">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <button
                            onClick={onOpenFlashcards}
                            className="group flex items-center gap-4 rounded-2xl border border-teal-100 bg-white p-6 text-left custom-shadow transition-colors hover:border-teal-300 dark:border-slate-800 dark:bg-slate-900"
                        >
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-orange-100 bg-orange-50 transition-transform group-hover:scale-105">
                                <Trophy className="h-7 w-7 text-orange-500" />
                            </div>
                            <div>
                                <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Chuỗi học tập</p>
                                <h4 className="text-3xl font-black text-slate-800 dark:text-slate-100">{learningProgress.streak || 0} <span className="text-lg font-medium text-slate-500">ngày</span></h4>
                            </div>
                        </button>

                        <button
                            onClick={onOpenVocabulary}
                            className="group flex items-center gap-4 rounded-2xl border border-teal-100 bg-white p-6 text-left custom-shadow transition-colors hover:border-teal-300 dark:border-slate-800 dark:bg-slate-900"
                        >
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 transition-transform group-hover:scale-105">
                                <Target className="h-7 w-7 text-emerald-500" />
                            </div>
                            <div>
                                <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Mục tiêu ngày</p>
                                <h4 className="text-3xl font-black text-slate-800 dark:text-slate-100">
                                    {learningProgress.todayProgress || 0}/{learningProgress.dailyGoal || 10}
                                    <span className="text-lg font-medium text-slate-500"> từ</span>
                                </h4>
                            </div>
                        </button>
                    </div>

                    <div className="rounded-2xl border border-teal-100 bg-white p-6 custom-shadow dark:border-slate-800 dark:bg-slate-900">
                        <div className="mb-6 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Hoạt động gần đây</h3>
                            <button onClick={onOpenFiles} className="text-sm font-bold text-teal-600 transition-colors hover:text-teal-700">
                                Xem tất cả
                            </button>
                        </div>
                        <div className="ml-2 flex flex-col gap-4 border-l-2 border-teal-100 py-2 pl-6 dark:border-slate-800">
                            {recentDocuments.length ? (
                                recentDocuments.map((document, index) => (
                                    <div key={document.id} className="relative rounded-xl p-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60">
                                        <div className={`absolute -left-[35px] top-4 h-3.5 w-3.5 rounded-full ring-4 ring-white dark:ring-slate-900 ${index === 0 ? 'bg-teal-500' : 'bg-teal-300'}`} />
                                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Tải lên tài liệu: {document.title}</h4>
                                        <p className="mt-1 text-xs font-medium text-slate-500">{formatDate(document.uploadedAt)} • {document.sentences.length || 0} câu đọc</p>
                                    </div>
                                ))
                            ) : (
                                <div className="relative rounded-xl p-2">
                                    <div className="absolute -left-[35px] top-4 h-3.5 w-3.5 rounded-full bg-slate-300 ring-4 ring-white dark:ring-slate-900" />
                                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Chưa có tài liệu nào</h4>
                                    <p className="mt-1 text-xs font-medium text-slate-500">Tải file đầu tiên để bắt đầu đọc và dịch theo ngữ cảnh.</p>
                                </div>
                            )}
                            <div className="relative rounded-xl p-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60">
                                <div className="absolute -left-[35px] top-4 h-3.5 w-3.5 rounded-full bg-cyan-300 ring-4 ring-white dark:ring-slate-900" />
                                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Lưu {savedWords.length} từ vựng</h4>
                                <p className="mt-1 text-xs font-medium text-slate-500">Nguồn từ reader và tra cứu ngữ cảnh.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-6">
                    <div className="rounded-2xl border border-teal-100 bg-white p-6 custom-shadow dark:border-slate-800 dark:bg-slate-900">
                        <h3 className="mb-6 text-lg font-bold text-slate-800 dark:text-slate-100">Tổng quan thành tích</h3>
                        <div className="space-y-5">
                            <AchievementRow icon={BookMarked} label="Từ vựng đã học" value={String(learningProgress.wordsLearned || 0)} color="bg-blue-50 text-blue-600 border-blue-100" />
                            <AchievementRow icon={Calendar} label="Tiến độ hôm nay" value={`${progress}%`} color="bg-purple-50 text-purple-600 border-purple-100" />
                            <AchievementRow icon={FileText} label="Tài liệu đã dịch" value={String(documents.length)} color="bg-cyan-50 text-cyan-600 border-cyan-100" />
                        </div>
                    </div>

                    <div className="relative flex min-h-[200px] flex-1 flex-col justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 p-6 text-white custom-shadow">
                        <Activity className="absolute right-4 top-4 h-28 w-28 text-white/10" />
                        <div className="relative z-10">
                            <div className="mb-2 flex items-center justify-between">
                                <h3 className="text-xl font-bold">Trợ giảng trực tuyến</h3>
                                <span className="relative flex h-3 w-3">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
                                    <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-300" />
                                </span>
                            </div>
                            <p className="mb-6 max-w-[220px] text-sm leading-relaxed text-teal-50/90">Mở reader để phân tích câu, lưu từ và tạo nội dung ôn tập.</p>
                            <button
                                onClick={onOpenFiles}
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3.5 font-bold text-teal-700 transition-colors hover:bg-slate-50"
                            >
                                <BookOpen className="h-5 w-5" />
                                Mở tài liệu
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function AchievementRow({ icon: Icon, label, value, color }: { icon: LucideIcon; label: string; value: string; color: string }) {
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

function FilesTab({
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

function TranslationTab({
    sourceText,
    sourceLang,
    result,
    isTranslating,
    setSourceText,
    setSourceLang,
    onTranslate,
}: {
    sourceText: string
    sourceLang: 'zh' | 'vi'
    result: TranslationResult | null
    isTranslating: boolean
    setSourceText: (value: string) => void
    setSourceLang: (value: 'zh' | 'vi') => void
    onTranslate: () => void
}) {
    const targetLang = sourceLang === 'zh' ? 'vi' : 'zh'

    return (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-2xl border border-teal-100 bg-white p-6 custom-shadow dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-5 flex items-center justify-between">
                    <div>
                        <h1 className="mb-1 text-2xl font-black text-slate-900 dark:text-slate-100">Dịch thuật</h1>
                        <p className="text-sm text-slate-500">Dịch nhanh câu hoặc đoạn văn ngắn.</p>
                    </div>
                    <button
                        onClick={() => setSourceLang(sourceLang === 'zh' ? 'vi' : 'zh')}
                        className="flex items-center gap-2 rounded-xl border border-teal-100 bg-teal-50 px-3 py-2 text-xs font-bold text-teal-700 hover:bg-teal-100 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-300"
                    >
                        <ArrowRightLeft className="h-4 w-4" />
                        {sourceLang.toUpperCase()} → {targetLang.toUpperCase()}
                    </button>
                </div>
                <textarea
                    value={sourceText}
                    onChange={(event) => setSourceText(event.target.value)}
                    rows={12}
                    placeholder={sourceLang === 'zh' ? 'Nhập tiếng Trung cần dịch...' : 'Nhập tiếng Việt cần dịch sang tiếng Trung...'}
                    className="mb-4 w-full resize-none rounded-2xl border border-teal-100 bg-slate-50/60 p-4 text-sm leading-7 text-slate-800 outline-none transition-colors focus:border-teal-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
                <button
                    onClick={onTranslate}
                    disabled={!sourceText.trim() || isTranslating}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 py-3.5 text-sm font-black text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                    {isTranslating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Languages className="h-5 w-5" />}
                    Dịch ngay
                </button>
            </div>

            <div className="rounded-2xl border border-teal-100 bg-white p-6 custom-shadow dark:border-slate-800 dark:bg-slate-900">
                <h2 className="mb-4 text-lg font-bold text-slate-800 dark:text-slate-100">Kết quả</h2>
                {result ? (
                    <div className="space-y-4">
                        <div className="rounded-2xl border border-teal-100 bg-teal-50/50 p-4 dark:border-teal-900 dark:bg-teal-950/20">
                            <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-teal-700 dark:text-teal-300">Bản dịch</p>
                            <p className="text-base font-bold leading-7 text-slate-900 dark:text-slate-100">{result.translatedText}</p>
                        </div>
                        {result.pronunciation && (
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                                <p className="mb-1 text-xs font-bold text-slate-400">Pinyin</p>
                                <p className="font-mono text-sm font-bold text-teal-700 dark:text-teal-300">{result.pronunciation}</p>
                            </div>
                        )}
                        {result.grammarExplanation && (
                            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                                <p className="mb-1 text-xs font-bold text-slate-400">Ngữ pháp / ngữ cảnh</p>
                                <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{result.grammarExplanation}</p>
                            </div>
                        )}
                        {result.usageExamples?.length ? (
                            <div className="space-y-2">
                                {result.usageExamples.slice(0, 2).map((example, index) => (
                                    <div key={`${example.original}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-950">
                                        <p className="font-bold text-slate-800 dark:text-slate-100">{example.original}</p>
                                        <p className="mt-1 text-slate-500">{example.translation}</p>
                                    </div>
                                ))}
                            </div>
                        ) : null}
                    </div>
                ) : (
                    <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-8 text-center dark:border-slate-800 dark:bg-slate-950/40">
                        <Languages className="mb-3 h-10 w-10 text-slate-300" />
                        <p className="font-bold text-slate-600 dark:text-slate-300">Kết quả dịch sẽ hiển thị tại đây.</p>
                    </div>
                )}
            </div>
        </div>
    )
}

function VocabularyTab({ groups, onRemoveWord, onSpeak }: { groups: WordGroup[]; onRemoveWord: (id: string) => void; onSpeak: (text: string) => void }) {
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
                        <h1 className="mb-1 text-2xl font-black text-slate-900 dark:text-slate-100">Từ vựng: {activeGroup.name}</h1>
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
                <h1 className="mb-1 text-2xl font-black text-slate-900 dark:text-slate-100">Từ vựng đã lưu</h1>
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

function FlashcardsTab({
    cards,
    onSpeak,
    onSubmitReview,
    onRemoveWord,
}: {
    cards: DashboardFlashCard[]
    onSpeak: (text: string) => void
    onSubmitReview: (id: string, rating: number) => void
    onRemoveWord: (id: string) => void
}) {
    const [selectedSource, setSelectedSource] = useState<string | null>(null)
    const [index, setIndex] = useState(0)
    const [flipped, setFlipped] = useState(false)

    const grouped = useMemo(
        () =>
            cards.reduce<Record<string, DashboardFlashCard[]>>((acc, card) => {
                acc[card.source] = acc[card.source] || []
                acc[card.source].push(card)
                return acc
            }, {}),
        [cards],
    )
    const sources = Object.keys(grouped)
    const activeSource = selectedSource && grouped[selectedSource] ? selectedSource : sources[0]
    const activeCards = activeSource ? grouped[activeSource] : []
    const card = activeCards.length ? activeCards[index % activeCards.length] : null

    const goToCard = (nextIndex: number) => {
        if (!activeCards.length) return
        setIndex((nextIndex + activeCards.length) % activeCards.length)
        setFlipped(false)
    }

    const chooseSource = (source: string) => {
        setSelectedSource(source)
        setIndex(0)
        setFlipped(false)
    }

    const review = (rating: number) => {
        if (card?.reviewId) onSubmitReview(card.reviewId, rating)
        goToCard(index + 1)
    }

    if (!cards.length) {
        return <EmptyState icon={Layers} title="Chưa có flashcard" description="Lưu từ hoặc tạo mục ôn tập từ reader để bắt đầu luyện flashcard." />
    }

    return (
        <>
            <div className="rounded-2xl border border-teal-100 bg-white p-6 custom-shadow dark:border-slate-800 dark:bg-slate-900">
                <h1 className="mb-1 text-2xl font-black text-slate-900 dark:text-slate-100">Flashcards</h1>
                <p className="text-sm text-slate-500">Ôn tập theo từng nguồn tài liệu giống prototype dashboard.</p>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
                <div className="rounded-2xl border border-teal-100 bg-white p-5 custom-shadow dark:border-slate-800 dark:bg-slate-900">
                    <h3 className="mb-4 text-xs font-black uppercase tracking-[0.16em] text-slate-400">Nguồn flashcard</h3>
                    <div className="space-y-3">
                        {sources.map((source) => (
                            <button
                                key={source}
                                onClick={() => chooseSource(source)}
                                className={`w-full rounded-xl border p-4 text-left transition-colors ${
                                    activeSource === source
                                        ? 'border-teal-300 bg-teal-50 text-teal-800 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-200'
                                        : 'border-slate-100 bg-white text-slate-700 hover:border-teal-200 hover:bg-teal-50/40 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300'
                                }`}
                            >
                                <p className="line-clamp-2 text-sm font-black">{source}</p>
                                <p className="mt-1 text-xs font-medium text-slate-500">{grouped[source].length} thẻ</p>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="rounded-2xl border border-teal-100 bg-white p-6 custom-shadow dark:border-slate-800 dark:bg-slate-900">
                    {card && (
                        <div className="flex min-h-[520px] flex-col">
                            <div className="mb-5 flex items-center justify-between gap-3">
                                <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-teal-700 dark:bg-teal-950 dark:text-teal-300">
                                    Thẻ {index + 1}/{activeCards.length}
                                </span>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => onSpeak(card.front)} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
                                        <Volume2 className="h-5 w-5" />
                                    </button>
                                    {card.savedWordId && (
                                        <button onClick={() => onRemoveWord(card.savedWordId!)} className="rounded-xl border border-red-100 bg-red-50 p-2 text-red-600 hover:bg-red-100">
                                            <Trash2 className="h-5 w-5" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={() => setFlipped((value) => !value)}
                                className="flex flex-1 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-teal-200 bg-gradient-to-br from-teal-50 to-cyan-50 p-8 text-center transition-colors hover:border-teal-400 dark:border-slate-700 dark:from-slate-950 dark:to-slate-900"
                            >
                                {!flipped ? (
                                    <>
                                        <p className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-slate-400">Mặt trước</p>
                                        <h2 className="mb-4 text-6xl font-black text-slate-900 dark:text-slate-100">{card.front}</h2>
                                        {card.pinyin && <p className="rounded-xl border border-teal-100 bg-white px-4 py-2 font-mono text-lg font-bold text-teal-700 dark:border-teal-900 dark:bg-slate-950 dark:text-teal-300">/{card.pinyin}/</p>}
                                        <p className="mt-8 text-sm font-bold text-slate-400">Nhấn vào thẻ để lật</p>
                                    </>
                                ) : (
                                    <>
                                        <p className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-slate-400">Mặt sau</p>
                                        <h2 className="mb-4 max-w-xl text-3xl font-black leading-tight text-teal-700 dark:text-teal-300">{card.back}</h2>
                                        {card.example && (
                                            <p className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-7 text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                                                {card.example}
                                            </p>
                                        )}
                                    </>
                                )}
                            </button>

                            <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950 sm:flex-row sm:items-center sm:justify-between">
                                <button onClick={() => goToCard(index - 1)} className="rounded-xl px-5 py-3 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800">
                                    Thẻ trước
                                </button>
                                <div className="flex justify-center gap-2">
                                    <button onClick={() => review(2)} className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-black text-rose-600 hover:bg-rose-100">Khó</button>
                                    <button onClick={() => review(3)} className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-black text-amber-700 hover:bg-amber-100">Ổn</button>
                                    <button onClick={() => review(4)} className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700 hover:bg-emerald-100">Nhớ</button>
                                </div>
                                <button onClick={() => goToCard(index + 1)} className="rounded-xl bg-teal-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-teal-700">
                                    Thẻ sau
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}

function PronunciationTab({
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

function PronunciationRecorder({ score, isRecording, onRecord, compact }: { score: number | null; isRecording: boolean; onRecord: () => void; compact?: boolean }) {
    if (score) {
        return (
            <div className={`flex flex-col items-center text-center ${compact ? 'w-full max-w-lg' : ''}`}>
                <div className="mb-2 bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-6xl font-black text-transparent">{score}</div>
                <p className="mb-5 rounded-full border border-teal-100 bg-teal-50 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-teal-700 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-300">Điểm phát âm AI</p>
                <div className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left text-sm leading-6 text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                    <p className="mb-2 flex items-center gap-2 font-black text-slate-800 dark:text-slate-100">
                        <Mic className="h-4 w-4 text-teal-500" />
                        Nhận xét phân tích
                    </p>
                    <p>Thanh điệu chính ổn. Hãy đọc chậm hơn ở âm cuối và giữ nhịp câu đều hơn.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col items-center justify-center">
            <button
                onClick={onRecord}
                className={`flex h-20 w-20 items-center justify-center rounded-full shadow-xl transition-transform hover:scale-105 ${
                    isRecording ? 'bg-rose-500 text-white shadow-rose-500/30' : 'bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-teal-500/30'
                }`}
            >
                {isRecording ? <span className="h-5 w-5 rounded-sm bg-white" /> : <Mic className="h-8 w-8" />}
            </button>
            <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-slate-400">{isRecording ? 'Đang phân tích...' : 'Nhấn để thu âm'}</p>
        </div>
    )
}

function EmptyState({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
    return (
        <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white/70 p-8 text-center custom-shadow dark:border-slate-800 dark:bg-slate-900/70">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-950">
                <Icon className="h-8 w-8" />
            </div>
            <h2 className="mb-2 text-lg font-black text-slate-800 dark:text-slate-100">{title}</h2>
            <p className="max-w-md text-sm leading-6 text-slate-500">{description}</p>
        </div>
    )
}

function PasteDocumentModal({
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
    setTitle: (value: string) => void
    setContent: (value: string) => void
    onClose: () => void
    onSubmit: (event: FormEvent) => void
}) {
    return (
        <AnimatePresence>
            {visible && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.96, y: 16 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 16 }}
                        className="relative w-full max-w-xl rounded-2xl border border-white/40 bg-white/95 p-6 shadow-2xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95"
                    >
                        <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                            <h3 className="flex items-center gap-2 text-base font-black text-slate-800 dark:text-slate-100">
                                <FileText className="h-5 w-5 text-teal-600" />
                                Nhập nội dung văn bản mới
                            </h3>
                            <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800">
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <form onSubmit={onSubmit} className="space-y-4">
                            <div>
                                <label className="mb-1.5 block text-xs font-bold text-slate-500">Tiêu đề tài liệu</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ví dụ: Đoạn văn mẫu HSK 3"
                                    value={title}
                                    onChange={(event) => setTitle(event.target.value)}
                                    className="w-full rounded-xl border border-slate-200 bg-transparent p-3.5 text-sm outline-none transition-colors focus:border-teal-600 dark:border-slate-800 dark:text-slate-100"
                                />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-xs font-bold text-slate-500">Nội dung văn bản</label>
                                <textarea
                                    required
                                    rows={8}
                                    placeholder="Dán nội dung chữ Hán học tập của bạn tại đây..."
                                    value={content}
                                    onChange={(event) => setContent(event.target.value)}
                                    className="w-full resize-none rounded-xl border border-slate-200 bg-transparent p-3.5 text-sm leading-7 outline-none transition-colors focus:border-teal-600 dark:border-slate-800 dark:text-slate-100"
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-slate-200 bg-slate-50 py-3 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                                    Bỏ qua
                                </button>
                                <button type="submit" className="flex-1 rounded-xl bg-teal-600 py-3 text-sm font-bold text-white transition-colors hover:bg-teal-700">
                                    Lưu & Phân tích
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
