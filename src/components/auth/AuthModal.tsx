import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '@/store/useStore'
import { X, Sparkles, Mail } from 'lucide-react'

export default function AuthModal() {
    const { isAuthModalOpen, setAuthModalOpen, loginWithGoogle, loginWithEmail, isLoggingIn } = useStore()
    const [email, setEmail] = useState('')

    const handleEmailLogin = (e: React.FormEvent) => {
        e.preventDefault()
        if (email.trim()) {
            loginWithEmail(email)
        }
    }

    return (
        <AnimatePresence>
            {isAuthModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setAuthModalOpen(false)}
                        className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: "spring", duration: 0.45 }}
                        className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white/95 dark:bg-slate-900/95 shadow-2xl border border-white/50 dark:border-slate-800/40 backdrop-blur-xl"
                    >
                        {/* Header */}
                        <div className="relative flex flex-col items-center justify-center bg-teal-50/50 dark:bg-teal-950/20 px-8 py-10 pb-8 text-center">
                            <button
                                onClick={() => setAuthModalOpen(false)}
                                className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer"
                            >
                                <X className="h-5 w-5" />
                            </button>
                            
                            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#006b5f] text-white shadow-lg shadow-[#006b5f]/20">
                                <Sparkles className="h-7 w-7" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-855 dark:text-slate-100 font-display">Chào mừng đến với Hanora</h2>
                            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Đăng nhập để đồng bộ tiến trình học tập của bạn</p>
                        </div>

                        {/* Body */}
                        <div className="px-8 py-8">
                            <div className="space-y-4">
                                {/* Google Login Button */}
                                <button
                                    onClick={loginWithGoogle}
                                    disabled={isLoggingIn}
                                    className="relative flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700/80 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                >
                                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                                        <path
                                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                            fill="#4285F4"
                                        />
                                        <path
                                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                            fill="#34A853"
                                        />
                                        <path
                                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                            fill="#FBBC05"
                                        />
                                        <path
                                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                            fill="#EA4335"
                                        />
                                        <path d="M1 1h22v22H1z" fill="none" />
                                    </svg>
                                    Tiếp tục với Google
                                </button>

                                <div className="relative flex items-center py-2">
                                    <div className="flex-grow border-t border-slate-100 dark:border-slate-800"></div>
                                    <span className="mx-4 shrink-0 text-xs text-slate-400">HOẶC</span>
                                    <div className="flex-grow border-t border-slate-100 dark:border-slate-800"></div>
                                </div>

                                {/* Email Login Form */}
                                <form onSubmit={handleEmailLogin} className="space-y-4">
                                    <div className="relative">
                                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                                            <Mail className="h-5 w-5 text-slate-400" />
                                        </div>
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="Nhập địa chỉ email"
                                            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3.5 pl-11 pr-4 text-xs text-slate-800 outline-none transition-all focus:border-[#006b5f] focus:bg-white focus:ring-4 focus:ring-[#006b5f]/10 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-200 dark:focus:border-teal-500"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={isLoggingIn || !email.trim()}
                                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#006b5f] py-3.5 text-xs font-bold text-white transition-all hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                    >
                                        {isLoggingIn ? 'Đang xử lý...' : 'Đăng nhập bằng Email'}
                                    </button>
                                </form>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
