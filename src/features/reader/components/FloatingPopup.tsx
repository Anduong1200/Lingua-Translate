import { Brain, Highlighter, BookMarked } from 'lucide-react'

type FloatingPopupProps = {
    popupCoords: { x: number; y: number }
    onAnalyze: () => void
    onSave: () => void
    onReview: () => void
    canSave: boolean
}

export default function FloatingPopup({ popupCoords, onAnalyze, onSave, onReview, canSave }: FloatingPopupProps) {
    return (
        <div
            style={{
                position: 'fixed',
                left: Math.min(window.innerWidth - 200, Math.max(10, popupCoords.x - 100)),
                top: Math.max(10, popupCoords.y - 70),
            }}
            className="floating-popup z-[100] flex items-center gap-1.5 rounded-2xl border border-white/10 bg-slate-900/95 px-3 py-2 shadow-2xl shadow-black/50 backdrop-blur-xl transition-all"
        >
            <button
                onClick={onAnalyze}
                className="group flex flex-col items-center gap-1 text-teal-300 hover:text-teal-200 px-2"
                title="Analyze"
            >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-500/10 transition-colors group-hover:bg-teal-500/20">
                    <Brain className="h-4 w-4" />
                </span>
                <span className="text-[10px] font-black">Analyze</span>
            </button>
            <div className="h-8 w-px bg-slate-700/60" />
            <button
                onClick={onSave}
                disabled={!canSave}
                className="group flex flex-col items-center gap-1 text-slate-300 hover:text-white px-2 disabled:cursor-not-allowed disabled:opacity-45"
                title="Highlight"
            >
                <span className="flex h-8 w-8 items-center justify-center rounded-full transition-colors group-hover:bg-blue-500/20">
                    <Highlighter className="h-4 w-4" />
                </span>
                <span className="text-[10px] font-black">Highlight</span>
            </button>
            <div className="h-8 w-px bg-slate-700/60" />
            <button
                onClick={onReview}
                className="group flex flex-col items-center gap-1 text-slate-300 hover:text-white px-2"
                title="Review"
            >
                <span className="flex h-8 w-8 items-center justify-center rounded-full transition-colors group-hover:bg-amber-500/20">
                    <BookMarked className="h-4 w-4" />
                </span>
                <span className="text-[10px] font-black">Review</span>
            </button>
        </div>
    )
}
