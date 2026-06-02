import { FileText, Volume2, Sparkles, AlertCircle } from 'lucide-react'
import type { AIContextPayload, ChineseAnalysis } from '@/types'
import { speakChinese } from '../readerUtils'

type VocabPanelProps = {
    selectedSurface: string
    quickVi: string
    quickEn: string
    quickPinyin: string
    sourceSentence: string
    aiContext: AIContextPayload | null
    activeAnalysis: ChineseAnalysis | null
}

export default function VocabPanel({
    selectedSurface,
    quickVi,
    quickEn,
    quickPinyin,
    sourceSentence,
    aiContext,
    activeAnalysis,
}: VocabPanelProps) {
    if (!selectedSurface) {
        return (
            <div className="space-y-4">
                <div className="h-[200px] flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30">
                    <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-full shadow-sm flex items-center justify-center mb-3">
                        <FileText className="w-5 h-5 text-slate-300" />
                    </div>
                    <p className="text-xs font-medium text-center px-6">
                        Bấm chọn một câu hoặc một từ trong tài liệu để hiển thị bảng phân tích ngữ nghĩa chi tiết.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="space-y-3">
                <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 break-words">
                                {selectedSurface}
                            </h2>
                            {quickPinyin && (
                                <p className="text-sm font-semibold text-[#006b5f] mt-1">
                                    {quickPinyin}
                                </p>
                            )}
                        </div>
                        <button
                            onClick={() => speakChinese(selectedSurface)}
                            className="p-2 bg-slate-100 text-slate-500 rounded-full hover:bg-[#006b5f] hover:text-white transition-colors"
                        >
                            <Volume2 className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="space-y-4">
                        {quickVi && (
                            <div className="bg-[#006b5f]/5 dark:bg-[#006b5f]/10 rounded-xl p-3 border border-[#006b5f]/20 dark:border-[#006b5f]/40">
                                <h3 className="text-[10px] font-bold text-[#006b5f] uppercase tracking-wider mb-1">Nghĩa tiếng Việt</h3>
                                <p className="text-sm text-slate-700 dark:text-slate-300">{quickVi}</p>
                            </div>
                        )}

                        {quickEn && (
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nghĩa tiếng Anh</h3>
                                    <span className="text-[9px] px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded font-semibold">CC-CEDICT</span>
                                </div>
                                {!quickVi && (
                                    <p className="text-xs text-amber-600 dark:text-amber-500 mb-2 font-medium flex items-center gap-1.5">
                                        <AlertCircle className="w-3.5 h-3.5" /> Chưa có nghĩa Việt đáng tin. Hiển thị English fallback.
                                    </p>
                                )}
                                <p className="text-sm text-slate-600 dark:text-slate-400">{quickEn}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Google AI Context Layer */}
                <div className="rounded-2xl border border-amber-100 dark:border-amber-900/30 bg-gradient-to-br from-amber-50 to-orange-50/30 dark:from-amber-950/20 dark:to-orange-950/10 p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-[11px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" />
                            Google AI Context
                        </h3>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                        {aiContext?.response?.context_explanation_vi || sourceSentence}
                    </p>
                </div>
            </div>
        </div>
    )
}
