import { Loader2, Award } from 'lucide-react'
import type { QuizQuestion } from '../readerUtils'

type QuizPanelProps = {
    quizQuestions: QuizQuestion[]
    quizLoading: boolean
    quizScore: number
    quizFinished: boolean
    currentQuestionIndex: number
    selectedAnswerIndex: number | null
    onGenerateQuiz: () => void
    onQuizAnswer: (index: number) => void
}

export default function QuizPanel({
    quizQuestions,
    quizLoading,
    quizScore,
    quizFinished,
    currentQuestionIndex,
    selectedAnswerIndex,
    onGenerateQuiz,
    onQuizAnswer,
}: QuizPanelProps) {
    if (quizQuestions.length === 0) {
        return (
            <div className="h-full flex flex-col justify-between">
                <div className="bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 text-center space-y-4 shadow-sm">
                    <div className="w-12 h-12 rounded-full bg-[#006b5f]/10 ml-auto mr-auto flex items-center justify-center text-[#006b5f]">
                        <Award className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Tạo trắc nghiệm thông minh</h3>
                        <p className="text-xs text-slate-500 mt-1">
                            Hệ thống sẽ quét bài khóa hiện tại và soạn ngẫu nhiên 5 câu hỏi ngữ pháp, phiên âm, ngữ nghĩa giúp bạn ghi nhớ sâu.
                        </p>
                    </div>
                    <button
                        onClick={onGenerateQuiz}
                        disabled={quizLoading}
                        className="w-full bg-[#006b5f] hover:bg-[#005048] text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow shadow-[#006b5f]/20 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {quizLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                        Bắt đầu tạo câu hỏi
                    </button>
                </div>
            </div>
        )
    }

    if (quizFinished) {
        return (
            <div className="h-full flex flex-col justify-between">
                <div className="bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 text-center space-y-4 shadow-sm">
                    <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-500 ml-auto mr-auto flex items-center justify-center text-xl font-black shadow-inner">
                        🎉
                    </div>
                    <div>
                        <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">Hoàn thành thử thách!</h3>
                        <p className="text-sm font-semibold text-slate-500 mt-1">
                            Kết quả: <span className="text-[#006b5f] font-bold">{quizScore} / {quizQuestions.length}</span> câu chính xác
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    const currentQuestion = quizQuestions[currentQuestionIndex]
    return (
        <div className="h-full flex flex-col justify-between">
            <div className="bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                    <span className="text-[11px] font-bold text-[#006b5f] bg-[#006b5f]/10 px-2 py-0.5 rounded-full">
                        Câu hỏi {currentQuestionIndex + 1} / {quizQuestions.length}
                    </span>
                    <span className="text-[11px] text-slate-400">Score: {quizScore}</span>
                </div>
                <h4 className="font-bold text-xs md:text-sm text-slate-800 dark:text-slate-200 leading-snug">
                    {currentQuestion?.question}
                </h4>
                <div className="space-y-2 pt-1">
                    {currentQuestion?.options.map((option: string, oIdx: number) => (
                        <button
                            key={oIdx}
                            onClick={() => onQuizAnswer(oIdx)}
                            disabled={selectedAnswerIndex !== null}
                            className={`w-full text-left p-3 rounded-xl border text-xs transition-colors disabled:cursor-not-allowed ${
                                selectedAnswerIndex === null
                                    ? 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 hover:border-[#006b5f]/30 dark:hover:border-[#006b5f]/30 hover:bg-[#006b5f]/5 dark:hover:bg-teal-900/30'
                                    : oIdx === currentQuestion?.answerIndex
                                        ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300'
                                        : selectedAnswerIndex === oIdx
                                            ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300'
                                            : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500'
                            }`}
                        >
                            {option}
                        </button>
                    ))}
                </div>
                {selectedAnswerIndex !== null && currentQuestion?.explanation && (
                    <p className="rounded-xl bg-[#006b5f]/10 p-3 text-[11px] font-semibold text-[#006b5f] dark:bg-teal-950/30 dark:text-teal-300">
                        {currentQuestion.explanation}
                    </p>
                )}
            </div>
        </div>
    )
}
