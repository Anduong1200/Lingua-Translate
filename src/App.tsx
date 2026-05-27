import { Route, Routes } from 'react-router-dom'
import { lazy, Suspense, useEffect } from 'react'
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
        <div className="flex h-full items-center justify-center rounded-3xl border border-white bg-white/80 text-sm font-black text-teal-700 custom-shadow">
            Đang tải giao diện...
        </div>
    )
}

export default function App() {
    const hydrateFromBackend = useStore((state) => state.hydrateFromBackend)

    useEffect(() => {
        void hydrateFromBackend()
    }, [hydrateFromBackend])

    return (
        <div className="h-screen overflow-hidden bg-gradient-to-br from-teal-50 via-cyan-50 to-emerald-50 font-sans text-slate-800 selection:bg-teal-200">
            <TopBar />
            <Sidebar />
            <main className="h-full overflow-hidden pt-16 md:pl-64">
                <div className="mx-auto h-full w-full max-w-[1600px] overflow-y-auto px-4 py-5 md:px-6">
                    <Suspense fallback={<RouteFallback />}>
                        <Routes>
                            <Route path="/" element={<DashboardPage />} />
                            <Route path="/reader" element={<ReaderPage />} />
                            <Route path="/upload" element={<UploadPage />} />
                            <Route path="/vocabulary" element={<VocabularyPage />} />
                            <Route path="/flashcards" element={<FlashCardsPage />} />
                            <Route path="/settings" element={<SettingsPage />} />
                        </Routes>
                    </Suspense>
                </div>
            </main>
        </div>
    )
}
