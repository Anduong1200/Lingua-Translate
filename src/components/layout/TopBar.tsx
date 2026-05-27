import { NavLink } from 'react-router-dom'
import { BookOpenText, Moon, Sun, Upload, UserRound } from 'lucide-react'
import { useStore } from '@/store/useStore'

export default function TopBar() {
    const { isDarkMode, toggleDarkMode, reviewItems } = useStore()
    const dueCount = reviewItems.filter((item) => new Date(item.due_at).getTime() <= Date.now()).length

    return (
        <header className="fixed left-0 right-0 top-0 z-50 h-16 border-b border-teal-100 bg-white/95 backdrop-blur">
            <div className="flex h-full items-center justify-between px-4 md:px-6">
                <NavLink to="/" className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 text-white custom-shadow">
                        <BookOpenText className="h-5 w-5" />
                    </div>
                    <div className="leading-tight">
                        <div className="text-xl font-black tracking-tight">
                            <span className="text-teal-700">Han</span>
                            <span className="text-teal-400">ora</span>
                        </div>
                        <div className="hidden text-[11px] font-semibold uppercase tracking-wider text-slate-400 sm:block">
                            Chinese Context Reader
                        </div>
                    </div>
                </NavLink>

                <nav className="hidden items-center gap-6 text-sm font-semibold text-slate-600 lg:flex">
                    <NavLink to="/reader" className={({ isActive }) => (isActive ? 'text-teal-700' : 'hover:text-teal-700')}>
                        Reader
                    </NavLink>
                    <NavLink to="/vocabulary" className={({ isActive }) => (isActive ? 'text-teal-700' : 'hover:text-teal-700')}>
                        Từ vựng
                    </NavLink>
                    <NavLink to="/flashcards" className={({ isActive }) => (isActive ? 'text-teal-700' : 'hover:text-teal-700')}>
                        Ôn tập
                    </NavLink>
                </nav>

                <div className="flex items-center gap-2">
                    <div className="hidden items-center gap-2 rounded-full border border-teal-100 bg-teal-50 px-3 py-1.5 md:flex">
                        <span className="h-2 w-2 rounded-full bg-amber-400" />
                        <span className="text-xs font-semibold text-teal-800">{dueCount} thẻ cần ôn</span>
                    </div>
                    <NavLink
                        to="/upload"
                        className="flex h-9 items-center gap-2 rounded-lg bg-teal-600 px-3 text-sm font-bold text-white custom-shadow hover:bg-teal-700"
                    >
                        <Upload className="h-4 w-4" />
                        <span className="hidden sm:inline">Tải tệp</span>
                    </NavLink>
                    <button
                        onClick={toggleDarkMode}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-teal-100 bg-white text-slate-500 hover:bg-teal-50 hover:text-teal-700"
                        title={isDarkMode ? 'Chế độ sáng' : 'Chế độ tối'}
                    >
                        {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    </button>
                    <NavLink
                        to="/settings"
                        className="hidden h-9 w-9 items-center justify-center rounded-full bg-teal-100 font-bold text-teal-700 shadow-sm sm:flex"
                        title="Hồ sơ"
                    >
                        <UserRound className="h-4 w-4" />
                    </NavLink>
                </div>
            </div>
        </header>
    )
}
