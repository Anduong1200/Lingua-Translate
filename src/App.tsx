import { Route, Routes } from 'react-router-dom'
import { lazy, Suspense, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Sidebar from '@/components/layout/Sidebar'
import TopBar from '@/components/layout/TopBar'
import { useStore } from '@/store/useStore'

const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const ReaderPage = lazy(() => import('@/pages/ReaderPage'))
const VocabularyPage = lazy(() => import('@/pages/VocabularyPage'))
const UploadPage = lazy(() => import('@/pages/UploadPage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))
const FlashCardsPage = lazy(() => import('@/pages/FlashCardsPage'))

function RouteFallback() {
    return (
        <div className="flex h-full min-h-[500px] items-center justify-center">
            <div className="flex flex-col items-center gap-5">
                <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-teal-100 border-t-teal-500" />
                <p className="text-base font-semibold text-slate-400">Loading...</p>
            </div>
        </div>
    )
}

function PageTransition({ children }: { children: React.ReactNode }) {
    return (
        <motion.div className="w-full min-w-0"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
            {children}
        </motion.div>
    )
}

export default function App() {
    const hydrateFromBackend = useStore((state) => state.hydrateFromBackend)

    useEffect(() => {
        void hydrateFromBackend()
    }, [hydrateFromBackend])

    return (
        <div className="h-screen overflow-hidden bg-[#eefaf6] font-sans text-slate-800 selection:bg-teal-200/50 dark:bg-slate-900 dark:text-slate-100">
            <TopBar />
            <Sidebar />

            <main className="flex h-full min-h-0 w-full pt-[72px] md:pl-[300px]">
                <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
                    <div className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 md:px-8 lg:px-10 xl:px-12">
                        <Suspense fallback={<RouteFallback />}>
                            <AnimatePresence mode="wait">
                                <Routes>
                                    <Route path="/" element={<PageTransition><DashboardPage /></PageTransition>} />
                                    <Route path="/reader" element={<PageTransition><ReaderPage /></PageTransition>} />
                                    <Route path="/upload" element={<PageTransition><UploadPage /></PageTransition>} />
                                    <Route path="/vocabulary" element={<PageTransition><VocabularyPage /></PageTransition>} />
                                    <Route path="/flashcards" element={<PageTransition><FlashCardsPage /></PageTransition>} />
                                    <Route path="/settings" element={<PageTransition><SettingsPage /></PageTransition>} />
                                </Routes>
                            </AnimatePresence>
                        </Suspense>
                    </div>
                </div>
            </main>
        </div>
    )
}
