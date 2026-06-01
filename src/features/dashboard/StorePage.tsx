import { useState } from 'react';
import { ShoppingBag, Key, CheckCircle, Lock, Database, Sparkles, BookOpen } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { motion, AnimatePresence } from 'framer-motion';

export default function StorePage() {
    const { updateSettings, settings } = useStore();
    const [licenseKey, setLicenseKey] = useState('');
    const [activationStatus, setActivationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

    // Mocks unlocked packs based on settings. In a real app this would check the backend.
    const isPro = settings.domainMode !== 'auto' && settings.domainMode !== undefined;

    const packs = [
        {
            id: 'core-hsk',
            name: 'HSK Core Vietnamese Pack',
            icon: BookOpen,
            description: 'Từ vựng cốt lõi từ HSK 1 đến HSK 6 với nghĩa tiếng Việt chuẩn xác.',
            price: 'Free',
            isPremium: false,
            unlocked: true,
            color: 'text-slate-600 dark:text-slate-400',
            bg: 'bg-slate-100 dark:bg-slate-800'
        },
        {
            id: 'economics',
            name: 'Economics Chinese-Vietnamese Pack',
            icon: Database,
            description: 'Bộ từ điển chuyên ngành Kinh tế, Tài chính, Thương mại. Giúp dịch báo cáo tài chính chuẩn xác.',
            price: 'Premium',
            isPremium: true,
            unlocked: isPro,
            color: 'text-[#006b5f] dark:text-teal-400',
            bg: 'bg-[#006b5f]/10 dark:bg-teal-950/30'
        },
        {
            id: 'it',
            name: 'Computer Science Pack',
            icon: Database,
            description: 'Từ vựng IT, Lập trình, Khoa học Máy tính. Rất cần thiết cho developer đọc document Trung Quốc.',
            price: 'Premium',
            isPremium: true,
            unlocked: isPro,
            color: 'text-sky-600 dark:text-sky-400',
            bg: 'bg-sky-50 dark:bg-sky-950/30'
        },
        {
            id: 'grammar',
            name: 'Advanced Grammar Pattern Pack',
            icon: Sparkles,
            description: 'Hơn 500 cấu trúc ngữ pháp nâng cao, tự động highlight và giải thích khi đọc văn bản dài.',
            price: 'Premium',
            isPremium: true,
            unlocked: isPro,
            color: 'text-amber-600 dark:text-amber-400',
            bg: 'bg-amber-50 dark:bg-amber-950/30'
        }
    ];

    const handleActivate = () => {
        if (!licenseKey.trim()) return;
        setActivationStatus('loading');
        
        // Giả lập gọi API kiểm tra License
        setTimeout(() => {
            if (licenseKey.startsWith('PRO-')) {
                setActivationStatus('success');
                // Lưu trạng thái đã mua vào settings (mock)
                updateSettings({ domainMode: 'economics' });
            } else {
                setActivationStatus('error');
            }
        }, 1500);
    };

    return (
        <div className="mx-auto flex max-w-5xl flex-col gap-6 pb-8 transition-colors duration-300">
            {/* Page Header */}
            <section className="glass border border-white/60 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 p-7 custom-shadow rounded-[2rem] backdrop-blur-md">
                <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#006b5f] to-[#0060ac] text-white shadow-lg shadow-[#006b5f]/25">
                        <ShoppingBag className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-display font-black tracking-tight text-slate-900 dark:text-slate-100">Marketplace & Licenses</h1>
                        <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                            Mở rộng khả năng của Hanora bằng các bộ từ vựng chuyên ngành bản quyền.
                        </p>
                    </div>
                </div>
            </section>

            {/* License Activation Area */}
            <section className="custom-shadow rounded-[2rem] border border-teal-100/40 dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/40 backdrop-blur-xl p-6 md:p-8">
                <div className="flex flex-col md:flex-row gap-8 items-center">
                    <div className="flex-1">
                        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-2">
                            <Key className="w-5 h-5 text-[#006b5f]" />
                            Kích hoạt Premium Packs
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Nếu bạn đã mua bản quyền hoặc có mã kích hoạt từ nhà phát triển, hãy nhập vào đây để mở khóa vĩnh viễn các Data Packs.
                        </p>
                    </div>
                    <div className="w-full md:w-96 flex flex-col gap-3">
                        <div className="relative">
                            <input
                                type="text"
                                value={licenseKey}
                                onChange={(e) => {
                                    setLicenseKey(e.target.value.toUpperCase());
                                    setActivationStatus('idle');
                                }}
                                placeholder="Nhập mã (ví dụ: PRO-XXXX)"
                                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-mono font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#006b5f]"
                            />
                            <button
                                onClick={handleActivate}
                                disabled={activationStatus === 'loading' || !licenseKey}
                                className="absolute right-2 top-2 bottom-2 px-4 bg-[#006b5f] hover:bg-[#005048] disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-bold text-xs rounded-lg transition-colors"
                            >
                                {activationStatus === 'loading' ? 'Checking...' : 'Kích hoạt'}
                            </button>
                        </div>
                        
                        <AnimatePresence mode="wait">
                            {activationStatus === 'error' && (
                                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-xs font-bold text-red-500 px-1">
                                    Mã kích hoạt không hợp lệ. Vui lòng kiểm tra lại.
                                </motion.p>
                            )}
                            {activationStatus === 'success' && (
                                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-xs font-bold text-[#006b5f] dark:text-teal-400 px-1 flex items-center gap-1">
                                    <CheckCircle className="w-4 h-4" /> Đã kích hoạt thành công!
                                </motion.p>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </section>

            {/* Packs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {packs.map((pack) => (
                    <div key={pack.id} className={`relative overflow-hidden custom-shadow rounded-[2rem] border ${pack.unlocked ? 'border-emerald-100/40 dark:border-emerald-900/30 bg-white/70 dark:bg-slate-900/40' : 'border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/20'} backdrop-blur-xl p-6 transition-all`}>
                        <div className="flex items-start justify-between mb-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${pack.bg} ${pack.color}`}>
                                <pack.icon className="w-6 h-6" />
                            </div>
                            {pack.unlocked ? (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                                    <CheckCircle className="w-3.5 h-3.5" /> Installed
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-black uppercase tracking-wider">
                                    <Lock className="w-3.5 h-3.5" /> Locked
                                </span>
                            )}
                        </div>
                        
                        <h3 className="text-lg font-bold font-display text-slate-900 dark:text-slate-100 mb-2">{pack.name}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6">{pack.description}</p>
                        
                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100 dark:border-slate-800/80">
                            <span className="text-sm font-black text-slate-800 dark:text-slate-200">{pack.price}</span>
                            {!pack.unlocked && (
                                <button className="text-xs font-bold text-[#006b5f] dark:text-teal-400 hover:underline">
                                    Mua bản quyền
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
