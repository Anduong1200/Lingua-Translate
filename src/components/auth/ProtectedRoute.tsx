import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useStore } from '@/store/useStore'
import { isAuthRequired, isFirebaseConfigured } from '@/lib/firebase'

export default function ProtectedRoute() {
    const user = useStore((state) => state.user)
    const isAuthInitialized = useStore((state) => state.isAuthInitialized)

    if (!isAuthRequired || !isFirebaseConfigured) {
        return <Outlet />
    }

    if (!isAuthInitialized) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-teal-100 border-t-[#006b5f]" />
            </div>
        )
    }

    if (!user) {
        // Redirect to Landing Page if not authenticated
        return <Navigate to="/" replace />
    }

    // Render the nested routes (User Space)
    return <Outlet />
}
