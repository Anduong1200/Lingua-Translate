import type { SliceCreator } from './types'
import { auth } from '@/lib/firebase'
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signInWithPopup, 
    GoogleAuthProvider, 
    signOut,
    onAuthStateChanged
} from 'firebase/auth'

export type UserProfile = {
    id: string
    email: string
    name: string
    avatar?: string
    plan: 'free' | 'premium'
}

export type AuthSlice = {
    user: UserProfile | null
    isLoggingIn: boolean
    isAuthModalOpen: boolean
    isAuthInitialized: boolean
    setAuthModalOpen: (open: boolean) => void
    loginWithEmail: (email: string, password?: string) => Promise<void>
    loginWithGoogle: () => Promise<void>
    logout: () => Promise<void>
    initAuthListener: () => void
}

export const createAuthSlice: SliceCreator<AuthSlice> = (set) => ({
    user: null,
    isLoggingIn: false,
    isAuthModalOpen: false,
    isAuthInitialized: false,

    setAuthModalOpen: (open: boolean) => set({ isAuthModalOpen: open }),

    initAuthListener: () => {
        if (!auth) {
            set({ isAuthInitialized: true })
            return
        }
        onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
                set({
                    user: {
                        id: firebaseUser.uid,
                        email: firebaseUser.email || '',
                        name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
                        avatar: firebaseUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(firebaseUser.displayName || 'U')}&background=0D8ABC&color=fff`,
                        plan: 'premium', // Default to premium for now
                    },
                    isAuthInitialized: true
                })
            } else {
                set({ user: null, isAuthInitialized: true })
            }
        })
    },

    loginWithEmail: async (email: string, password = "defaultPassword123!") => {
        if (!auth) {
            alert("Firebase chưa được cấu hình. Vui lòng kiểm tra .env");
            return;
        }
        set({ isLoggingIn: true })
        try {
            // Attempt to sign in
            await signInWithEmailAndPassword(auth, email, password);
            set({ isLoggingIn: false, isAuthModalOpen: false });
        } catch (error: any) {
            // If user not found, create new account automatically
            if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
                try {
                    await createUserWithEmailAndPassword(auth, email, password);
                    set({ isLoggingIn: false, isAuthModalOpen: false });
                } catch (signUpError) {
                    console.error("Signup error:", signUpError);
                    set({ isLoggingIn: false });
                    alert("Đăng nhập thất bại: " + error.message);
                }
            } else {
                console.error("Login error:", error);
                set({ isLoggingIn: false });
                alert("Đăng nhập thất bại: " + error.message);
            }
        }
    },

    loginWithGoogle: async () => {
        if (!auth) {
            alert("Firebase chưa được cấu hình. Vui lòng kiểm tra .env");
            return;
        }
        set({ isLoggingIn: true })
        try {
            const provider = new GoogleAuthProvider()
            await signInWithPopup(auth, provider)
            set({ isAuthModalOpen: false })
        } catch (error: any) {
            console.error('Google login failed:', error)
            alert(error.message || "Đăng nhập Google thất bại")
        } finally {
            set({ isLoggingIn: false })
        }
    },

    logout: async () => {
        if (!auth) {
            set({ user: null })
            return
        }
        try {
            await signOut(auth)
            set({ user: null })
        } catch (error) {
            console.error('Logout failed:', error)
        }
    },
})
