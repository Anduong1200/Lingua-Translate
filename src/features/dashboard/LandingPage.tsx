import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { 
  Moon, Sun, Globe, Compass, Layers, CloudOff, Zap, 
  Sparkles, Languages, Check, ArrowRight, ShieldCheck, X 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LandingPage() {
  const navigate = useNavigate();
  const { isDarkMode, toggleDarkMode } = useStore();
  const [showPricingModal, setShowPricingModal] = useState(false);

  const scrollToFeatures = (e: React.MouseEvent) => {
    e.preventDefault();
    const element = document.getElementById('features');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="font-sans text-[#131b2e] dark:text-slate-100 antialiased selection:bg-[#006b5f]/20 selection:text-[#006b5f] flex flex-col min-h-screen relative w-full bg-gradient-to-br from-[#eef0ff] via-[#d4e3ff]/60 to-[#faf8ff] dark:from-[#0b0f19] dark:via-[#090d16] dark:to-[#020617] transition-all duration-300">
      
      {/* Premium Sticky Topbar Navigation */}
      <nav className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md w-full top-0 sticky z-50 border-b border-white/40 dark:border-slate-800/40 shadow-sm transition-all duration-300">
        <div className="flex justify-between items-center w-full px-6 md:px-10 max-w-7xl mx-auto h-20">
          
          {/* Brand */}
          <Link to="/" className="text-2xl font-bold text-[#006b5f] dark:text-teal-400 flex items-center gap-2 hover:opacity-85 transition-all">
            <Sparkles className="w-6 h-6 text-[#006b5f] dark:text-teal-400 stroke-[2.5]" />
            <span className="font-display tracking-tight font-black">Hanora</span>
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <a 
              href="#features" 
              onClick={scrollToFeatures} 
              className="text-sm font-bold text-[#006b5f] dark:text-teal-400 hover:opacity-80 transition-opacity"
            >
              Tính năng
            </a>
            <Link 
              to="/dashboard" 
              className="text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-[#006b5f] dark:hover:text-teal-400 transition-colors"
            >
              Công cụ
            </Link>
            <button 
              onClick={() => setShowPricingModal(true)} 
              className="text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-[#006b5f] dark:hover:text-teal-400 transition-colors cursor-pointer"
            >
              Bảng giá
            </button>
            <Link 
              to="/dashboard" 
              className="text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-[#006b5f] dark:hover:text-teal-400 transition-colors"
            >
              Dashboard
            </Link>
          </div>
          
          {/* Trailing Action & Theme Switch */}
          <div className="flex shrink-0 items-center justify-end gap-4 md:gap-6">
            <button
              onClick={toggleDarkMode}
              className="p-2.5 shrink-0 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors cursor-pointer"
              title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-[#006b5f] hover:bg-[#005048] text-white text-sm font-extrabold py-2.5 px-6 rounded-xl transition-all shadow-md shadow-[#006b5f]/15 hover:shadow-lg active:scale-95 duration-200 cursor-pointer"
            >
              Bắt đầu ngay
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Canvas */}
      <main className="w-full flex-grow flex flex-col items-center">
        
        {/* Hero Section */}
        <section className="w-full max-w-7xl mx-auto px-6 md:px-10 pt-16 md:pt-24 pb-20 flex flex-col items-center text-center relative z-10">
          
          {/* Pulsing Back Glow */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-[#006b5f]/5 via-[#0060ac]/5 to-transparent rounded-full blur-3xl -z-10 animate-pulse pointer-events-none" />
          
          {/* Mascot Illustration */}
          <div className="mb-10 relative w-full max-w-xs md:max-w-sm mx-auto aspect-square flex items-center justify-center">
            <div className="absolute inset-0 bg-[#0060ac]/5 rounded-full blur-3xl -z-10" />
            <img 
              alt="Cute Panda Mascot in a box" 
              className="w-full h-auto object-contain drop-shadow-[0_20px_50px_rgba(0,107,95,0.15)] z-10 relative hover:scale-105 transition-transform duration-500 cursor-default" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuD5Q-bON4zlybBklX7gJB1XXgISME5YlT2trvpsuAoa6EE1UylhAS2dLzapIGIrUA67hnchhrWPr8sSpic76FCmZalzhgvr_nkw0raeIUEp2CvWopx0dJBFexohuI_ls7c2jBSRKtyhFXiXpKStI8v9HxPVFe14SMlvRsef-U_STd8xppm5vTHC54SQdwgr1att14o9j1laU8cN1gAOj-2Vdmlbey6oAqNdMoPGqYCN-4HJy4OtHwzWg1S2aSxPAyeKucrODTBCzQKA"
            />
          </div>
          
          {/* Typography Header */}
          <h1 className="text-3xl md:text-5xl font-black text-[#131b2e] dark:text-slate-100 mb-6 max-w-4xl tracking-tight leading-tight font-display">
            Trình Biên Dịch & Học Từ Vựng Tiếng Trung Tự Động
          </h1>
          
          <p className="text-base md:text-lg text-slate-500 dark:text-slate-400 mb-10 max-w-2xl font-medium leading-relaxed">
            Dịch tài liệu, tra từ theo ngữ cảnh, luyện phát âm và tự động tạo flashcard từ từ vựng đã học. 
            Mọi tính năng được tích hợp trực tiếp, tối ưu cho người học Việt Nam.
          </p>
          
          {/* CTA Primary Trigger */}
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-gradient-to-r from-[#006b5f] to-[#0060ac] hover:from-[#005048] hover:to-[#004883] text-white font-extrabold py-4 px-12 rounded-full shadow-xl shadow-[#006b5f]/25 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 text-lg flex items-center gap-2 cursor-pointer"
          >
            <span>Dùng thử miễn phí</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </section>

        {/* Features Bento Grid */}
        <section id="features" className="w-full max-w-7xl mx-auto px-6 md:px-10 pt-24 pb-24 relative z-20 scroll-mt-20 mt-8">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#006b5f]/10 dark:bg-[#006b5f]/25 px-4 py-1.5 text-xs font-extrabold uppercase tracking-widest text-[#006b5f] dark:text-teal-400 mb-4">
              Tính năng cốt lõi
            </span>
            <h2 className="text-2xl md:text-4xl font-black font-display text-slate-800 dark:text-slate-100">
              Công cụ học tập toàn diện
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Feature 1: Translation */}
            <div className="glass-card bg-white/80 dark:bg-slate-900/60 backdrop-blur-md border border-white/50 dark:border-slate-800/60 shadow-[0_20px_40px_rgba(96,165,250,0.06)] rounded-3xl p-8 flex flex-col items-center text-center group hover:-translate-y-2 hover:border-[#006b5f]/30 dark:hover:border-teal-500/30 transition-all duration-300">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#006b5f]/10 to-[#0060ac]/10 flex items-center justify-center mb-6 text-[#006b5f] dark:text-teal-400 group-hover:from-[#006b5f] group-hover:to-[#0060ac] group-hover:text-white transition-all duration-300">
                <Languages className="w-8 h-8" />
              </div>
              <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 mb-3 font-display">
                Dịch tài liệu tự động
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                Tự động dịch các tệp DOCX, PDF, TXT giữ nguyên định dạng. Tích hợp công cụ dịch thông minh.
              </p>
            </div>

            {/* Feature 2: Smart Lookup */}
            <div className="glass-card bg-white/80 dark:bg-slate-900/60 backdrop-blur-md border border-white/50 dark:border-slate-800/60 shadow-[0_20px_40px_rgba(96,165,250,0.06)] rounded-3xl p-8 flex flex-col items-center text-center group hover:-translate-y-2 hover:border-[#006b5f]/30 dark:hover:border-teal-500/30 transition-all duration-300 delay-75">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#006b5f]/10 to-[#0060ac]/10 flex items-center justify-center mb-6 text-[#006b5f] dark:text-teal-400 group-hover:from-[#006b5f] group-hover:to-[#0060ac] group-hover:text-white transition-all duration-300">
                <Compass className="w-8 h-8" />
              </div>
              <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 mb-3 font-display">
                Tra từ thông minh trên PDF
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                Tra từ ngay trên tài liệu của bạn với giải thích ngữ cảnh, phân tách từ ngữ Hán Việt chuẩn xác.
              </p>
            </div>

            {/* Feature 3: Flashcards */}
            <div className="glass-card bg-white/80 dark:bg-slate-900/60 backdrop-blur-md border border-white/50 dark:border-slate-800/60 shadow-[0_20px_40px_rgba(96,165,250,0.06)] rounded-3xl p-8 flex flex-col items-center text-center group hover:-translate-y-2 hover:border-[#006b5f]/30 dark:hover:border-teal-500/30 transition-all duration-300 delay-150">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#006b5f]/10 to-[#0060ac]/10 flex items-center justify-center mb-6 text-[#006b5f] dark:text-teal-400 group-hover:from-[#006b5f] group-hover:to-[#0060ac] group-hover:text-white transition-all duration-300">
                <Layers className="w-8 h-8" />
              </div>
              <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 mb-3 font-display">
                Flashcards tự động
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                Tạo và ôn tập flashcard hiệu quả dựa trên thuật toán lặp lại ngắt quãng (Simple SRS) độc quyền.
              </p>
            </div>

          </div>
        </section>

        {/* Secondary Section */}
        <section className="w-full bg-[#eaedff]/30 dark:bg-slate-900/30 py-24 mt-10 border-y border-[#006b5f]/5 dark:border-slate-800/20">
          <div className="max-w-7xl mx-auto px-6 md:px-10 text-center">
            
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-slate-100 mb-6 font-display">
              Học tập không giới hạn, mọi lúc mọi nơi
            </h2>
            
            <p className="text-base text-slate-500 dark:text-slate-400 max-w-3xl mx-auto font-medium leading-relaxed mb-16 mt-4">
              Hanora được thiết kế để đồng hành cùng bạn mọi lúc. Tính năng Offline-First đảm bảo bạn luôn có thể tra cứu và học từ vựng ngay cả khi không có kết nối internet, kết hợp cùng AI Context Explanations giúp hiểu sâu sắc ý nghĩa từ trong từng hoàn cảnh cụ thể.
            </p>
            
            <div className="flex flex-wrap justify-center gap-6">
              
              <div className="flex items-center gap-3 bg-white dark:bg-slate-850 py-3.5 px-6 rounded-full border border-slate-200/50 dark:border-slate-800/40 shadow-md">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#006b5f]/10 text-[#006b5f] dark:text-teal-400">
                  <CloudOff className="w-4 h-4" />
                </div>
                <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200">Offline-First Capability</span>
              </div>
              
              <div className="flex items-center gap-3 bg-white dark:bg-slate-850 py-3.5 px-6 rounded-full border border-slate-200/50 dark:border-slate-800/40 shadow-md">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0060ac]/10 text-[#0060ac] dark:text-sky-400">
                  <Zap className="w-4 h-4" />
                </div>
                <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200">AI Context Explanations</span>
              </div>

            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white/80 dark:bg-slate-950/80 w-full py-12 border-t border-slate-200/30 dark:border-slate-800/20 mt-auto backdrop-blur-md">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full px-6 md:px-10 max-w-7xl mx-auto">
          
          <div className="flex flex-col items-center md:items-start text-center md:text-left gap-y-4">
            <div className="text-2xl font-bold font-display text-[#006b5f] dark:text-teal-400 flex items-center gap-1.5">
              <Sparkles className="w-5 h-5" />
              <span className="font-black">Hanora</span>
            </div>
            <div className="text-sm text-slate-400 dark:text-slate-500 font-semibold">
              © 2026 Hanora. All rights reserved.
            </div>
          </div>
          
          <div className="flex justify-center md:justify-end items-center gap-6 text-sm font-bold text-slate-500 dark:text-slate-450">
            <Link to="/dashboard" className="hover:text-[#006b5f] dark:hover:text-teal-400 transition-colors">
              Bảng điều khiển
            </Link>
            <Link to="/vocabulary" className="hover:text-[#006b5f] dark:hover:text-teal-400 transition-colors">
              Từ vựng
            </Link>
            <Link to="/settings" className="hover:text-[#006b5f] dark:hover:text-teal-400 transition-colors">
              Cấu hình
            </Link>
          </div>

        </div>
      </footer>

      {/* Interactive Premium Pricing Modal */}
      <AnimatePresence>
        {showPricingModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPricingModal(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-white/90 dark:bg-slate-900/90 border border-white/50 dark:border-slate-800/50 rounded-3xl w-full max-w-4xl p-6 md:p-8 shadow-2xl backdrop-blur-xl max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              {/* Close Button */}
              <button
                onClick={() => setShowPricingModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 text-sm font-bold font-mono cursor-pointer w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center mb-8">
                <h3 className="text-2xl md:text-3xl font-black font-display text-slate-800 dark:text-slate-100">
                  Lựa Chọn Gói Học Tập Phù Hợp
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 font-medium">
                  Nâng tầm tiếng Trung của bạn với sức mạnh của AI & offline-first.
                </p>
              </div>

              {/* Plans side-by-side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                
                {/* Plan 1: Standard Free */}
                <div className="border border-slate-200/60 dark:border-slate-800 bg-white/60 dark:bg-slate-950/40 rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden">
                  <div>
                    <h4 className="font-display font-black text-lg text-slate-700 dark:text-slate-300">Standard Free</h4>
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold mt-1">Trải nghiệm các tính năng cốt lõi</p>
                    
                    <div className="my-6">
                      <span className="text-3xl font-black font-display text-slate-800 dark:text-slate-100">0đ</span>
                      <span className="text-xs text-slate-400 font-semibold"> / mãi mãi</span>
                    </div>

                    <ul className="space-y-3.5 text-xs text-slate-500 dark:text-slate-450 border-t border-slate-100 dark:border-slate-800/80 pt-6">
                      <li className="flex items-center gap-2 font-semibold">
                        <Check className="w-4 h-4 text-[#006b5f]" />
                        <span>Tải lên tối đa 5 tài liệu</span>
                      </li>
                      <li className="flex items-center gap-2 font-semibold">
                        <Check className="w-4 h-4 text-[#006b5f]" />
                        <span>Tra từ điển Hán Việt cơ bản</span>
                      </li>
                      <li className="flex items-center gap-2 font-semibold">
                        <Check className="w-4 h-4 text-[#006b5f]" />
                        <span>Lưu tối đa 100 thẻ flashcards</span>
                      </li>
                      <li className="flex items-center gap-2 font-semibold text-slate-400 dark:text-slate-600 line-through">
                        <span>Giải thích ngữ cảnh chuyên sâu AI</span>
                      </li>
                      <li className="flex items-center gap-2 font-semibold text-slate-400 dark:text-slate-600 line-through">
                        <span>Offline cache từ điển 200.000 từ</span>
                      </li>
                    </ul>
                  </div>

                  <button
                    onClick={() => {
                      setShowPricingModal(false);
                      navigate('/dashboard');
                    }}
                    className="w-full mt-8 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-250 font-extrabold text-xs py-3 rounded-xl transition-all cursor-pointer text-center"
                  >
                    Bắt đầu miễn phí
                  </button>
                </div>

                {/* Plan 2: Pro Premium */}
                <div className="border-2 border-[#006b5f] bg-gradient-to-br from-[#006b5f]/5 to-transparent rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden shadow-lg shadow-[#006b5f]/5">
                  <div className="absolute top-3 right-3 bg-[#006b5f] text-white text-[9px] font-black uppercase px-2.5 py-1 rounded-full tracking-widest leading-none">
                    Khuyên dùng
                  </div>

                  <div>
                    <h4 className="font-display font-black text-lg text-[#006b5f] dark:text-teal-400 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" />
                      <span>Pro Premium</span>
                    </h4>
                    <p className="text-xs text-slate-450 dark:text-slate-400 font-semibold mt-1">Đầy đủ sức mạnh bức phá học tập</p>
                    
                    <div className="my-6">
                      <span className="text-3xl font-black font-display text-slate-800 dark:text-slate-100">99.000đ</span>
                      <span className="text-xs text-slate-400 font-semibold"> / tháng</span>
                    </div>

                    <ul className="space-y-3.5 text-xs text-slate-600 dark:text-slate-350 border-t border-[#006b5f]/20 pt-6">
                      <li className="flex items-center gap-2 font-bold">
                        <Check className="w-4 h-4 text-[#006b5f] dark:text-teal-400" />
                        <span>Không giới hạn tài liệu tải lên</span>
                      </li>
                      <li className="flex items-center gap-2 font-bold">
                        <Check className="w-4 h-4 text-[#006b5f] dark:text-teal-400" />
                        <span>AI Context Explanation chuyên sâu</span>
                      </li>
                      <li className="flex items-center gap-2 font-bold">
                        <Check className="w-4 h-4 text-[#006b5f] dark:text-teal-400" />
                        <span>Không giới hạn flashcards Simple SRS</span>
                      </li>
                      <li className="flex items-center gap-2 font-bold">
                        <Check className="w-4 h-4 text-[#006b5f] dark:text-teal-400" />
                        <span>Offline Cache từ điển CC-CEDICT đầy đủ</span>
                      </li>
                      <li className="flex items-center gap-2 font-bold">
                        <Check className="w-4 h-4 text-[#006b5f] dark:text-teal-400" />
                        <span>Đồng bộ và sao lưu snapshot dữ liệu</span>
                      </li>
                    </ul>
                  </div>

                  <button
                    onClick={() => {
                      setShowPricingModal(false);
                      navigate('/dashboard');
                    }}
                    className="w-full mt-8 bg-[#006b5f] hover:bg-[#005048] text-white font-extrabold text-xs py-3.5 rounded-xl transition-all shadow-md shadow-[#006b5f]/25 cursor-pointer text-center"
                  >
                    Nâng cấp Premium
                  </button>
                </div>

              </div>

              {/* Security Badge */}
              <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-8 border-t border-slate-100 dark:border-slate-800/80 pt-4">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Thanh toán an toàn, bảo mật tuyệt đối</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
