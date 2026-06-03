import { Link } from 'react-router-dom'
import { Minus, Plus, Settings } from 'lucide-react'

type ReaderTopBarProps = {
    pdfZoom: number
    onZoomOut: () => void
    onZoomIn: () => void
    documentTitle: string
    onUpload?: (file: File) => void
}

export default function ReaderTopBar({ pdfZoom, onZoomOut, onZoomIn, documentTitle, onUpload }: ReaderTopBarProps) {
    return (
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200/50 dark:border-slate-800/40 bg-white/95 dark:bg-slate-900/95 px-6 z-20">
            <div className="flex items-center gap-8">
                <Link to="/" className="flex items-center gap-2 hover:opacity-85 transition-all group">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#006b5f] to-[#0060ac] text-white shadow-md shadow-[#006b5f]/25 group-hover:scale-105 duration-200">
                        <span className="font-display font-black text-lg leading-none">H</span>
                    </div>
                    <span className="text-xl font-display font-black text-[#102a3a] dark:text-slate-100 tracking-tight ml-1">Hanora NLP</span>
                </Link>
                <nav className="hidden items-center gap-6 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 md:flex">
                    <Link to="/dashboard" className="hover:text-[#006b5f] dark:hover:text-teal-400 transition-colors">Documents</Link>
                    <Link to="/vocabulary" className="hover:text-[#006b5f] dark:hover:text-teal-400 transition-colors">Library</Link>
                    <Link to="/flashcards" className="hover:text-[#006b5f] dark:hover:text-teal-400 transition-colors">Study Hub</Link>
                </nav>
            </div>

            <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 rounded-full border border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 px-5 py-2 shadow-lg shadow-slate-100/5 dark:shadow-none">
                    <button onClick={onZoomOut} className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-350 transition-colors"><Minus className="h-4 w-4" /></button>
                    <span className="text-xs font-mono font-black text-slate-700 dark:text-slate-300">{pdfZoom}%</span>
                    <button onClick={onZoomIn} className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-350 transition-colors"><Plus className="h-4 w-4" /></button>
                    <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-2" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[240px]">
                        {documentTitle || 'Giáo trình Hán ngữ.pdf'}
                    </span>
                </div>

                <label className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-250 transition-all border border-transparent hover:border-slate-200/50 dark:hover:border-slate-800 cursor-pointer" title="Load PDF/TXT">
                    <input 
                        type="file" 
                        accept=".pdf,.txt,.docx" 
                        className="hidden" 
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file && onUpload) onUpload(file);
                            e.target.value = '';
                        }}
                    />
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                </label>
                <Link to="/settings" className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-250 transition-all border border-transparent hover:border-slate-200/50 dark:hover:border-slate-800">
                    <Settings className="h-5 w-5" />
                </Link>
                <Link to="/dashboard" className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#006b5f]/10 dark:bg-[#006b5f]/20 text-[#006b5f] dark:text-teal-400 font-black text-xs hover:bg-[#006b5f]/15 dark:hover:bg-teal-950 transition-all border border-[#006b5f]/20 dark:border-[#006b5f]/40">
                    TL
                </Link>
            </div>
        </header>
    )
}
