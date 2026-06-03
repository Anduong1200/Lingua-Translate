import { useState } from 'react'
import type { QuizQuestion } from '../readerUtils'
import type { BackendQuizResponse } from '../components/readerShared'
import { API_BASE_URL } from '@/store/slices/types'

export function useReaderQuiz(setSavedNotice: (msg: string) => void) {
    const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([])
    const [quizLoading, setQuizLoading] = useState(false)
    const [quizScore, setQuizScore] = useState(0)
    const [quizFinished, setQuizFinished] = useState(false)
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
    const [selectedAnswerIndex, setSelectedAnswerIndex] = useState<number | null>(null)

    const handleGenerateQuiz = async (payload: any, textContext: string) => {
        if (quizLoading) return
        setQuizLoading(true)
        try {
            const response = await fetch(`${API_BASE_URL}/nlp/quiz`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...payload,
                    text: textContext,
                    limit: 8,
                }),
            })
            if (!response.ok) throw new Error(`Quiz generation failed: ${response.status}`)
            const result = (await response.json()) as BackendQuizResponse
            setQuizQuestions(result.questions || [])
            setQuizScore(0)
            setQuizFinished(false)
            setCurrentQuestionIndex(0)
            setSelectedAnswerIndex(null)
            if (!result.questions?.length) setSavedNotice('Backend chưa tìm đủ từ vựng/ngữ pháp để tạo quiz.')
            else setSavedNotice(`Đã tạo ${result.questions.length} câu hỏi từ backend NLP.`)
        } catch {
            setSavedNotice('Không gọi được backend tạo câu hỏi.')
        } finally {
            setQuizLoading(false)
        }
    }

    const handleQuizAnswer = (answerIndex: number) => {
        if (selectedAnswerIndex !== null) return
        const currentQuestion = quizQuestions[currentQuestionIndex]
        if (!currentQuestion) return
        setSelectedAnswerIndex(answerIndex)
        if (answerIndex === currentQuestion.answerIndex) setQuizScore((score) => score + 1)
        window.setTimeout(() => {
            if (currentQuestionIndex >= quizQuestions.length - 1) {
                setQuizFinished(true)
                return
            }
            setCurrentQuestionIndex((index) => index + 1)
            setSelectedAnswerIndex(null)
        }, 700)
    }

    return {
        quizQuestions, quizLoading, quizScore, quizFinished, currentQuestionIndex, selectedAnswerIndex,
        handleGenerateQuiz, handleQuizAnswer
    }
}
