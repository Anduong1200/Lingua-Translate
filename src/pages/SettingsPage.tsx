import {
    BookOpen,
    Database,
    Globe,
    Palette,
    Settings,
    Sun,
    Volume2,
    User,
    Key,
    Check,
    HardDrive,
    ShieldCheck,
} from 'lucide-react'
import type { ComponentType, ReactNode } from 'react'
import { useStore } from '@/store/useStore'

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
    return (
        <button
            onClick={onChange}
            className={`relative h-6 w-11 rounded-full transition-colors ${checked ? 'bg-teal-600' : 'bg-slate-200 dark:bg-slate-700'}`}
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
    const {
        settings,
        updateSettings,
        isDarkMode,
        toggleDarkMode,
        documents,
        annotations,
        reviewItems,
        knownWords,
        userCorrections,
    } = useStore()

    return (
        <div className="mx-auto flex max-w-5xl flex-col gap-6 pb-8 transition-colors duration-300">
            {/* Page Header */}
            <section className="glass border border-white/60 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 p-6 custom-shadow rounded-3xl backdrop-blur-md">
                <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-600 text-white custom-shadow">
                        <Settings className="h-7 w-7" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">Cài đặt hệ thống</h1>
                        <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
                            Tùy chỉnh hồ sơ đọc local, SQLite backend, từ điển cá nhân và lịch ôn tập offline-first.
                        </p>
                    </div>
                </div>
            </section>

            {/* Core Settings Grid */}
            <section className="grid gap-6 lg:grid-cols-2">
                {/* Local Profile Panel */}
                <div className="custom-shadow overflow-hidden rounded-2xl border border-teal-100/40 dark:border-slate-800 bg-white dark:bg-slate-900/50 backdrop-blur-sm flex flex-col">
                    <div className="border-b border-teal-100/40 dark:border-slate-850 bg-teal-50/20 dark:bg-slate-950/20 px-5 py-4 flex items-center gap-2">
                        <User className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                        <h2 className="font-black text-slate-900 dark:text-slate-100">Hồ sơ cá nhân local</h2>
                    </div>

                    <div className="p-5 flex-1">
                        <div className="space-y-5 animate-fadeIn">
                            <div className="rounded-xl bg-slate-50 dark:bg-slate-950/30 p-4 border border-slate-100 dark:border-slate-800">
                                <div className="flex items-start gap-3">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white">
                                        <HardDrive className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-lg text-slate-900 dark:text-slate-100">Local reader profile</h3>
                                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                                            Dữ liệu học tập được lưu bằng SQLite trên máy này. Không có đăng nhập giả hoặc đồng bộ đám mây giả.
                                        </p>
                                        <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/40 px-2.5 py-0.5 text-xs font-black text-emerald-700 dark:text-emerald-400">
                                            <Check className="h-3 w-3" /> Offline-first active
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <LocalMetric label="Documents" value={documents.length} />
                                <LocalMetric label="Annotations" value={annotations.length} />
                                <LocalMetric label="Review items" value={reviewItems.length} />
                                <LocalMetric label="Known words" value={knownWords.length} />
                            </div>

                            <div className="rounded-xl border border-slate-100 dark:border-slate-800 p-4">
                                <div className="flex items-center gap-2">
                                    <ShieldCheck className="h-4 w-4 text-teal-650 dark:text-teal-400" />
                                    <span className="text-xs font-black text-slate-850 dark:text-slate-300">Personalization source</span>
                                </div>
                                <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-500 dark:text-slate-400">
                                    Nghĩa Việt tự sửa, từ đã biết và domain đọc nhiều được hydrate từ backend local. Backup/restore nằm trong API admin thay vì đồng bộ cloud.
                                </p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <span className="rounded-lg bg-teal-50 px-2 py-1 text-[11px] font-black text-teal-700 dark:bg-teal-950/30 dark:text-teal-300">
                                        {userCorrections.length} corrections
                                    </span>
                                    <span className="rounded-lg bg-cyan-50 px-2 py-1 text-[11px] font-black text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-300">
                                        {settings.targetHskLevel || 'HSK4'}
                                    </span>
                                    <span className="rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-black text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                                        {settings.domainMode || 'auto'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Spaced Repetition Configuration */}
                <div className="custom-shadow overflow-hidden rounded-2xl border border-teal-100/40 dark:border-slate-800 bg-white dark:bg-slate-900/50 backdrop-blur-sm">
                    <div className="border-b border-teal-100/40 dark:border-slate-850 bg-teal-50/20 dark:bg-slate-950/20 px-5 py-4 flex items-center gap-2">
                        <Key className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                        <h2 className="font-black text-slate-900 dark:text-slate-100">Lịch ôn tập local (Simple SRS)</h2>
                    </div>
                    <div className="divide-y divide-teal-50/50 dark:divide-slate-800/60">
                        <SettingRow icon={Database} title="Desired Retention" description="Xác suất ghi nhớ mục tiêu học tập (80% - 95%).">
                            <select
                                value={settings.desiredRetention ?? 0.90}
                                onChange={(event) => updateSettings({ desiredRetention: Number(event.target.value) })}
                                className="rounded-lg border border-teal-100 dark:border-slate-800 bg-teal-50/50 dark:bg-slate-900 px-3 py-2 text-xs font-bold outline-none focus:border-teal-400 text-slate-700 dark:text-slate-300"
                            >
                                <option value="0.80">80% (Dãn cách xa)</option>
                                <option value="0.85">85% (Trung bình)</option>
                                <option value="0.90">90% (Tiêu chuẩn)</option>
                                <option value="0.95">95% (Học liên tục)</option>
                            </select>
                        </SettingRow>

                        <SettingRow icon={Database} title="Learning steps" description="Khoảng cách cho thẻ mới học / sai nghĩa.">
                            <select
                                value={settings.learningSteps ?? '1m 5m 15m'}
                                onChange={(event) => updateSettings({ learningSteps: event.target.value })}
                                className="rounded-lg border border-teal-100 dark:border-slate-800 bg-teal-50/50 dark:bg-slate-900 px-3 py-2 text-xs font-bold outline-none focus:border-teal-400 text-slate-700 dark:text-slate-300"
                            >
                                <option value="1m 5m 15m">1 phút · 5 phút · 15 phút</option>
                                <option value="5m 15m 30m">5 phút · 15 phút · 30 phút</option>
                                <option value="15m 30m 2h">15 phút · 30 phút · 2 giờ</option>
                            </select>
                        </SettingRow>

                        <div className="p-4 bg-slate-50/50 dark:bg-slate-950/10">
                            <p className="text-[11px] leading-relaxed text-slate-450 dark:text-slate-500 font-semibold">
                                * Simple SRS tự động tăng khoảng cách ôn tập nếu bạn đánh giá thẻ đạt mức tốt (Good/Easy). FSRS thật vẫn là bước nâng cấp sau.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Profile Preferences */}
                <div className="custom-shadow overflow-hidden rounded-2xl border border-teal-100/40 dark:border-slate-800 bg-white dark:bg-slate-900/50 backdrop-blur-sm">
                    <div className="border-b border-teal-100/40 dark:border-slate-850 bg-teal-50/20 dark:bg-slate-950/20 px-5 py-4">
                        <h2 className="font-black text-slate-900 dark:text-slate-100">Reading profile</h2>
                    </div>
                    <div className="divide-y divide-teal-50/50 dark:divide-slate-800/60">
                        <SettingRow icon={BookOpen} title="Target HSK" description="Điều chỉnh độ chi tiết khi giải thích cấp độ.">
                            <select
                                value={settings.targetHskLevel || 'HSK4'}
                                onChange={(event) => updateSettings({ targetHskLevel: event.target.value })}
                                className="rounded-lg border border-teal-100 dark:border-slate-800 bg-teal-50/50 dark:bg-slate-900 px-3 py-2 text-xs font-bold outline-none focus:border-teal-400 text-slate-700 dark:text-slate-300"
                            >
                                {['HSK1', 'HSK2', 'HSK3', 'HSK4', 'HSK5', 'HSK6', 'HSK7-9'].map((level) => (
                                    <option key={level} value={level}>
                                        {level}
                                    </option>
                                ))}
                            </select>
                        </SettingRow>

                        <SettingRow icon={Globe} title="Domain mode" description="Ưu tiên nghĩa chuyên ngành theo văn cảnh.">
                            <select
                                value={settings.domainMode || 'auto'}
                                onChange={(event) => updateSettings({ domainMode: event.target.value as any })}
                                className="rounded-lg border border-teal-100 dark:border-slate-800 bg-teal-50/50 dark:bg-slate-900 px-3 py-2 text-xs font-bold outline-none focus:border-teal-400 text-slate-700 dark:text-slate-300"
                            >
                                <option value="auto">Tự động (Auto)</option>
                                <option value="general">Kinh tế & Xã hội</option>
                                <option value="economics">Kinh tế chuyên sâu</option>
                                <option value="computer_science">Công nghệ thông tin</option>
                                <option value="education">Giáo dục & Đời sống</option>
                            </select>
                        </SettingRow>

                        <SettingRow icon={Volume2} title="Pinyin display" description="Ẩn hoặc hiện phiên âm pinyin.">
                            <select
                                value={settings.showPinyinMode || 'always'}
                                onChange={(event) => updateSettings({ showPinyinMode: event.target.value as any })}
                                className="rounded-lg border border-teal-100 dark:border-slate-800 bg-teal-50/50 dark:bg-slate-900 px-3 py-2 text-xs font-bold outline-none focus:border-teal-400 text-slate-700 dark:text-slate-300"
                            >
                                <option value="always">Luôn hiện (Always)</option>
                                <option value="unknown_only">Chỉ hiện từ mới lưu</option>
                                <option value="never">Ẩn pinyin hoàn toàn</option>
                            </select>
                        </SettingRow>

                        <SettingRow icon={BookOpen} title="Translation style" description="Cấu trúc dịch hiển thị trong reader.">
                            <select
                                value={settings.translationStyle || 'both'}
                                onChange={(event) => updateSettings({ translationStyle: event.target.value as any })}
                                className="rounded-lg border border-teal-100 dark:border-slate-800 bg-teal-50/50 dark:bg-slate-900 px-3 py-2 text-xs font-bold outline-none focus:border-teal-400 text-slate-700 dark:text-slate-300"
                            >
                                <option value="both">Dịch sát + Dịch thoát nghĩa</option>
                                <option value="natural">Dịch thuần Việt tự nhiên</option>
                                <option value="literal">Dịch sát mặt chữ hán</option>
                            </select>
                        </SettingRow>
                    </div>
                </div>

                {/* Styling Preferences */}
                <div className="custom-shadow overflow-hidden rounded-2xl border border-teal-100/40 dark:border-slate-800 bg-white dark:bg-slate-900/50 backdrop-blur-sm">
                    <div className="border-b border-teal-100/40 dark:border-slate-850 bg-teal-50/20 dark:bg-slate-950/20 px-5 py-4">
                        <h2 className="font-black text-slate-900 dark:text-slate-100">Giao diện đầu đọc</h2>
                    </div>
                    <div className="divide-y divide-teal-50/50 dark:divide-slate-800/60">
                        <SettingRow icon={Sun} title="Dark mode" description="Kích hoạt theme chế độ tối bảo vệ mắt ban đêm.">
                            <Toggle checked={isDarkMode} onChange={toggleDarkMode} />
                        </SettingRow>

                        <SettingRow icon={Palette} title="Font size" description="Kích thước chữ mặc định cho tài liệu.">
                            <select
                                value={settings.fontSize}
                                onChange={(event) => updateSettings({ fontSize: event.target.value as any })}
                                className="rounded-lg border border-teal-100 dark:border-slate-800 bg-teal-50/50 dark:bg-slate-900 px-3 py-2 text-xs font-bold outline-none focus:border-teal-400 text-slate-700 dark:text-slate-300"
                            >
                                <option value="small">Thon nhỏ</option>
                                <option value="medium">Vừa phải</option>
                                <option value="large">Độ phóng lớn</option>
                            </select>
                        </SettingRow>

                        <SettingRow icon={Database} title="Auto save" description="Tự động lưu lại các annotation tại local SQLite.">
                            <Toggle checked={settings.autoSave} onChange={() => updateSettings({ autoSave: !settings.autoSave })} />
                        </SettingRow>

                        <SettingRow icon={Database} title="Offline cache" description="Giữ offline-first cache cho từ điểnCC-CEDICT.">
                            <Toggle checked={settings.offlineCache} onChange={() => updateSettings({ offlineCache: !settings.offlineCache })} />
                        </SettingRow>
                    </div>
                </div>
            </section>

            <section className="custom-shadow rounded-2xl border border-teal-100/40 dark:border-slate-800 bg-white dark:bg-slate-900/50 backdrop-blur-sm p-5">
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                    <div>
                        <h2 className="font-black text-slate-900 dark:text-slate-100">Local stack</h2>
                        <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                            React/Vite + PDF.js frontend, FastAPI + SQLite + jieba/pypinyin backend. Đăng nhập và đồng bộ từ xa chỉ nên bật khi có implementation thật.
                        </p>
                    </div>
                    <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-250/20 px-3 py-1 text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                        Offline first active
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
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 dark:bg-slate-800 text-teal-700 dark:text-teal-400">
                    <Icon className="h-4 w-4" />
                </div>
                <div>
                    <p className="text-sm font-black text-slate-800 dark:text-slate-200">{title}</p>
                    <p className="text-xs font-semibold text-slate-505 dark:text-slate-400">{description}</p>
                </div>
            </div>
            <div className="shrink-0">{children}</div>
        </div>
    )
}

function LocalMetric({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-xl border border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-950/20">
            <p className="text-[11px] font-black uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-black text-slate-900 dark:text-slate-100">{value}</p>
        </div>
    )
}
