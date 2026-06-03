import {
    BookMarked,
    BookOpen,
    Home,
    Layers,
    LayoutDashboard,
    Settings as SettingsIcon,
    ShoppingBag,
    type LucideIcon,
} from 'lucide-react'

export type AppPageKey = 'landing' | 'dashboard' | 'reader' | 'vocabulary' | 'flashcards' | 'store' | 'settings'

export type AppPage = {
    key: AppPageKey
    path: string
    label: string
    shortLabel: string
    description: string
    icon: LucideIcon
    group: 'public' | 'workspace' | 'commerce' | 'system'
    showInPrimaryNav: boolean
    showInUtilityNav: boolean
}

export const appPages: AppPage[] = [
    {
        key: 'landing',
        path: '/',
        label: 'Trang chủ',
        shortLabel: 'Home',
        description: 'Giới thiệu Hanora và điểm vào đăng nhập.',
        icon: Home,
        group: 'public',
        showInPrimaryNav: false,
        showInUtilityNav: false,
    },
    {
        key: 'dashboard',
        path: '/dashboard',
        label: 'Bảng điều khiển',
        shortLabel: 'Dashboard',
        description: 'Tổng quan tài liệu, upload file và tiến độ học.',
        icon: LayoutDashboard,
        group: 'workspace',
        showInPrimaryNav: true,
        showInUtilityNav: false,
    },
    {
        key: 'reader',
        path: '/reader',
        label: 'Reader',
        shortLabel: 'Reader',
        description: 'Đọc, dịch câu/đoạn và phân tích NLP theo ngữ cảnh.',
        icon: BookOpen,
        group: 'workspace',
        showInPrimaryNav: true,
        showInUtilityNav: false,
    },
    {
        key: 'vocabulary',
        path: '/vocabulary',
        label: 'Từ vựng',
        shortLabel: 'Vocabulary',
        description: 'Quản lý từ đã lưu, nghĩa cá nhân và trạng thái thuộc.',
        icon: BookMarked,
        group: 'workspace',
        showInPrimaryNav: true,
        showInUtilityNav: false,
    },
    {
        key: 'flashcards',
        path: '/flashcards',
        label: 'Ôn tập',
        shortLabel: 'Study',
        description: 'Flashcards và hàng đợi SRS.',
        icon: Layers,
        group: 'workspace',
        showInPrimaryNav: true,
        showInUtilityNav: false,
    },
    {
        key: 'store',
        path: '/store',
        label: 'Kho mở rộng',
        shortLabel: 'Store',
        description: 'Gói từ điển, dữ liệu chuyên ngành và license.',
        icon: ShoppingBag,
        group: 'commerce',
        showInPrimaryNav: true,
        showInUtilityNav: false,
    },
    {
        key: 'settings',
        path: '/settings',
        label: 'Cài đặt',
        shortLabel: 'Settings',
        description: 'Tùy chọn hệ thống, AI consent, backup và tài khoản.',
        icon: SettingsIcon,
        group: 'system',
        showInPrimaryNav: false,
        showInUtilityNav: true,
    },
]

export const primaryNavPages = appPages.filter((page) => page.showInPrimaryNav)
export const utilityNavPages = appPages.filter((page) => page.showInUtilityNav)
export const workspacePageCount = appPages.filter((page) => page.group !== 'public').length
export const totalPageCount = appPages.length

export function getPageByPath(pathname: string) {
    if (pathname === '/') return appPages.find((page) => page.key === 'landing')
    return appPages.find((page) => page.path !== '/' && pathname.startsWith(page.path)) ?? appPages.find((page) => page.key === 'dashboard')
}
