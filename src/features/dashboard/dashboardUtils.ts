import type { DocumentContent, SavedWord } from '@/types'

export type DashboardTab = 'overview' | 'files' | 'translate' | 'vocabulary' | 'flashcards' | 'pronunciation'

export type UploadingRow = {
    id: string
    name: string
    type: string
    startedAt: Date
}

export type WordGroup = {
    name: string
    words: SavedWord[]
}

export type DashboardFlashCard = {
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

export type PracticeSentence = {
    text: string
    pinyin?: string
}

export const defaultPracticeSentences: PracticeSentence[] = [
    { text: '如果你有时间，我们可以一起练习口语。', pinyin: 'rú guǒ nǐ yǒu shí jiān, wǒ men kě yǐ yì qǐ liàn xí kǒu yǔ' },
    { text: '学习语言最重要的是每天坚持。', pinyin: 'xué xí yǔ yán zuì zhòng yào de shì měi tiān jiān chí' },
    { text: '这篇文章帮助我理解新的词语。', pinyin: 'zhè piān wén zhāng bāng zhù wǒ lǐ jiě xīn de cí yǔ' },
]

export function documentTypeLabel(value?: string) {
    const raw = value?.includes('.') ? value.split('.').pop() : value
    const ext = raw?.toLowerCase()
    if (ext === 'pdf') return 'PDF'
    if (ext === 'docx') return 'DOCX'
    return 'TXT'
}

export function typeBadgeClass(type: string) {
    if (type === 'PDF') return 'bg-amber-50 border-amber-200 text-amber-700'
    if (type === 'DOCX') return 'bg-blue-50 border-blue-200 text-blue-700'
    return 'bg-slate-100 border-slate-200 text-slate-700'
}

export function formatDate(value: Date | string | undefined) {
    if (!value) return 'Hôm nay'
    const date = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(date.getTime())) return 'Hôm nay'
    return date.toLocaleDateString('vi-VN')
}

export function resolveWordSource(word: SavedWord | undefined, documents: DocumentContent[]) {
    if (!word) return 'Tài liệu không xác định'
    const sourceDocument = word.sourceDocumentId ? documents.find((document) => document.id === word.sourceDocumentId) : undefined
    return sourceDocument?.title || word.sourceFile || word.topic || 'Tài liệu không xác định'
}

export function speakChinese(text: string) {
    if (!text || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-CN'
    utterance.rate = 0.85
    window.speechSynthesis.speak(utterance)
}

export function scoreSample() {
    return Math.floor(82 + Math.random() * 15)
}
