import React, { useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { Loader2, Moon, Sun, Globe, Compass, Layers, CloudOff, Zap } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const setCurrentDocument = useStore(state => state.setCurrentDocument);
  const translateFile = useStore(state => state.translateFile);
  const { isDarkMode, toggleDarkMode } = useStore();
  const [isUploading, setIsUploading] = useState(false);

  const processFile = async (file: File) => {
    if (!file) return;
    setIsUploading(true);
    try {
      const result = await translateFile(file);
      if (result) {
        setCurrentDocument(result);
        navigate('/reader');
      } else {
        alert('Không thể đọc được file này. Vui lòng thử lại với file TXT hoặc PDF.');
      }
    } catch (err) {
      console.error(err);
      alert('Đã xảy ra lỗi khi tải file.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className="font-sans text-slate-900 dark:text-slate-100 antialiased selection:bg-teal-100 selection:text-teal-900 flex flex-col min-h-screen">
      <nav className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md w-full top-0 sticky z-50 border-b border-white/40 dark:border-slate-800/40 shadow-sm transition-all duration-300">
        <div className="flex justify-between items-center w-full px-6 md:px-10 max-w-7xl mx-auto h-20">
          <Link to="/" className="text-2xl font-display font-bold text-[#006b5f] dark:text-teal-400 flex items-center gap-2 hover:opacity-80 transition-opacity">
            Hanora
          </Link>
          <div className="hidden md:flex items-center space-x-8">
            <a href="#" className="text-sm font-semibold text-[#006b5f] dark:text-teal-400 border-b-2 border-[#006b5f] dark:border-teal-400 pb-1 hover:opacity-80 transition-opacity">Features</a>
            <a href="#" className="text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-[#006b5f] dark:hover:text-teal-400 transition-colors hover:opacity-80">Tools</a>
            <a href="#" className="text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-[#006b5f] dark:hover:text-teal-400 transition-colors hover:opacity-80">Pricing</a>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="bg-[#006b5f] hover:bg-[#005048] text-white text-sm font-semibold py-2 px-6 rounded-md transition-all shadow-sm hover:shadow-md active:scale-95 duration-200 flex items-center gap-2"
            >
              {isUploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</> : 'Get Started'}
            </button>
          </div>
        </div>
      </nav>

      <main className="w-full flex-grow flex flex-col items-center">
        <section className="w-full max-w-7xl mx-auto px-6 md:px-10 pt-16 md:pt-24 pb-16 flex flex-col items-center text-center relative z-10">
          <div className="mb-8 relative w-full max-w-md mx-auto aspect-square flex items-center justify-center">
            <div className="absolute inset-0 bg-sky-100/20 dark:bg-sky-900/20 rounded-full blur-3xl -z-10 animate-pulse"></div>
            <img alt="Cute Panda Mascot in a box" className="w-full h-auto object-contain drop-shadow-2xl z-10 relative hover:scale-105 transition-transform duration-500" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD5Q-bON4zlybBklX7gJB1XXgISME5YlT2trvpsuAoa6EE1UylhAS2dLzapIGIrUA67hnchhrWPr8sSpic76FCmZalzhgvr_nkw0raeIUEp2CvWopx0dJBFexohuI_ls7c2jBSRKtyhFXiXpKStI8v9HxPVFe14SMlvRsef-U_STd8xppm5vTHC54SQdwgr1att14o9j1laU8cN1gAOj-2Vdmlbey6oAqNdMoPGqYCN-4HJy4OtHwzWg1S2aSxPAyeKucrODTBCzQKA"/>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold md:font-black text-slate-900 dark:text-slate-100 mb-6 max-w-4xl tracking-tight leading-tight font-display">
            Trình Biên Dịch & Học Từ Vựng Tiếng Trung Tự Động
          </h1>
          <p className="text-base md:text-lg text-slate-600 dark:text-slate-400 mb-10 max-w-2xl">
            Dịch tài liệu, tra từ theo ngữ cảnh, luyện phát âm và tự động tạo flashcard từ từ vựng đã học.
          </p>
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="bg-[#006b5f] text-white font-semibold py-4 px-10 rounded-full shadow-lg shadow-teal-500/30 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-lg flex items-center gap-2"
          >
            {isUploading ? <><Loader2 className="w-5 h-5 animate-spin" /> Đang tải...</> : 'Dùng thử ngay'}
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".txt,.pdf,.docx"
            className="hidden"
          />
        </section>

        <section className="w-full max-w-7xl mx-auto px-6 md:px-10 py-16 relative z-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white/85 dark:bg-slate-800/85 backdrop-blur-md border border-white/50 dark:border-slate-700/50 shadow-[0_20px_40px_rgba(96,165,250,0.1)] rounded-xl p-8 flex flex-col items-center text-center group hover:-translate-y-2 transition-transform duration-300">
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-6 text-[#006b5f] dark:text-teal-400 group-hover:bg-[#006b5f] group-hover:text-white transition-colors">
                <Globe className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-3 font-display">Dịch tài liệu tự động</h3>
              <p className="text-base text-slate-600 dark:text-slate-400">Tự động dịch các tệp DOCX, PDF, TXT giữ nguyên định dạng.</p>
            </div>
            
            <div className="bg-white/85 dark:bg-slate-800/85 backdrop-blur-md border border-white/50 dark:border-slate-700/50 shadow-[0_20px_40px_rgba(96,165,250,0.1)] rounded-xl p-8 flex flex-col items-center text-center group hover:-translate-y-2 transition-transform duration-300 delay-100">
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-6 text-[#006b5f] dark:text-teal-400 group-hover:bg-[#006b5f] group-hover:text-white transition-colors">
                <Compass className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-3 font-display">Tra từ thông minh trên PDF</h3>
              <p className="text-base text-slate-600 dark:text-slate-400">Tra từ ngay trên tài liệu của bạn với giải thích ngữ cảnh AI.</p>
            </div>
            
            <div className="bg-white/85 dark:bg-slate-800/85 backdrop-blur-md border border-white/50 dark:border-slate-700/50 shadow-[0_20px_40px_rgba(96,165,250,0.1)] rounded-xl p-8 flex flex-col items-center text-center group hover:-translate-y-2 transition-transform duration-300 delay-200">
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-6 text-[#006b5f] dark:text-teal-400 group-hover:bg-[#006b5f] group-hover:text-white transition-colors">
                <Layers className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-3 font-display">Flashcards tự động</h3>
              <p className="text-base text-slate-600 dark:text-slate-400">Tạo và ôn tập flashcard hiệu quả dựa trên thuật toán lặp lại ngắt quãng (SRS).</p>
            </div>
          </div>
        </section>

        <section className="w-full bg-slate-50/50 dark:bg-slate-900/50 py-20 mt-10">
          <div className="max-w-7xl mx-auto px-6 md:px-10 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-4 font-display">
              Học tập không giới hạn, mọi lúc mọi nơi
            </h2>
            <p className="text-base text-slate-600 dark:text-slate-400 max-w-3xl mx-auto mb-12">
              Hanora được thiết kế để đồng hành cùng bạn mọi lúc. Tính năng Offline-First đảm bảo bạn luôn có thể tra cứu và học từ vựng ngay cả khi không có kết nối internet, kết hợp cùng AI Context Explanations giúp hiểu sâu sắc ý nghĩa từ trong từng hoàn cảnh cụ thể.
            </p>
            <div className="flex flex-wrap justify-center gap-6">
              <div className="flex items-center gap-2 bg-white dark:bg-slate-800 py-2 px-4 rounded-full border border-slate-200/30 dark:border-slate-700/30 shadow-sm">
                <CloudOff className="w-5 h-5 text-[#006b5f] dark:text-teal-400" />
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">Offline-First Capability</span>
              </div>
              <div className="flex items-center gap-2 bg-white dark:bg-slate-800 py-2 px-4 rounded-full border border-slate-200/30 dark:border-slate-700/30 shadow-sm">
                <Zap className="w-5 h-5 text-[#006b5f] dark:text-teal-400" />
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">AI Context Explanations</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-slate-50 dark:bg-slate-900 w-full py-8 border-t border-slate-200/30 dark:border-slate-800/30 mt-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full px-6 md:px-10 max-w-7xl mx-auto">
          <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-4">
            <div className="text-2xl font-bold font-display text-[#006b5f] dark:text-teal-400">
              Hanora
            </div>
            <div className="text-base text-slate-500 dark:text-slate-500">
              © 2026 Hanora. All rights reserved.
            </div>
          </div>
          <div className="flex justify-center md:justify-end items-center space-x-6">
            <a href="#" className="text-base text-slate-600 dark:text-slate-400 hover:text-[#006b5f] dark:hover:text-teal-400 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 rounded">
              Terms of Service
            </a>
            <a href="#" className="text-base text-slate-600 dark:text-slate-400 hover:text-[#006b5f] dark:hover:text-teal-400 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 rounded">
              Privacy Policy
            </a>
            <a href="#" className="text-base text-slate-600 dark:text-slate-400 hover:text-[#006b5f] dark:hover:text-teal-400 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 rounded">
              Contact Us
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
