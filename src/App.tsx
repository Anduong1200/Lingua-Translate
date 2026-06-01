import { Route, Routes, useLocation } from 'react-router-dom'
import { lazy, Suspense, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Header from '@/components/layout/Header'
import { useStore } from '@/store/useStore'

const LandingPage = lazy(() => import('@/features/dashboard/LandingPage'))
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'))
const ReaderPage = lazy(() => import('@/features/reader/ReaderPage'))
const VocabularyPage = lazy(() => import('@/features/dictionary/VocabularyPage'))
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'))
const FlashCardsPage = lazy(() => import('@/features/review/FlashCardsPage'))

function RouteFallback() {
    return (
        <div className="flex h-full min-h-[500px] items-center justify-center">
            <div className="flex flex-col items-center gap-5">
                <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-teal-100 border-t-[#006b5f]" />
                <p className="text-base font-semibold text-slate-400">Loading...</p>
            </div>
        </div>
    )
}

function PageTransition({ children, isReader }: { children: React.ReactNode, isReader?: boolean }) {
    return (
        <motion.div className={`w-full min-w-0 ${isReader ? 'h-full' : ''}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
        >
            {children}
        </motion.div>
    )
}

export default function App() {
    const { hydrateFromBackend, isDarkMode } = useStore()
    const location = useLocation()

    useEffect(() => {
        void hydrateFromBackend()
    }, [hydrateFromBackend])

    useEffect(() => {
        document.documentElement.classList.toggle('dark', isDarkMode)
        document.body.classList.toggle('dark', isDarkMode)
    }, [isDarkMode])

    const isReader = location.pathname === '/reader';
    const isLanding = location.pathname === '/';

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-[#eef0ff] via-[#d4e3ff]/60 to-[#faf8ff] dark:from-[#0b0f19] dark:via-[#090d16] dark:to-[#020617] text-slate-800 dark:text-slate-200 transition-colors selection:bg-[#006b5f]/20 relative overflow-x-hidden flex flex-col items-center">

            {/* Absolute top decorative design spots */}
            <div className="absolute top-[-10%] left-[-10%] w-[45vw] h-[45vw] bg-teal-200/20 dark:bg-teal-500/5 rounded-full filter blur-[120px] pointer-events-none" />
            <div className="absolute top-[-5%] right-[-5%] w-[35vw] h-[35vw] bg-sky-200/20 dark:bg-sky-500/5 rounded-full filter blur-[100px] pointer-events-none" />

            {/* Conditionally render Header on non-reader pages */}
            {!isReader && !isLanding && <Header />}

            <main className={`flex-1 w-full mx-auto font-sans relative z-10 ${isReader ? 'p-0 h-[calc(100vh-64px)]' : isLanding ? 'p-0 max-w-full' : 'max-w-7xl px-6 py-6'}`}>
                <Suspense fallback={<RouteFallback />}>
                    <AnimatePresence mode="wait">
                        <Routes location={location} key={location.pathname}>
                            <Route path="/" element={<PageTransition><LandingPage /></PageTransition>} />
                            <Route path="/dashboard" element={<PageTransition><DashboardPage /></PageTransition>} />
                            <Route path="/reader" element={<PageTransition isReader={isReader}><ReaderPage /></PageTransition>} />
                            <Route path="/vocabulary" element={<PageTransition><VocabularyPage /></PageTransition>} />
                            <Route path="/flashcards" element={<PageTransition><FlashCardsPage /></PageTransition>} />
                            <Route path="/settings" element={<PageTransition><SettingsPage /></PageTransition>} />
                        </Routes>
                    </AnimatePresence>
                </Suspense>
            </main>
        </div>
    )
}
