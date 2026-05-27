import { BookOpen, Database, Globe, Palette, Settings, Sun, Volume2 } from 'lucide-react'
import type { ComponentType, ReactNode } from 'react'
import { useStore } from '@/store/useStore'

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
    return (
        <button
            onClick={onChange}
            className={`relative h-6 w-11 rounded-full transition-colors ${checked ? 'bg-teal-600' : 'bg-slate-200'}`}
            title={checked ? 'Đang bật' : 'Đang tắt'}
        >
            <span
                className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                    checked ? 'translate-x-6' : 'translate-x-1'
                }`}
            />
        </button>
    )
}

export default function SettingsPage() {
    const { settings, updateSettings, isDarkMode, toggleDarkMode } = useStore()

    return (
        <div className="mx-auto flex max-w-5xl flex-col gap-6 pb-8">
            <section className="glass custom-shadow rounded-3xl border border-white p-6">
                <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-600 text-white custom-shadow">
                        <Settings className="h-7 w-7" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-slate-900">Cài đặt Reader</h1>
                        <p className="mt-2 text-sm font-semibold text-slate-500">
                            Tùy chỉnh domain, HSK level, pinyin và lưu trữ offline-first cho MVP.
                        </p>
                    </div>
                </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
                <div className="custom-shadow overflow-hidden rounded-2xl border border-teal-100 bg-white">
                    <div className="border-b border-teal-100 bg-teal-50/40 px-5 py-4">
                        <h2 className="font-black text-slate-900">Reading profile</h2>
                    </div>
                    <div className="divide-y divide-teal-50">
                        <SettingRow icon={BookOpen} title="Target HSK" description="Điều chỉnh độ chi tiết khi giải thích.">
                            <select
                                value={settings.targetHskLevel || 'HSK4'}
                                onChange={(event) => updateSettings({ targetHskLevel: event.target.value })}
                                className="rounded-lg border border-teal-100 bg-teal-50/50 px-3 py-2 text-xs font-bold outline-none focus:border-teal-400"
                            >
                                {['HSK1', 'HSK2', 'HSK3', 'HSK4', 'HSK5', 'HSK6', 'HSK7-9'].map((level) => (
                                    <option key={level} value={level}>
                                        {level}
                                    </option>
                                ))}
                            </select>
                        </SettingRow>

                        <SettingRow icon={Globe} title="Domain mode" description="Ưu tiên nghĩa theo lĩnh vực tài liệu.">
                            <select
                                value={settings.domainMode || 'auto'}
                                onChange={(event) => updateSettings({ domainMode: event.target.value as any })}
                                className="rounded-lg border border-teal-100 bg-teal-50/50 px-3 py-2 text-xs font-bold outline-none focus:border-teal-400"
                            >
                                <option value="auto">Auto</option>
                                <option value="general">General</option>
                                <option value="economics">Economics</option>
                                <option value="computer_science">Computer science</option>
                                <option value="education">Education</option>
                            </select>
                        </SettingRow>

                        <SettingRow icon={Volume2} title="Pinyin display" description="Ẩn/hiện pinyin theo trình độ.">
                            <select
                                value={settings.showPinyinMode || 'always'}
                                onChange={(event) => updateSettings({ showPinyinMode: event.target.value as any })}
                                className="rounded-lg border border-teal-100 bg-teal-50/50 px-3 py-2 text-xs font-bold outline-none focus:border-teal-400"
                            >
                                <option value="always">Always</option>
                                <option value="unknown_only">Unknown only</option>
                                <option value="never">Never</option>
                            </select>
                        </SettingRow>

                        <SettingRow icon={BookOpen} title="Translation style" description="Tự nhiên, sát cấu trúc hoặc cả hai.">
                            <select
                                value={settings.translationStyle || 'both'}
                                onChange={(event) => updateSettings({ translationStyle: event.target.value as any })}
                                className="rounded-lg border border-teal-100 bg-teal-50/50 px-3 py-2 text-xs font-bold outline-none focus:border-teal-400"
                            >
                                <option value="both">Both</option>
                                <option value="natural">Natural</option>
                                <option value="literal">Literal</option>
                            </select>
                        </SettingRow>
                    </div>
                </div>

                <div className="custom-shadow overflow-hidden rounded-2xl border border-teal-100 bg-white">
                    <div className="border-b border-teal-100 bg-teal-50/40 px-5 py-4">
                        <h2 className="font-black text-slate-900">App behavior</h2>
                    </div>
                    <div className="divide-y divide-teal-50">
                        <SettingRow icon={Sun} title="Dark mode" description="Chuyển theme sáng/tối.">
                            <Toggle checked={isDarkMode} onChange={toggleDarkMode} />
                        </SettingRow>

                        <SettingRow icon={Palette} title="Font size" description="Kích thước chữ trong reader.">
                            <select
                                value={settings.fontSize}
                                onChange={(event) => updateSettings({ fontSize: event.target.value as any })}
                                className="rounded-lg border border-teal-100 bg-teal-50/50 px-3 py-2 text-xs font-bold outline-none focus:border-teal-400"
                            >
                                <option value="small">Nhỏ</option>
                                <option value="medium">Vừa</option>
                                <option value="large">Lớn</option>
                            </select>
                        </SettingRow>

                        <SettingRow icon={BookOpen} title="Daily goal" description="Số từ mới mỗi ngày.">
                            <select
                                value={settings.dailyGoal}
                                onChange={(event) => updateSettings({ dailyGoal: Number(event.target.value) })}
                                className="rounded-lg border border-teal-100 bg-teal-50/50 px-3 py-2 text-xs font-bold outline-none focus:border-teal-400"
                            >
                                {[5, 10, 15, 20, 30].map((n) => (
                                    <option key={n} value={n}>
                                        {n} từ
                                    </option>
                                ))}
                            </select>
                        </SettingRow>

                        <SettingRow icon={Database} title="Auto save" description="Lưu annotation và review queue local.">
                            <Toggle checked={settings.autoSave} onChange={() => updateSettings({ autoSave: !settings.autoSave })} />
                        </SettingRow>

                        <SettingRow icon={Database} title="Offline cache" description="Giữ dữ liệu học trên máy.">
                            <Toggle checked={settings.offlineCache} onChange={() => updateSettings({ offlineCache: !settings.offlineCache })} />
                        </SettingRow>
                    </div>
                </div>
            </section>

            <section className="custom-shadow rounded-2xl border border-teal-100 bg-white p-5">
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                    <div>
                        <h2 className="font-black text-slate-900">Local stack</h2>
                        <p className="mt-1 text-sm font-semibold text-slate-500">
                            React/Vite + PDF.js frontend, FastAPI + SQLite + jieba/pypinyin backend.
                        </p>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-emerald-700">
                        No cloud API required
                    </span>
                </div>
            </section>
        </div>
    )
}

function SettingRow({
    icon: Icon,
    title,
    description,
    children,
}: {
    icon: ComponentType<{ className?: string }>
    title: string
    description: string
    children: ReactNode
}) {
    return (
        <div className="flex items-center justify-between gap-4 px-5 py-4">
            <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                    <Icon className="h-4 w-4" />
                </div>
                <div>
                    <p className="text-sm font-black text-slate-800">{title}</p>
                    <p className="text-xs font-semibold text-slate-500">{description}</p>
                </div>
            </div>
            <div className="shrink-0">{children}</div>
        </div>
    )
}
