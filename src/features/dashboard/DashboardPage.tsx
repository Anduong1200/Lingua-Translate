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
import { OverviewTab } from './tabs/OverviewTab'
import { FilesTab } from './tabs/FilesTab'
import { TranslationTab } from './tabs/TranslationTab'
import { VocabularyTab } from './tabs/VocabularyTab'
import { FlashcardsTab } from './tabs/FlashcardsTab'
import { PronunciationTab } from './tabs/PronunciationTab'
import { PasteDocumentModal } from './tabs/components'
import { resolveWordSource, documentTypeLabel, formatDate, speakChinese } from './dashboardUtils'
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











