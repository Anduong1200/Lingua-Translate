import { useState } from 'react'
import { Bell, Bug, HelpCircle, LogOut, Moon, Sparkles, Sun, UserCircle } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { Link, useLocation } from 'react-router-dom'
import { useStore } from '@/store/useStore'
import BugReportModal from '@/components/BugReportModal'
import { getPageByPath, primaryNavPages, utilityNavPages, workspacePageCount } from '@/config/pages'

export default function Header() {
    const [showNotification, setShowNotification] = useState(false)
    const [showProfileMenu, setShowProfileMenu] = useState(false)
    const [showBugReport, setShowBugReport] = useState(false)
    const { isDarkMode, toggleDarkMode, user, setAuthModalOpen, logout } = useStore()
    const location = useLocation()
    const currentPage = getPageByPath(location.pathname)
    const CurrentIcon = currentPage?.icon ?? Sparkles
    const userInitials = user ? user.name.slice(0, 2).toUpperCase() : 'G'
    const userName = user ? user.name : 'Guest'

    return (
        <header className="sticky top-0 z-40 w-full border-b border-slate-200/70 bg-white/88 backdrop-blur-xl shadow-sm dark:border-slate-800 dark:bg-slate-950/86">
            <div className="mx-auto flex min-h-[68px] w-full max-w-[1440px] items-center gap-4 px-4 sm:px-6">
                <Link to="/dashboard" className="flex shrink-0 items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#006b5f] text-white shadow-sm shadow-teal-700/20">
                        <Sparkles className="h-4.5 w-4.5" />
                    </div>
                    <div className="leading-tight">
                        <p className="text-lg font-black tracking-tight text-[#006b5f] dark:text-teal-300">Hanora</p>
                        <p className="hidden text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 sm:block">{workspacePageCount} workspace pages</p>
                    </div>
                </Link>

                <div className="hidden min-w-0 flex-1 items-center justify-center lg:flex">
                    <nav className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1 text-xs font-black text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                        {primaryNavPages.map((page) => {
                            const isActive = location.pathname.startsWith(page.path)
                            const PageIcon = page.icon
                            return (
                                <Link
                                    key={page.key}
                                    to={page.path}
                                    className={`flex items-center gap-2 rounded-xl px-3.5 py-2 transition ${
                                        isActive
                                            ? 'bg-white text-[#006b5f] shadow-sm dark:bg-slate-950 dark:text-teal-300'
                                            : 'hover:bg-white/80 hover:text-[#006b5f] dark:hover:bg-slate-950/80 dark:hover:text-teal-300'
                                    }`}
                                >
                                    <PageIcon className="h-3.5 w-3.5" />
                                    {page.shortLabel}
                                </Link>
                            )
                        })}
                    </nav>
                </div>

                <div className="hidden min-w-0 flex-1 items-center gap-3 rounded-2xl border border-slate-200/70 bg-slate-50/80 px-3 py-2 md:flex lg:max-w-sm lg:flex-none dark:border-slate-800 dark:bg-slate-900/70">
                    <CurrentIcon className="h-4.5 w-4.5 shrink-0 text-[#006b5f] dark:text-teal-300" />
                    <div className="min-w-0">
                        <p className="truncate text-xs font-black text-slate-900 dark:text-slate-100">{currentPage?.label}</p>
                        <p className="truncate text-[10px] font-semibold text-slate-500 dark:text-slate-400">{currentPage?.description}</p>
                    </div>
                </div>

                <div className="ml-auto flex shrink-0 items-center gap-2">
                    {utilityNavPages.map((page) => {
                        const PageIcon = page.icon
                        const isActive = location.pathname.startsWith(page.path)
                        return (
                            <Link
                                key={page.key}
                                to={page.path}
                                className={`hidden h-10 w-10 items-center justify-center rounded-xl border transition sm:flex ${
                                    isActive
                                        ? 'border-teal-200 bg-teal-50 text-[#006b5f] dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-300'
                                        : 'border-slate-200 bg-white text-slate-500 hover:border-teal-200 hover:text-[#006b5f] dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400'
                                }`}
                                title={page.label}
                            >
                                <PageIcon className="h-4.5 w-4.5" />
                            </Link>
                        )
                    })}

                    <button
                        onClick={toggleDarkMode}
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-teal-200 hover:text-[#006b5f] dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:text-teal-300"
                        title={isDarkMode ? 'Chuyển sang sáng' : 'Chuyển sang tối'}
                    >
                        {isDarkMode ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
                    </button>

                    <button
                        onClick={() => setShowNotification((value) => !value)}
                        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-teal-200 hover:text-[#006b5f] dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                        title="Thông báo"
                    >
                        <Bell className="h-4.5 w-4.5" />
                        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-400 ring-2 ring-white dark:ring-slate-950" />
                    </button>

                    {user ? (
                        <button
                            onClick={() => setShowProfileMenu((value) => !value)}
                            className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#006b5f] text-xs font-black text-white shadow-sm transition hover:bg-[#005048]"
                            title={userName}
                        >
                            {userInitials}
                        </button>
                    ) : (
                        <button
                            onClick={() => setAuthModalOpen(true)}
                            className="rounded-xl bg-[#006b5f] px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-[#005048]"
                        >
                            Đăng nhập
                        </button>
                    )}
                </div>
            </div>

            <div className="border-t border-slate-100 px-3 py-2 lg:hidden dark:border-slate-800">
                <nav className="mx-auto flex max-w-[1440px] gap-2 overflow-x-auto scrollbar-hide">
                    {primaryNavPages.map((page) => {
                        const isActive = location.pathname.startsWith(page.path)
                        const PageIcon = page.icon
                        return (
                            <Link
                                key={page.key}
                                to={page.path}
                                className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black ${
                                    isActive
                                        ? 'border-teal-200 bg-teal-50 text-[#006b5f] dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-300'
                                        : 'border-slate-200 bg-white text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400'
                                }`}
                            >
                                <PageIcon className="h-3.5 w-3.5" />
                                {page.shortLabel}
                            </Link>
                        )
                    })}
                </nav>
            </div>

            <AnimatePresence>
                {showNotification && (
                    <>
                        <button className="fixed inset-0 z-40 cursor-default" onClick={() => setShowNotification(false)} />
                        <motion.div
                            initial={{ opacity: 0, y: 8, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 8, scale: 0.98 }}
                            className="absolute right-20 top-[58px] z-50 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-slate-950"
                        >
                            <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">Thông báo</h3>
                                <span className="text-[11px] font-bold text-[#006b5f] dark:text-teal-300">Đã đọc</span>
                            </div>
                            <div className="rounded-xl bg-teal-50 p-3 dark:bg-teal-950/30">
                                <p className="text-xs font-bold text-slate-800 dark:text-slate-100">Workspace đã thống nhất menu.</p>
                                <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">Header dùng chung registry cho tất cả trang.</p>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showProfileMenu && user && (
                    <>
                        <button className="fixed inset-0 z-40 cursor-default" onClick={() => setShowProfileMenu(false)} />
                        <motion.div
                            initial={{ opacity: 0, y: 8, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 8, scale: 0.98 }}
                            className="absolute right-4 top-[58px] z-50 w-64 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-slate-950"
                        >
                            <div className="mb-3 border-b border-slate-100 pb-3 text-center dark:border-slate-800">
                                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-[#006b5f] text-sm font-black text-white">
                                    {userInitials}
                                </div>
                                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">{userName}</h3>
                                <p className="truncate text-xs text-slate-400">{user.email}</p>
                            </div>
                            <div className="space-y-1 text-xs font-bold text-slate-600 dark:text-slate-300">
                                <Link to="/settings" onClick={() => setShowProfileMenu(false)} className="flex items-center gap-2 rounded-xl p-2 hover:bg-slate-50 dark:hover:bg-slate-900">
                                    <UserCircle className="h-4 w-4 text-[#006b5f]" />
                                    Cài đặt tài khoản
                                </Link>
                                <button className="flex w-full items-center gap-2 rounded-xl p-2 text-left hover:bg-slate-50 dark:hover:bg-slate-900">
                                    <HelpCircle className="h-4 w-4 text-[#006b5f]" />
                                    Hướng dẫn sử dụng
                                </button>
                                <button
                                    onClick={() => {
                                        setShowProfileMenu(false)
                                        setShowBugReport(true)
                                    }}
                                    className="flex w-full items-center gap-2 rounded-xl p-2 text-left text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/20"
                                >
                                    <Bug className="h-4 w-4" />
                                    Góp ý & báo lỗi
                                </button>
                                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                                <button
                                    onClick={() => {
                                        setShowProfileMenu(false)
                                        logout()
                                    }}
                                    className="flex w-full items-center gap-2 rounded-xl p-2 text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                                >
                                    <LogOut className="h-4 w-4" />
                                    Đăng xuất
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <BugReportModal isOpen={showBugReport} onClose={() => setShowBugReport(false)} />
        </header>
    )
}
