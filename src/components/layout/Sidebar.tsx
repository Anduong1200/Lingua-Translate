import { NavLink } from 'react-router-dom'
import {
    BookMarked,
    FileText,
    Layers,
    LayoutDashboard,
    Settings,
    Upload,
    BookOpenText,
} from 'lucide-react'
import { useStore } from '@/store/useStore'

const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Bảng điều khiển' },
    { path: '/reader', icon: BookOpenText, label: 'Đọc & phân tích' },
    { path: '/upload', icon: Upload, label: 'Dịch file' },
    { path: '/vocabulary', icon: BookMarked, label: 'Từ vựng' },
    { path: '/flashcards', icon: Layers, label: 'Flashcards' },
    { path: '/settings', icon: Settings, label: 'Cài đặt' },
]

export default function Sidebar() {
    const { savedWords, documents, reviewItems } = useStore()
    const dueCount = reviewItems.filter((item) => new Date(item.due_at).getTime() <= Date.now()).length

    return (
        <aside className="fixed bottom-0 left-0 top-16 z-40 hidden w-64 flex-col border-r border-teal-100 bg-white/95 p-4 backdrop-blur md:flex">
            <section>
                <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">Menu chính</h3>
                <nav className="flex flex-col gap-2">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === '/'}
                            className={({ isActive }) =>
                                `flex items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors ${
                                    isActive
                                        ? 'border-teal-100 bg-teal-50 font-bold text-teal-700'
                                        : 'border-transparent font-semibold text-slate-600 hover:border-slate-200 hover:bg-slate-50'
                                }`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    <item.icon className={`h-5 w-5 ${isActive ? 'text-teal-600' : 'text-slate-400'}`} />
                                    <span>{item.label}</span>
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>
            </section>

            <section className="mt-6 rounded-xl border border-teal-100 bg-teal-50/80 p-4">
                <div className="mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-teal-700" />
                    <h4 className="text-sm font-bold text-slate-800">Workspace</h4>
                </div>
                <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-slate-500">Tài liệu</span>
                        <span className="font-bold text-slate-800">{documents.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-slate-500">Từ đã lưu</span>
                        <span className="font-bold text-slate-800">{savedWords.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-slate-500">Cần ôn</span>
                        <span className="font-bold text-amber-700">{dueCount}</span>
                    </div>
                </div>
            </section>

            <section className="mt-auto rounded-xl bg-gradient-to-br from-teal-600 to-cyan-700 p-4 text-white custom-shadow">
                <h4 className="mb-1 text-sm font-bold">Chinese Reader MVP</h4>
                <p className="mb-3 text-[11px] leading-relaxed text-teal-50">
                    {'PDF.js -> context NLP -> dictionary -> note -> review.'}
                </p>
                <NavLink
                    to="/reader"
                    className="block rounded-lg border border-white/20 bg-white/20 px-3 py-2 text-center text-xs font-bold hover:bg-white/30"
                >
                    Mở Reader
                </NavLink>
            </section>
        </aside>
    )
}
