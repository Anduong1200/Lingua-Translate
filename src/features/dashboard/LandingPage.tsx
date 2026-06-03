import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { 
  Moon, Sun, Sparkles, ArrowRight, ShieldCheck, X,
  BrainCircuit, BookOpen, Layers, Zap, Globe, Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LandingPage() {
  const navigate = useNavigate();
  const { isDarkMode, toggleDarkMode, user, setAuthModalOpen } = useStore();
  const [showPricingModal, setShowPricingModal] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const scrollToFeatures = (e: React.MouseEvent) => {
    e.preventDefault();
    const element = document.getElementById('features');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Modern abstract floating background elements
  const MeshBackground = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      <motion.div 
        animate={{ x: [0, 50, 0], y: [0, -50, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        className="absolute top-[-10%] left-[10%] w-[500px] h-[500px] bg-teal-400/20 dark:bg-teal-600/10 rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-lighten"
      />
      <motion.div 
        animate={{ x: [0, -60, 0], y: [0, 60, 0], scale: [1, 1.2, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
        className="absolute top-[20%] right-[5%] w-[600px] h-[600px] bg-sky-400/20 dark:bg-indigo-600/10 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-lighten"
      />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] dark:opacity-[0.05]" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fafbfc] dark:bg-[#050914] text-slate-800 dark:text-slate-200 antialiased selection:bg-teal-500/20 selection:text-teal-700 dark:selection:text-teal-300 relative overflow-hidden flex flex-col font-sans transition-colors duration-500">
      <MeshBackground />

      {/* Floating Glass Header */}
      <header className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-5xl">
        <nav className="flex items-center justify-between px-6 py-3 bg-white/60 dark:bg-slate-950/50 backdrop-blur-xl border border-white/80 dark:border-slate-800/60 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)]">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-teal-500 to-sky-500 flex items-center justify-center shadow-lg shadow-teal-500/20 group-hover:shadow-teal-500/40 transition-all duration-300">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">Hanora</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-1 p-1 bg-slate-100/50 dark:bg-slate-900/50 rounded-full border border-slate-200/50 dark:border-slate-800/50">
            <button onClick={scrollToFeatures} className="px-5 py-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 rounded-full hover:bg-white/80 dark:hover:bg-slate-800/80 transition-all">Tính năng</button>
            <button onClick={() => setShowPricingModal(true)} className="px-5 py-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 rounded-full hover:bg-white/80 dark:hover:bg-slate-800/80 transition-all">Bảng giá</button>
            <button onClick={() => user ? navigate('/dashboard') : setAuthModalOpen(true)} className="px-5 py-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 rounded-full hover:bg-white/80 dark:hover:bg-slate-800/80 transition-all">Dashboard</button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleDarkMode}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800/50 hover:bg-teal-50 dark:hover:bg-teal-900/20 text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 transition-all"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={() => user ? navigate('/dashboard') : setAuthModalOpen(true)}
              className="px-6 py-2.5 text-sm font-bold text-white bg-slate-900 dark:bg-white dark:text-slate-900 rounded-full hover:scale-105 active:scale-95 transition-all duration-300 shadow-xl shadow-slate-900/10 dark:shadow-white/10"
            >
              Đăng nhập
            </button>
          </div>
        </nav>
      </header>

      {/* Main Hero Section */}
      <main className="flex-1 w-full flex flex-col items-center justify-center relative z-10 pt-32 pb-20 px-6">
        <div className="max-w-4xl w-full flex flex-col items-center text-center">
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-50 dark:bg-teal-500/10 border border-teal-200/50 dark:border-teal-500/20 text-teal-700 dark:text-teal-300 text-sm font-semibold mb-8"
          >
            <span className="flex h-2 w-2 rounded-full bg-teal-500 animate-pulse"></span>
            Không gian học Tiếng Trung thế hệ mới
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.1] mb-8"
          >
            Đọc hiểu sâu sắc. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 via-sky-500 to-indigo-500">
              Ghi nhớ dài lâu.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl font-medium leading-relaxed mb-12"
          >
            Trình dịch tài liệu thông minh tích hợp tra từ điển ngữ cảnh và hệ thống tạo Flashcard tự động. Học ngoại ngữ chưa bao giờ liền mạch đến thế.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center"
          >
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-teal-500 to-sky-500 hover:from-teal-400 hover:to-sky-400 text-white rounded-2xl font-bold text-lg shadow-xl shadow-teal-500/25 hover:shadow-2xl hover:shadow-teal-500/40 hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2 group"
            >
              Bắt đầu hành trình
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={scrollToFeatures}
              className="w-full sm:w-auto px-8 py-4 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl font-bold text-lg hover:bg-white dark:hover:bg-slate-800 transition-all duration-300"
            >
              Tìm hiểu thêm
            </button>
          </motion.div>
        </div>
      </main>

      {/* Bento Grid Features Section */}
      <section id="features" className="w-full max-w-6xl mx-auto px-6 py-24 relative z-10 scroll-mt-24">
        <div className="flex flex-col items-center mb-16 text-center">
          <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">
            Được thiết kế cho người tự học
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-lg max-w-2xl font-medium">
            Mọi công cụ bạn cần đều nằm chung một màn hình, không cần chuyển tab, không làm gián đoạn dòng suy nghĩ.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[320px]">
          
          {/* Feature 1 (Large) */}
          <div className="md:col-span-2 md:row-span-1 rounded-3xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 p-8 flex flex-col relative overflow-hidden group hover:border-teal-500/30 transition-colors shadow-lg shadow-slate-200/20 dark:shadow-none">
            <div className="absolute top-0 right-0 w-64 h-64 bg-teal-400/10 dark:bg-teal-500/10 rounded-full blur-3xl group-hover:bg-teal-400/20 transition-colors" />
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center mb-6 shadow-lg shadow-teal-500/20">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3 relative z-10">Dịch thuật & Đọc hiểu Tài liệu</h3>
            <p className="text-slate-600 dark:text-slate-400 font-medium relative z-10 flex-1">
              Hỗ trợ render chính xác định dạng PDF, TXT. Nhấn vào bất kỳ câu nào để xem bản dịch, hoặc bôi đen một cụm từ để tra từ điển tức thì ngay trên trang tài liệu.
            </p>
          </div>

          {/* Feature 2 (Tall) */}
          <div className="md:col-span-1 md:row-span-2 rounded-3xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 p-8 flex flex-col relative overflow-hidden group hover:border-sky-500/30 transition-colors shadow-lg shadow-slate-200/20 dark:shadow-none">
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-sky-400/10 dark:bg-sky-500/10 rounded-full blur-3xl group-hover:bg-sky-400/20 transition-colors" />
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center mb-6 shadow-lg shadow-sky-500/20">
              <Layers className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3 relative z-10">Sinh Flashcard Tự động</h3>
            <p className="text-slate-600 dark:text-slate-400 font-medium relative z-10">
              Mỗi cụm từ bạn bôi đen sẽ được chuyển thành Flashcard chỉ với 1 click. Hệ thống giữ nguyên câu ví dụ (ngữ cảnh gốc) để bạn không bao giờ quên cách sử dụng từ. Thuật toán Spaced-Repetition (Lặp lại ngắt quãng) giúp tối ưu hóa bộ nhớ dài hạn.
            </p>
          </div>

          {/* Feature 3 (Standard) */}
          <div className="md:col-span-1 md:row-span-1 rounded-3xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 p-8 flex flex-col relative overflow-hidden group hover:border-purple-500/30 transition-colors shadow-lg shadow-slate-200/20 dark:shadow-none">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center mb-6 shadow-lg shadow-purple-500/20">
              <BrainCircuit className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 relative z-10">Giải thích Ngữ pháp AI</h3>
            <p className="text-slate-600 dark:text-slate-400 font-medium relative z-10">
              Không hiểu tại sao từ này lại đặt ở đây? Gọi AI giải thích cặn kẽ cấu trúc ngữ pháp ngay tại chỗ.
            </p>
          </div>

          {/* Feature 4 (Standard) */}
          <div className="md:col-span-1 md:row-span-1 rounded-3xl bg-slate-900 dark:bg-white backdrop-blur-xl border border-slate-800 dark:border-white p-8 flex flex-col relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 shadow-xl shadow-slate-900/20 dark:shadow-white/20">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 dark:bg-black/5 rounded-full blur-2xl" />
            <div className="w-14 h-14 rounded-2xl bg-white/10 dark:bg-slate-900/10 flex items-center justify-center mb-6 border border-white/10 dark:border-slate-900/10">
              <Lock className="w-7 h-7 text-white dark:text-slate-900" />
            </div>
            <h3 className="text-xl font-bold text-white dark:text-slate-900 mb-3 relative z-10">Riêng tư Local-First</h3>
            <p className="text-slate-300 dark:text-slate-600 font-medium relative z-10 text-sm">
              Dữ liệu flashcards, file PDF và từ điển Offline được lưu hoàn toàn trên máy bạn. Tốc độ tra cứu là tức thời.
            </p>
          </div>

        </div>
      </section>

      {/* Pricing Modal */}
      <AnimatePresence>
        {showPricingModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowPricingModal(false)}
              className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl overflow-hidden"
            >
              <div className="absolute top-6 right-6 z-10">
                <button onClick={() => setShowPricingModal(false)} className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2">
                {/* Free Tier */}
                <div className="p-10 md:p-12 bg-slate-50 dark:bg-slate-900/50">
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Gói Cơ Bản</h3>
                  <p className="text-slate-500 dark:text-slate-400 mb-8 font-medium">Hoàn hảo để bắt đầu làm quen.</p>
                  <div className="mb-8">
                    <span className="text-4xl font-extrabold text-slate-900 dark:text-white">Miễn phí</span>
                  </div>
                  <ul className="space-y-4 mb-10 text-slate-600 dark:text-slate-300 font-medium">
                    <li className="flex items-center gap-3"><Zap className="w-5 h-5 text-slate-400" /> Tối đa 5 tài liệu tải lên</li>
                    <li className="flex items-center gap-3"><Zap className="w-5 h-5 text-slate-400" /> Tra từ điển cơ bản</li>
                    <li className="flex items-center gap-3"><Zap className="w-5 h-5 text-slate-400" /> Tối đa 100 Flashcards</li>
                  </ul>
                  <button onClick={() => { setShowPricingModal(false); navigate('/dashboard'); }} className="w-full py-4 rounded-xl font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                    Dùng thử ngay
                  </button>
                </div>

                {/* Pro Tier */}
                <div className="p-10 md:p-12 bg-gradient-to-br from-teal-500 to-sky-600 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
                  <div className="absolute inline-block top-8 right-8 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider">Khuyên dùng</div>
                  
                  <h3 className="text-2xl font-bold mb-2 relative z-10">Pro Premium</h3>
                  <p className="text-teal-100 mb-8 font-medium relative z-10">Trải nghiệm không giới hạn.</p>
                  <div className="mb-8 relative z-10">
                    <span className="text-4xl font-extrabold">99.000đ</span>
                    <span className="text-teal-100 font-medium"> / tháng</span>
                  </div>
                  <ul className="space-y-4 mb-10 text-teal-50 font-medium relative z-10">
                    <li className="flex items-center gap-3"><Sparkles className="w-5 h-5 text-teal-200" /> Không giới hạn tài liệu & Flashcards</li>
                    <li className="flex items-center gap-3"><Sparkles className="w-5 h-5 text-teal-200" /> Giải thích ngữ cảnh AI chuyên sâu</li>
                    <li className="flex items-center gap-3"><Sparkles className="w-5 h-5 text-teal-200" /> Đồng bộ hóa Cloud</li>
                  </ul>
                  <button onClick={() => { setShowPricingModal(false); navigate('/dashboard'); }} className="w-full py-4 rounded-xl font-bold text-teal-600 bg-white hover:bg-slate-50 shadow-xl shadow-teal-900/20 transition-all active:scale-95 relative z-10">
                    Nâng cấp Premium
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
