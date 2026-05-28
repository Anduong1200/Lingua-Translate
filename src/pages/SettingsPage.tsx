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
            className={`relative h-6 w-12 rounded-full transition-colors duration-250 cursor-pointer focus:outline-none ${
                checked ? 'bg-gradient-to-r from-teal-500 to-[#0d9488] shadow-md shadow-teal-500/10' : 'bg-slate-200 dark:bg-slate-800'
            }`}
            title={checked ? 'Đang bật' : 'Đang tắt'}
        >
            <span
                className={`absolute top-1.5 h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-250 ${
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
            <section className="glass border border-white/60 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 p-7 custom-shadow rounded-[2rem] backdrop-blur-md">
                <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0d9488] to-teal-500 text-white shadow-lg shadow-teal-500/20">
                        <Settings className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-display font-black tracking-tight text-slate-900 dark:text-slate-100">Cài đặt hệ thống</h1>
                        <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                            Tùy chỉnh hồ sơ học tập local SQLite, từ điển cá nhân và lịch ôn tập Simple SRS.
                        </p>
                    </div>
                </div>
            </section>

            {/* Core Settings Grid */}
            <section className="grid gap-6 lg:grid-cols-2">
                {/* Local Profile Panel */}
                <div className="custom-shadow overflow-hidden rounded-[2rem] border border-teal-100/40 dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/40 backdrop-blur-xl flex flex-col">
                    <div className="border-b border-teal-100/40 dark:border-slate-800 bg-teal-50/10 dark:bg-slate-950/20 px-6 py-4 flex items-center gap-2">
                        <User className="h-5 w-5 text-[#0d9488] dark:text-teal-400" />
                        <h2 className="font-display font-bold text-slate-900 dark:text-slate-100 text-base">Hồ sơ cá nhân local</h2>
                    </div>

                    <div className="p-6 flex-1 space-y-6">
                        <div className="rounded-2xl bg-slate-50/50 dark:bg-slate-950/30 p-4 border border-slate-100 dark:border-slate-800/80">
                            <div className="flex items-start gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0d9488] to-teal-500 text-white shadow-sm">
                                    <HardDrive className="h-5 w-5" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="font-display font-bold text-base text-slate-900 dark:text-slate-100 leading-tight">Offline Reader Profile</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                        Dữ liệu học tập được lưu trữ trực tiếp bằng SQLite trên trình duyệt. Không có đăng nhập hay đồng bộ đám mây giả.
                                    </p>
                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/40 px-3 py-1 text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-450 mt-1 tracking-wide">
                                        <Check className="h-3 w-3" /> Offline-first active
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <LocalMetric label="Tài liệu đọc" value={documents.length} />
                            <LocalMetric label="Từ đã lưu" value={annotations.length} />
                            <LocalMetric label="Thẻ SRS" value={reviewItems.length} />
                            <LocalMetric label="Từ đã biết" value={knownWords.length} />
                        </div>

                        <div className="rounded-2xl border border-slate-100 dark:border-slate-800/80 p-5 bg-white/40 dark:bg-slate-950/20">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="h-4 w-4 text-[#0d9488] dark:text-teal-400" />
                                <span className="text-xs font-black text-slate-800 dark:text-slate-300 uppercase tracking-wider">Cấu hình từ điển bổ sung</span>
                            </div>
                            <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-500 dark:text-slate-405">
                                Các nghĩa dịch sửa đổi và danh mục từ đã biết được cập nhật trực tiếp tại local.
                            </p>
                            <div className="mt-4 flex flex-wrap gap-2">
                                <span className="rounded-lg bg-teal-50 px-2.5 py-1 text-[10px] font-bold text-teal-700 dark:bg-teal-950/30 dark:text-teal-400 border border-teal-100/40 dark:border-teal-900/30">
                                    {userCorrections.length} từ sửa đổi
                                </span>
                                <span className="rounded-lg bg-cyan-50 px-2.5 py-1 text-[10px] font-bold text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-400 border border-cyan-150/40 dark:border-cyan-900/30">
                                    Mục tiêu: {settings.targetHskLevel || 'HSK4'}
                                </span>
                                <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-450 border border-emerald-150/40 dark:border-emerald-900/30">
                                    Chuyên ngành: {settings.domainMode || 'auto'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Spaced Repetition Configuration */}
                <div className="custom-shadow overflow-hidden rounded-[2rem] border border-teal-100/40 dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/40 backdrop-blur-xl">
                    <div className="border-b border-teal-100/40 dark:border-slate-800 bg-teal-50/10 dark:bg-slate-950/20 px-6 py-4 flex items-center gap-2">
                        <Key className="h-5 w-5 text-[#0d9488] dark:text-teal-400" />
                        <h2 className="font-display font-bold text-slate-900 dark:text-slate-100 text-base">Thuật toán ghi nhớ Simple SRS</h2>
                    </div>
                    <div className="divide-y divide-teal-50/30 dark:divide-slate-800/50">
                        <SettingRow icon={Database} title="Khả năng duy trì" description="Xác suất ghi nhớ mục tiêu học tập (80% - 95%).">
                            <select
                                value={settings.desiredRetention ?? 0.90}
                                onChange={(event) => updateSettings({ desiredRetention: Number(event.target.value) })}
                                className="rounded-xl border border-teal-100 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-2.5 text-xs font-bold outline-none focus:border-[#0d9488] text-slate-700 dark:text-slate-300 cursor-pointer"
                            >
                                <option value="0.80">80% (Dãn cách dài)</option>
                                <option value="0.85">85% (Trung bình)</option>
                                <option value="0.90">90% (Tiêu chuẩn)</option>
                                <option value="0.95">95% (Học chuyên sâu)</option>
                            </select>
                        </SettingRow>

                        <SettingRow icon={Database} title="Các bước ôn tập" description="Khoảng cách cho các thẻ vựng mới / hoặc trả lời sai.">
                            <select
                                value={settings.learningSteps ?? '1m 5m 15m'}
                                onChange={(event) => updateSettings({ learningSteps: event.target.value })}
                                className="rounded-xl border border-teal-100 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-2.5 text-xs font-bold outline-none focus:border-[#0d9488] text-slate-700 dark:text-slate-300 cursor-pointer"
                            >
                                <option value="1m 5m 15m">1 phút · 5 phút · 15 phút</option>
                                <option value="5m 15m 30m">5 phút · 15 phút · 30 phút</option>
                                <option value="15m 30m 2h">15 phút · 30 phút · 2 giờ</option>
                            </select>
                        </SettingRow>

                        <div className="p-5 bg-slate-55/10 dark:bg-slate-950/10">
                            <p className="text-[11px] leading-relaxed text-slate-400 dark:text-slate-500 font-semibold italic">
                                * Simple SRS tự động tính toán dãn cách thông minh dựa trên đánh giá của bạn (Hard, Good, Easy) để tối ưu chu kỳ ghi nhớ.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Profile Preferences */}
                <div className="custom-shadow overflow-hidden rounded-[2rem] border border-teal-100/40 dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/40 backdrop-blur-xl">
                    <div className="border-b border-teal-100/40 dark:border-slate-800 bg-teal-50/10 dark:bg-slate-950/20 px-6 py-4">
                        <h2 className="font-display font-bold text-slate-900 dark:text-slate-100 text-base">Thiết lập đọc</h2>
                    </div>
                    <div className="divide-y divide-teal-50/30 dark:divide-slate-800/50">
                        <SettingRow icon={BookOpen} title="Mục tiêu HSK" description="Điều chỉnh cấp độ từ vựng phân tích HSK mục tiêu.">
                            <select
                                value={settings.targetHskLevel || 'HSK4'}
                                onChange={(event) => updateSettings({ targetHskLevel: event.target.value })}
                                className="rounded-xl border border-teal-100 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-2.5 text-xs font-bold outline-none focus:border-[#0d9488] text-slate-700 dark:text-slate-300 cursor-pointer"
                            >
                                {['HSK1', 'HSK2', 'HSK3', 'HSK4', 'HSK5', 'HSK6', 'HSK7-9'].map((level) => (
                                    <option key={level} value={level}>
                                        {level}
                                    </option>
                                ))}
                            </select>
                        </SettingRow>

                        <SettingRow icon={Globe} title="Tra ngữ cảnh chuyên ngành" description="Ưu tiên dịch nghĩa chuyên sâu theo ngữ cảnh.">
                            <select
                                value={settings.domainMode || 'auto'}
                                onChange={(event) => updateSettings({ domainMode: event.target.value as any })}
                                className="rounded-xl border border-teal-100 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-2.5 text-xs font-bold outline-none focus:border-[#0d9488] text-slate-700 dark:text-slate-300 cursor-pointer"
                            >
                                <option value="auto">Tự động quét (Auto)</option>
                                <option value="general">Kinh tế & Đời sống</option>
                                <option value="economics">Kinh tế chuyên sâu</option>
                                <option value="computer_science">Công nghệ thông tin</option>
                                <option value="education">Giáo dục & Sư phạm</option>
                            </select>
                        </SettingRow>

                        <SettingRow icon={Volume2} title="Phiên âm Pinyin" description="Tùy chọn ẩn hiện pinyin ở đầu đọc.">
                            <select
                                value={settings.showPinyinMode || 'always'}
                                onChange={(event) => updateSettings({ showPinyinMode: event.target.value as any })}
                                className="rounded-xl border border-teal-100 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-2.5 text-xs font-bold outline-none focus:border-[#0d9488] text-slate-700 dark:text-slate-300 cursor-pointer"
                            >
                                <option value="always">Luôn luôn hiển thị</option>
                                <option value="unknown_only">Chỉ hiện từ mới tra</option>
                                <option value="never">Ẩn pinyin hoàn toàn</option>
                            </select>
                        </SettingRow>

                        <SettingRow icon={BookOpen} title="Phong cách bản dịch" description="Cấu trúc dịch hiển thị trong đầu đọc Reader.">
                            <select
                                value={settings.translationStyle || 'both'}
                                onChange={(event) => updateSettings({ translationStyle: event.target.value as any })}
                                className="rounded-xl border border-teal-100 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-2.5 text-xs font-bold outline-none focus:border-[#0d9488] text-slate-700 dark:text-slate-300 cursor-pointer"
                            >
                                <option value="both">Dịch sát + Dịch thoát nghĩa</option>
                                <option value="natural">Dịch thoát nghĩa tự nhiên</option>
                                <option value="literal">Dịch sát nghĩa chữ Hán</option>
                            </select>
                        </SettingRow>
                    </div>
                </div>

                {/* Styling Preferences */}
                <div className="custom-shadow overflow-hidden rounded-[2rem] border border-teal-100/40 dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/40 backdrop-blur-xl">
                    <div className="border-b border-teal-100/40 dark:border-slate-800 bg-teal-50/10 dark:bg-slate-950/20 px-6 py-4">
                        <h2 className="font-display font-bold text-slate-900 dark:text-slate-100 text-base">Thiết lập đầu đọc & Theme</h2>
                    </div>
                    <div className="divide-y divide-teal-50/30 dark:divide-slate-800/50">
                        <SettingRow icon={Sun} title="Dark Mode (Chế độ tối)" description="Kích hoạt dải màu obsidian tối sâu bảo vệ mắt ban đêm.">
                            <Toggle checked={isDarkMode} onChange={toggleDarkMode} />
                        </SettingRow>

                        <SettingRow icon={Palette} title="Cỡ chữ mặc định" description="Kích thước chữ mặc định áp dụng cho bài đọc.">
                            <select
                                value={settings.fontSize}
                                onChange={(event) => updateSettings({ fontSize: event.target.value as any })}
                                className="rounded-xl border border-teal-100 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-2.5 text-xs font-bold outline-none focus:border-[#0d9488] text-slate-700 dark:text-slate-300 cursor-pointer"
                            >
                                <option value="small">Thon gọn</option>
                                <option value="medium">Tiêu chuẩn</option>
                                <option value="large">Phóng to</option>
                            </select>
                        </SettingRow>

                        <SettingRow icon={Database} title="Tự động lưu local" description="Tự động cập nhật annotations vào SQLite local.">
                            <Toggle checked={settings.autoSave} onChange={() => updateSettings({ autoSave: !settings.autoSave })} />
                        </SettingRow>

                        <SettingRow icon={Database} title="Offline Cache" description="Lưu trữ offline-first danh mục CC-CEDICT.">
                            <Toggle checked={settings.offlineCache} onChange={() => updateSettings({ offlineCache: !settings.offlineCache })} />
                        </SettingRow>
                    </div>
                </div>
            </section>

            <section className="custom-shadow rounded-[2rem] border border-teal-100/40 dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/40 backdrop-blur-xl p-6">
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    <div>
                        <h2 className="font-display font-bold text-slate-900 dark:text-slate-100">Local System Stack</h2>
                        <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400 leading-relaxed">
                            React/Vite + PDFJS Frontend, FastAPI + SQLite + jieba/pypinyin Backend. Đăng nhập và đồng bộ chỉ khi có API thực tế.
                        </p>
                    </div>
                    <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/20 px-4 py-1.5 text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-450 shadow-inner">
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
        <div className="flex items-center justify-between gap-4 px-6 py-4">
            <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 dark:bg-slate-800 text-teal-700 dark:text-teal-400 border border-teal-100/40 dark:border-slate-800/60">
                    <Icon className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{title}</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-400 leading-normal">{description}</p>
                </div>
            </div>
            <div className="shrink-0">{children}</div>
        </div>
    )
}

function LocalMetric({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-2xl border border-slate-100 bg-white/95 p-4 dark:border-slate-800/80 dark:bg-slate-950/30 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">{label}</p>
            <p className="mt-1.5 text-2xl font-display font-black text-slate-900 dark:text-slate-100 leading-none">{value}</p>
        </div>
    )
}
