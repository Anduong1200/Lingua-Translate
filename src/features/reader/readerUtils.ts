import { AIContextReadingResult, ChineseSentenceAnalysis, ChineseToken } from '@/types'
import { getVietnameseDefinition } from '@/lib/chinese'

export type PdfSelection = {
    selectedText: string
    pageNumber: number
    bboxJson: string
    sourceSentence: string
    paragraphContext: string
    pageContext: string
}

export type PanelTab = 'chat' | 'quiz' | 'vocab'

export type ChatMessage = {
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: string
}

export type QuizQuestion = {
    question: string
    options: string[]
    answerIndex: number
    explanation: string
}

export function isSelectableToken(token: ChineseToken) {
    return token.definitions.length > 0 && token.pos !== 'punctuation' && token.surface.trim().length > 0
}

export function speakChinese(text: string) {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-CN'
    speechSynthesis.speak(utterance)
}

export function findSentenceForSelection(context: string, selectedText: string) {
    const selected = selectedText.trim()
    if (!context.trim()) return selected
    const sentence = context
        .replace(/\r/g, '')
        .split(/(?<=[。！？!?])\s*|\n+/)
        .map((item) => item.trim())
        .find((item) => item.includes(selected))
    return sentence || selected
}

export function messageTime() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function formatAiChatReply(result: AIContextReadingResult | null) {
    if (!result) return 'Không tạo được phản hồi AI lúc này.'
    const ai = result.ai
    const response = ai.response
    if (ai.status !== 'ok' || !response) {
        const fallback = result.rule_based.context?.explanation_vi || result.rule_based.translations?.dictionary_vi || result.rule_based.text
        return [
            ai.message || 'AI chưa sẵn sàng hoặc chưa cấu hình API key.',
            fallback ? `Phân tích local: ${fallback}` : '',
        ].filter(Boolean).join('\n\n')
    }

    return [
        response.ai_natural_vi ? `Dịch tự nhiên (AI): ${response.ai_natural_vi}` : response.dictionary_vi ? `Dịch từ điển (Fallback): ${response.dictionary_vi}` : '',
        response.context_explanation_vi ? `Ngữ cảnh: ${response.context_explanation_vi}` : '',
        response.grammar_notes?.length
            ? `Ngữ pháp: ${response.grammar_notes.map((note) => `${note.pattern} - ${note.meaning_vi}`).join('; ')}`
            : '',
        response.nuance_vi ? `Sắc thái: ${response.nuance_vi}` : '',
    ].filter(Boolean).join('\n\n') || response.raw_text || 'AI đã phản hồi nhưng không có nội dung có cấu trúc.'
}

export function buildQuizQuestions(sourceSentences: ChineseSentenceAnalysis[]): QuizQuestion[] {
    const tokenRows = sourceSentences.flatMap((sentence) =>
        sentence.tokens
            .filter(isSelectableToken)
            .map((token) => ({
                token,
                sentence: sentence.text,
                answer: getVietnameseDefinition(token),
            })),
    )
    const uniqueRows = Array.from(new Map(tokenRows.filter((row) => row.answer).map((row) => [row.token.surface, row])).values())
    const fallbackAnswers = ['từ/cụm trong ngữ cảnh', 'cấu trúc ngữ pháp', 'trạng thái hoàn thành', 'từ chỉ quan hệ logic']

    return uniqueRows.slice(0, 5).map((row, index) => {
        const distractors = uniqueRows
            .filter((item) => item.token.surface !== row.token.surface)
            .map((item) => item.answer)
            .filter((answer, answerIndex, answers) => answer && answers.indexOf(answer) === answerIndex)
        const options = [row.answer, ...distractors, ...fallbackAnswers]
            .filter((answer, answerIndex, answers) => answer && answers.indexOf(answer) === answerIndex)
            .slice(0, 4)
        while (options.length < 4) {
            options.push(`Gợi ý khác ${options.length}`)
        }
        const answerIndex = index % options.length
        const correctAnswer = options[0]
        options[0] = options[answerIndex]
        options[answerIndex] = correctAnswer
        return {
            question: `Trong câu "${row.sentence}", nghĩa phù hợp của "${row.token.surface}" là gì?`,
            options,
            answerIndex,
            explanation: `${row.token.surface} (${row.token.pinyin}) = ${row.answer}`,
        }
    })
}
