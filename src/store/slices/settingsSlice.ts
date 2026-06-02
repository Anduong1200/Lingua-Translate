import type { SliceCreator, SettingsSlice } from './types'
import { API_BASE_URL, defaultSettings } from './types'

export const createSettingsSlice: SliceCreator<SettingsSlice> = (set, get) => ({
    settings: defaultSettings,
    isDarkMode: false,
    isSideBySide: false,

    toggleDarkMode: () =>
        set((state) => {
            const newDark = !state.isDarkMode
            document.documentElement.classList.toggle('dark', newDark)
            document.body.classList.toggle('dark', newDark)
            return { isDarkMode: newDark }
        }),

    toggleSideBySide: () => set((state) => ({ isSideBySide: !state.isSideBySide })),

    updateSettings: (newSettings) => {
        const mergedSettings = { ...get().settings, ...newSettings }
        void fetch(`${API_BASE_URL}/user/profile`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                target_level: mergedSettings.targetHskLevel,
                preferred_domains: [mergedSettings.domainMode || 'general'],
                show_pinyin: mergedSettings.showPinyinMode,
                translation_style: mergedSettings.translationStyle,
                native_language: mergedSettings.targetLanguage || 'vi',
            }),
        }).catch(() => undefined)

        set((state) => ({
            settings: mergedSettings,
            learningProgress: {
                ...state.learningProgress,
                dailyGoal: newSettings.dailyGoal ?? state.learningProgress.dailyGoal,
            },
        }))
    },
})
