import { Route, Routes } from 'react-router-dom'
import { useEffect } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import TopBar from '@/components/layout/TopBar'
import DashboardPage from '@/pages/DashboardPage'
import ReaderPage from '@/pages/ReaderPage'
import VocabularyPage from '@/pages/VocabularyPage'
import UploadPage from '@/pages/UploadPage'
import SettingsPage from '@/pages/SettingsPage'
import FlashCardsPage from '@/pages/FlashCardsPage'
import { useStore } from '@/store/useStore'

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
                    <Routes>
                        <Route path="/" element={<DashboardPage />} />
                        <Route path="/reader" element={<ReaderPage />} />
                        <Route path="/upload" element={<UploadPage />} />
                        <Route path="/vocabulary" element={<VocabularyPage />} />
                        <Route path="/flashcards" element={<FlashCardsPage />} />
                        <Route path="/settings" element={<SettingsPage />} />
                    </Routes>
                </div>
            </main>
        </div>
    )
}
