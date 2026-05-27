import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function generateId(): string {
    return Math.random().toString(36).substring(2, 15) + Date.now().toString(36)
}

export function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date)
}

export function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
}

export function detectLanguage(text: string): string {
    const vietnameseChars = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i
    const chineseChars = /[\u4e00-\u9fff]/
    const japaneseChars = /[\u3040-\u309f\u30a0-\u30ff]/
    const koreanChars = /[\uac00-\ud7af]/

    if (vietnameseChars.test(text)) return 'vi'
    if (chineseChars.test(text)) return 'zh'
    if (japaneseChars.test(text)) return 'ja'
    if (koreanChars.test(text)) return 'ko'
    if (/[а-яА-Я]/.test(text)) return 'ru'
    if (/[a-zA-Z]/.test(text)) return 'en'
    return 'auto'
}

export const DEMO_TRANSLATION: Record<string, Record<string, (text: string) => {
    translatedText: string
    wordType: string
    grammarExplanation: string
    usageExamples: { original: string; translation: string }[]
    pronunciation: string
    tips: string[]
    difficulty: string
}>> = {
    'en-vi': {
        default: (text: string) => ({
            translatedText: `${text} (bản dịch tiếng Việt)`,
            wordType: 'noun / verb',
            grammarExplanation: `"${text}" là một từ phổ biến trong tiếng Anh, thường được sử dụng trong nhiều ngữ cảnh khác nhau.`,
            usageExamples: [
                { original: `I need to ${text.toLowerCase()} this.`, translation: `Tôi cần ${text.toLowerCase()} cái này.` },
                { original: `The ${text.toLowerCase()} is important.`, translation: `${text.toLowerCase()} rất quan trọng.` },
                { original: `She ${text.toLowerCase()}ed it yesterday.`, translation: `Cô ấy đã ${text.toLowerCase()} nó hôm qua.` },
            ],
            pronunciation: `/${text.toLowerCase()}/`,
            tips: ['Từ này thường được sử dụng trong văn nói hàng ngày', 'Có thể kết hợp với nhiều giới từ khác nhau', 'Học cách phát âm đúng để giao tiếp tự nhiên'],
            difficulty: 'beginner',
        }),
    },
    'vi-en': {
        default: (text: string) => ({
            translatedText: `English translation of "${text}"`,
            wordType: 'noun',
            grammarExplanation: `"${text}" is a common Vietnamese word used in daily conversations.`,
            usageExamples: [
                { original: `${text} là một khái niệm quan trọng.`, translation: `${text} is an important concept.` },
                { original: `Tôi thích ${text}.`, translation: `I like ${text}.` },
                { original: `${text} này rất đẹp.`, translation: `This ${text} is beautiful.` },
            ],
            pronunciation: `/${text.toLowerCase()}/`,
            tips: ['Practice this word in daily conversations', 'Try to use it in different contexts', 'Listen to native speakers for correct intonation'],
            difficulty: 'beginner',
        }),
    },
}

export function getDemoTranslation(text: string, sourceLang: string, targetLang: string): {
    translatedText: string
    wordType: string
    grammarExplanation: string
    usageExamples: { original: string; translation: string }[]
    pronunciation: string
    tips: string[]
    difficulty: string
} {
    const key = `${sourceLang}-${targetLang}`
    const langTranslations = DEMO_TRANSLATION[key] || DEMO_TRANSLATION['en-vi']
    return (langTranslations as any)['default'](text)
}
