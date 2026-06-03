import { Award, BookOpen, BookmarkPlus, Brain, History, Loader2, Sparkles, SpellCheck, Volume2 } from 'lucide-react'
import { useStore } from '@/store/useStore'
import type { ChineseAnalysis, ChineseToken, SavedWord } from '@/types'
import { type QuizQuestion, speakChinese } from '../readerUtils'
import { SidebarTab, TranslateScope, ContextTranslationResult, tokenVietnamese, tokenEnglish, tokenPinyin } from './readerShared'
import { ReaderInfoBlock } from './ReaderInfoBlock'
import { QuizPanel } from './QuizPanel'

export function ReaderSidebar({
    selectedSurface,
    quickVi,
    quickEn,
    quickPinyin,
    sourceSentence,
    sentenceTranslation,
    literalTranslation,
    paragraphContext,
    contextTranslation,
    contextTranslationLoading,
    contextTranslateScope,
    analysis,
    aiContext,
    loadingAnalysis,
    generatingAI,
    activeTab,
    setActiveTab,
    savedWords,
    historyList,
    onSave,
    onSaveToken,
    onGenerateAiNote,
    onTranslateScope,
    onSelectHistory,
    quizQuestions,
    quizLoading,
    quizScore,
    quizFinished,
    currentQuestionIndex,
    selectedAnswerIndex,
    onGenerateQuiz,
    onQuizAnswer,
}: {
    selectedSurface: string
    quickVi: string
    quickEn: string
    quickPinyin: string
    sourceSentence: string
    sentenceTranslation: string
    literalTranslation: string
    paragraphContext: string
    contextTranslation: ContextTranslationResult | null
    contextTranslationLoading: boolean
    contextTranslateScope: TranslateScope | null
    analysis: ChineseAnalysis | null
    aiContext: ReturnType<typeof useStore.getState>['aiContext']
    loadingAnalysis: boolean
    generatingAI: boolean
    activeTab: SidebarTab
    setActiveTab: (tab: SidebarTab) => void
    savedWords: SavedWord[]
    historyList: string[]
    onSave: () => void
    onSaveToken: (token: ChineseToken) => void
    onGenerateAiNote: () => void
    onTranslateScope: (scope: TranslateScope) => void
    onSelectHistory: (text: string) => void
    quizQuestions: QuizQuestion[]
    quizLoading: boolean
    quizScore: number
    quizFinished: boolean
    currentQuestionIndex: number
    selectedAnswerIndex: number | null
    onGenerateQuiz: () => void
    onQuizAnswer: (index: number) => void
}) {
    const tokens = analysis?.sentences?.[0]?.tokens?.filter((token) => token.pos !== 'punctuation') ?? []
    const grammarPatterns = analysis?.grammar?.patterns || analysis?.sentences?.[0]?.grammar_patterns || []
    const tabs: Array<{ id: SidebarTab; label: string; icon: React.ReactNode }> = [
        { id: 'dict', label: 'Dict', icon: <BookOpen className="h-3.5 w-3.5" /> },
        { id: 'pinyin', label: 'Pinyin', icon: <SpellCheck className="h-3.5 w-3.5" /> },
        { id: 'ai', label: 'AI', icon: <Brain className="h-3.5 w-3.5" /> },
        { id: 'quiz', label: 'Quiz', icon: <Award className="h-3.5 w-3.5" /> },
    ]
    const roleExplanation =
        contextTranslation?.context?.explanation_vi ||
        analysis?.context?.explanation_vi ||
        (analysis as any)?.role_analysis?.role_explanation_vi ||
        (analysis as any)?.role_analysis?.contextual_role_vi ||
        ''
    const aiNaturalTranslation = contextTranslation?.sentence?.ai_natural_vi || analysis?.translations?.ai_natural_vi || ''
    const resolvedSentenceTranslation = aiNaturalTranslation || contextTranslation?.sentence?.dictionary_vi || sentenceTranslation || quickVi
    const resolvedLiteralTranslation = contextTranslation?.sentence?.literal_vi || literalTranslation
    const resolvedParagraphTranslation = contextTranslation?.paragraph?.dictionary_vi || ''
    const usesDictionaryFallback = Boolean(resolvedSentenceTranslation && !aiNaturalTranslation)

    return (
        <aside className="flex h-[42vh] w-full shrink-0 flex-col border-t border-slate-200/50 bg-white/85 backdrop-blur-xl lg:h-full lg:w-[360px] lg:border-l lg:border-t-0">
            <div className="flex shrink-0 items-center gap-3 border-b border-slate-100 p-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-teal-200/60 bg-teal-50 text-teal-700 shadow-sm">
                    <Brain className="h-6 w-6" />
                </div>
                <div>
                    <h2 className="text-[15px] font-black leading-tight text-slate-800">NLP Analysis</h2>
                    <p className="font-mono text-[10px] font-black uppercase tracking-widest text-teal-600">Deep Dive AI</p>
                </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 custom-scrollbar">
                {loadingAnalysis ? (
                    <div className="flex h-full flex-col items-center justify-center gap-4 py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
                        <div className="text-center">
                            <p className="text-xs font-bold text-slate-700">Đang phân tách ngữ nghĩa...</p>
                            <p className="mt-1 text-[10px] font-medium text-slate-400">Tra từ, pinyin và ngữ pháp theo ngữ cảnh.</p>
                        </div>
                    </div>
                ) : !selectedSurface ? (
                    <div className="flex h-full flex-col items-center justify-center px-4 py-12 text-center">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-teal-100 bg-teal-50 text-teal-600">
                            <Brain className="h-7 w-7" />
                        </div>
                        <h3 className="text-xs font-black text-slate-800">Chưa chọn nội dung phân tích</h3>
                        <p className="mt-2 max-w-[230px] text-[11px] font-medium leading-relaxed text-slate-500">
                            Bôi đen hoặc bấm vào một câu/từ trong tài liệu để xem từ điển, pinyin và ghi chú AI.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-5">
                        <div className="grid grid-cols-4 rounded-xl border border-slate-100 bg-slate-50 p-1">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center justify-center gap-1 rounded-lg px-1 py-1.5 text-[10px] font-black transition ${
                                        activeTab === tab.id ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-500 hover:bg-white hover:text-teal-700'
                                    }`}
                                    title={tab.label}
                                >
                                    {tab.icon}
                                    <span className="hidden xl:inline">{tab.label}</span>
                                </button>
                            ))}
                        </div>

                        <div className="rounded-r-xl border border-teal-100/70 border-l-teal-500 bg-teal-50/25 px-3.5 py-3">
                            <span className="mb-2 inline-block rounded border border-teal-200 bg-teal-50 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-teal-700">
                                Đang chọn
                            </span>
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="break-words text-sm font-black leading-relaxed text-slate-800">{selectedSurface}</p>
                                    {quickPinyin && <p className="mt-1 text-[11px] font-bold text-teal-700">{quickPinyin}</p>}
                                </div>
                                <button onClick={() => speakChinese(selectedSurface)} className="rounded-full bg-white p-2 text-slate-500 shadow-sm transition hover:text-teal-700">
                                    <Volume2 className="h-4 w-4" />
                                </button>
                            </div>
                            {(quickVi || quickEn) && <p className="mt-2 text-[11px] font-semibold italic text-slate-500">"{quickVi || quickEn}"</p>}
                        </div>

                        <div className="space-y-2">
                            <div className="grid grid-cols-3 gap-2">
                                {(['sentence', 'paragraph', 'context'] as const).map((scope) => (
                                    <button
                                        key={scope}
                                        onClick={() => onTranslateScope(scope)}
                                        disabled={contextTranslationLoading}
                                        className="flex items-center justify-center gap-1 rounded-xl border border-teal-100 bg-white px-2 py-2 text-[10px] font-black text-teal-700 transition hover:bg-teal-50 disabled:opacity-60"
                                    >
                                        {contextTranslationLoading && contextTranslateScope === scope ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                                        {scope === 'sentence' ? 'Dịch câu' : scope === 'paragraph' ? 'Dịch đoạn' : 'Context'}
                                    </button>
                                ))}
                            </div>
                            {usesDictionaryFallback && (
                                <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-bold text-amber-800">
                                    Đang dùng bản dịch từ điển cục bộ, chưa phải bản dịch tự nhiên.
                                </p>
                            )}
                            <ReaderInfoBlock label="Bản dịch câu" value={resolvedSentenceTranslation} highlight emptyText="Chưa có bản dịch câu. Bấm Dịch câu hoặc Context để phân tích lại." />
                            {resolvedLiteralTranslation && <ReaderInfoBlock label="Sát nghĩa" value={resolvedLiteralTranslation} />}
                            {resolvedParagraphTranslation && <ReaderInfoBlock label="Bản dịch đoạn" value={resolvedParagraphTranslation} highlight={contextTranslation?.scope === 'paragraph'} />}
                            <ReaderInfoBlock label="Câu gốc" value={sourceSentence || selectedSurface} />
                            <ReaderInfoBlock label="Ngữ cảnh" value={roleExplanation} emptyText="Chưa có ghi chú ngữ cảnh riêng cho lựa chọn này." />
                            {paragraphContext && paragraphContext !== sourceSentence && (
                                <ReaderInfoBlock label="Đoạn liên quan" value={paragraphContext} />
                            )}
                        </div>

                        {activeTab === 'dict' && (
                            <div className="space-y-3">
                                <h3 className="flex items-center gap-1 text-[11px] font-black uppercase tracking-widest text-slate-400">
                                    <BookOpen className="h-3.5 w-3.5 text-teal-600" />
                                    Bóc tách từ vựng ({tokens.length || 1})
                                </h3>
                                {tokens.length ? (
                                    tokens.map((token, index) => {
                                        const saved = savedWords.some((word) => word.word === token.surface)
                                        return (
                                            <div key={`${token.surface}-${index}`} className="group flex items-start gap-3 rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                                                <div className="w-14 shrink-0 rounded-lg border border-teal-100/60 bg-teal-50/60 py-1.5 text-center text-[15px] font-black text-slate-800">
                                                    {token.surface}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-baseline justify-between gap-2">
                                                        <span className="text-xs font-bold text-slate-700">{token.pinyin}</span>
                                                        {token.pos && (
                                                            <span className="rounded-full border border-sky-100 bg-sky-50 px-1.5 py-0.5 text-[8px] font-black text-sky-800">
                                                                {token.pos}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="mt-1 text-xs font-medium leading-normal text-slate-600">{tokenVietnamese(token) || tokenEnglish(token) || 'Chưa có nghĩa trong dữ liệu local.'}</p>
                                                    <button
                                                        disabled={saved}
                                                        onClick={() => onSaveToken(token)}
                                                        className="mt-2 flex items-center gap-1.5 text-[9px] font-black text-teal-600 transition hover:text-teal-800 disabled:text-emerald-600 disabled:opacity-80"
                                                    >
                                                        <BookmarkPlus className="h-3 w-3" />
                                                        {saved ? 'Đã lưu' : 'Lưu vào học phần'}
                                                    </button>
                                                </div>
                                            </div>
                                        )
                                    })
                                ) : (
                                    <button
                                        onClick={onSave}
                                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2.5 text-xs font-black text-teal-700 transition hover:bg-teal-100"
                                    >
                                        <BookmarkPlus className="h-4 w-4" />
                                        Lưu đoạn đang chọn
                                    </button>
                                )}
                            </div>
                        )}

                        {activeTab === 'pinyin' && (
                            <div className="space-y-3">
                                <h3 className="flex items-center gap-1 text-[11px] font-black uppercase tracking-widest text-slate-400">
                                    <SpellCheck className="h-3.5 w-3.5 text-teal-600" />
                                    Phát âm pinyin
                                </h3>
                                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm font-black leading-relaxed tracking-wide text-slate-800 shadow-inner">
                                    {quickPinyin || tokenPinyin(tokens) || 'Chưa có pinyin cho đoạn này.'}
                                </div>
                                {sourceSentence && <p className="text-[10px] font-medium italic text-slate-400">Ngữ cảnh: {sourceSentence}</p>}
                            </div>
                        )}

                        {activeTab === 'ai' && (
                            <div className="space-y-3">
                                <h3 className="flex items-center gap-1 text-[11px] font-black uppercase tracking-widest text-slate-400">
                                    <Brain className="h-3.5 w-3.5 text-teal-600" />
                                    Phân tích ngữ pháp AI
                                </h3>
                                <div className="rounded-2xl border border-teal-100 bg-gradient-to-br from-white to-slate-50/70 p-4 shadow-sm">
                                    <div className="space-y-3 text-xs font-semibold leading-relaxed text-slate-700">
                                        {analysis?.translations?.ai_natural_vi ? (
                                            <p><span className="font-black text-teal-700">Dịch tự nhiên (AI):</span> {analysis.translations.ai_natural_vi}</p>
                                        ) : analysis?.translations?.dictionary_vi ? (
                                            <div className="space-y-1">
                                                <p className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-700">Đang dùng bản dịch từ điển cục bộ, chưa phải bản dịch tự nhiên.</p>
                                                <p><span className="font-black text-teal-700 opacity-80">Dịch từ điển (Fallback):</span> {analysis.translations.dictionary_vi}</p>
                                            </div>
                                        ) : null}
                                        {analysis?.translations?.literal_vi && <p><span className="font-black text-teal-700">Sát nghĩa:</span> {analysis.translations.literal_vi}</p>}
                                        {roleExplanation && <p>{roleExplanation}</p>}
                                        {grammarPatterns.length > 0 ? (
                                            <div className="space-y-2">
                                                {grammarPatterns.map((pattern, index) => (
                                                    <div key={`${pattern.pattern}-${index}`} className="rounded-xl border border-slate-100 bg-white p-3">
                                                        <p className="font-black text-slate-900">{pattern.pattern}</p>
                                                        <p className="mt-1 text-slate-600">{pattern.meaning_vi}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p>Chưa nhận diện được mẫu ngữ pháp nổi bật trong đoạn chọn.</p>
                                        )}
                                        {aiContext?.response?.context_explanation_vi && (
                                            <div className="rounded-xl border border-amber-100 bg-amber-50/70 p-3 text-amber-900">
                                                {aiContext.response.context_explanation_vi}
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-4 grid grid-cols-2 gap-2">
                                        <button
                                            onClick={onGenerateAiNote}
                                            disabled={generatingAI}
                                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-3 py-2 text-[11px] font-black text-white transition hover:bg-teal-700 disabled:opacity-60"
                                        >
                                            {generatingAI ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                                            AI Context
                                        </button>
                                        <button
                                            onClick={onSave}
                                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-teal-600 px-3 py-2 text-[11px] font-black text-teal-700 transition hover:bg-teal-50"
                                        >
                                            <BookmarkPlus className="h-3.5 w-3.5" />
                                            Lưu cấu trúc
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'quiz' && (
                            <QuizPanel
                                quizQuestions={quizQuestions}
                                quizLoading={quizLoading}
                                quizScore={quizScore}
                                quizFinished={quizFinished}
                                currentQuestionIndex={currentQuestionIndex}
                                selectedAnswerIndex={selectedAnswerIndex}
                                onGenerateQuiz={onGenerateQuiz}
                                onQuizAnswer={onQuizAnswer}
                            />
                        )}
                    </div>
                )}
            </div>

            {historyList.length > 0 && selectedSurface && (
                <div className="shrink-0 border-t border-slate-100 bg-slate-50/60 p-3">
                    <span className="mb-2 flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-slate-400">
                        <History className="h-3 w-3 text-teal-600" />
                        Vừa phân tích
                    </span>
                    <div className="flex max-h-16 flex-wrap gap-1.5 overflow-y-auto">
                        {historyList.slice(0, 6).map((item) => (
                            <button
                                key={item}
                                onClick={() => onSelectHistory(item)}
                                className="max-w-[140px] truncate rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 transition hover:border-teal-300 hover:bg-teal-50"
                            >
                                {item}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </aside>
    )
}

