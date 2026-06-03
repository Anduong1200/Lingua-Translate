import { Route, Routes, useLocation } from 'react-router-dom'
import { lazy, Suspense, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Header from '@/components/layout/Header'
import { useStore } from '@/store/useStore'
import OnboardingModal from '@/features/onboarding/OnboardingModal'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import AuthModal from '@/components/auth/AuthModal'
import { getPageByPath } from '@/config/pages'

const LandingPage = lazy(() => import('@/features/dashboard/LandingPage'))
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'))
const ReaderPage = lazy(() => import('@/features/reader/ReaderPage'))
const VocabularyPage = lazy(() => import('@/features/dictionary/VocabularyPage'))
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'))
const FlashCardsPage = lazy(() => import('@/features/review/FlashCardsPage'))
const StorePage = lazy(() => import('@/features/dashboard/StorePage'))

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
    const { hydrateFromBackend, isDarkMode, initAuthListener } = useStore()
    const location = useLocation()

    useEffect(() => {
        void hydrateFromBackend()
        initAuthListener()
    }, [hydrateFromBackend, initAuthListener])

    useEffect(() => {
        document.documentElement.classList.toggle('dark', isDarkMode)
        document.body.classList.toggle('dark', isDarkMode)
    }, [isDarkMode])

    const currentPage = getPageByPath(location.pathname)
    const isReader = currentPage?.key === 'reader'
    const isLanding = currentPage?.key === 'landing'
    const isDashboard = currentPage?.key === 'dashboard'

    return (
        <div className={`w-full bg-[#f6f8fb] text-slate-800 transition-colors selection:bg-[#006b5f]/20 dark:bg-[#07111f] dark:text-slate-200 relative flex flex-col items-center ${isReader ? 'h-screen overflow-hidden' : 'min-h-screen overflow-x-hidden'}`}>
            {!isReader && !isLanding && <Header />}
            {isDashboard && <OnboardingModal />}
            <AuthModal />

            <main className={`flex-1 w-full mx-auto font-sans relative z-10 ${isReader ? 'p-0 h-full overflow-hidden' : isLanding ? 'p-0 max-w-full' : 'max-w-[1440px] px-4 py-5 sm:px-6'}`}>
                <Suspense fallback={<RouteFallback />}>
                    <AnimatePresence mode="wait">
                        <Routes location={location} key={location.pathname}>
                            {/* Public Route */}
                            <Route path="/" element={<PageTransition><LandingPage /></PageTransition>} />
                            
                            {/* Protected Routes (User Space) */}
                            <Route element={<ProtectedRoute />}>
                                <Route path="/dashboard" element={<PageTransition><DashboardPage /></PageTransition>} />
                                <Route path="/reader" element={<PageTransition isReader={isReader}><ReaderPage /></PageTransition>} />
                                <Route path="/vocabulary" element={<PageTransition><VocabularyPage /></PageTransition>} />
                                <Route path="/flashcards" element={<PageTransition><FlashCardsPage /></PageTransition>} />
                                <Route path="/store" element={<PageTransition><StorePage /></PageTransition>} />
                                <Route path="/settings" element={<PageTransition><SettingsPage /></PageTransition>} />
                            </Route>
                        </Routes>
                    </AnimatePresence>
                </Suspense>
            </main>
        </div>
    )
}
