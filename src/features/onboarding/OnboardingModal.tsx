import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, BookOpen, Layers, Globe, Type, CheckCircle, Sparkles } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { DocumentContent } from '@/types';

const HSK_LEVELS = ['HSK1', 'HSK2', 'HSK3', 'HSK4', 'HSK5', 'HSK6'];
const DOMAINS = [
  { id: 'auto', label: 'Tự động (General)' },
  { id: 'economics', label: 'Kinh tế & Tài chính' },
  { id: 'computer_science', label: 'Công nghệ thông tin' },
  { id: 'education', label: 'Giáo dục & Học thuật' }
 ] as const;
const PINYIN_MODES = [
  { id: 'always', label: 'Luôn hiển thị (Mới học)' },
  { id: 'unknown_only', label: 'Chỉ hiển thị khi tra từ (Khuyên dùng)' },
  { id: 'never', label: 'Ẩn hoàn toàn (Nâng cao)' }
 ] as const;

export default function OnboardingModal() {
  const navigate = useNavigate();
  const { settings, updateSettings, addDocument, setCurrentDocument } = useStore();
  const [step, setStep] = useState(1);
  const [localSettings, setLocalSettings] = useState({
    targetHskLevel: settings.targetHskLevel || 'HSK4',
    domainMode: settings.domainMode || 'auto',
    showPinyinMode: settings.showPinyinMode || 'unknown_only'
  });

  // Only render if not completed
  if (settings.hasCompletedOnboarding) return null;

  const handleNext = () => {
    if (step < 5) setStep(step + 1);
  };

  const handlePrev = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleFinish = () => {
    // Save settings
    updateSettings({
      ...localSettings,
      hasCompletedOnboarding: true,
      domainMode: localSettings.domainMode as any,
      showPinyinMode: localSettings.showPinyinMode as any,
    });

    // Create Sample Document
    const docId = `sample-${Date.now()}`;
    const sampleContent = `你好！欢迎使用 Hanora Context Reader。这是一个专为越南学习者设计的中文阅读工具。\n\n在这份示例文档中，你可以尝试选中你不懂的单词或句子。Hanora 会为你提供精准的翻译和解析。\n\n无论你是经济领域的专家，还是计算机科学的学生，都可以找到适合你的学习材料。\n\n学习语言是一段漫长但充满乐趣的旅程，让我们一起开始吧！`;
    
    const newDoc: DocumentContent = {
        id: docId,
        title: 'Tài liệu hướng dẫn (Sample)',
        type: 'txt',
        content: sampleContent,
        sentences: [],
        uploadedAt: new Date(),
        readingProgress: 0,
        highlights: [],
        notes: []
    };
    
    addDocument(newDoc);
    setCurrentDocument(newDoc);
    navigate('/reader');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-xl overflow-hidden rounded-[2rem] bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
        >
          {/* Header Progress */}
          <div className="bg-[#006b5f]/5 dark:bg-slate-800/50 p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
              {step === 1 && 'Trình độ của bạn'}
              {step === 2 && 'Lĩnh vực quan tâm'}
              {step === 3 && 'Hiển thị Pinyin'}
              {step === 4 && 'Dành cho bạn'}
              {step === 5 && 'Cách tra từ'}
            </h2>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <div key={s} className={`h-1.5 rounded-full transition-all ${s === step ? 'w-6 bg-[#006b5f]' : s < step ? 'w-2 bg-[#006b5f]/50' : 'w-2 bg-slate-200 dark:bg-slate-700'}`} />
              ))}
            </div>
          </div>

          {/* Content Body */}
          <div className="p-8 h-[320px] flex flex-col justify-center">
            {step === 1 && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 text-[#006b5f]">
                  <Layers className="w-8 h-8" />
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                    Chọn mục tiêu HSK hiện tại của bạn để Hanora tối ưu hóa việc phân loại từ vựng và gợi ý ôn tập.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {HSK_LEVELS.map(level => (
                    <button
                      key={level}
                      onClick={() => setLocalSettings(prev => ({ ...prev, targetHskLevel: level }))}
                      className={`py-3 rounded-xl border-2 font-bold transition-all ${localSettings.targetHskLevel === level ? 'border-[#006b5f] bg-[#006b5f]/5 text-[#006b5f]' : 'border-slate-100 dark:border-slate-800 text-slate-500 hover:border-[#006b5f]/30 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 text-amber-600">
                  <Globe className="w-8 h-8" />
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                    Ngữ cảnh dịch thuật sẽ chính xác hơn nếu Hanora biết bạn thường đọc loại tài liệu nào.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {DOMAINS.map(domain => (
                    <button
                      key={domain.id}
                      onClick={() => setLocalSettings(prev => ({ ...prev, domainMode: domain.id }))}
                      className={`p-4 rounded-xl border-2 font-bold text-sm text-left transition-all ${localSettings.domainMode === domain.id ? 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:border-amber-600' : 'border-slate-100 dark:border-slate-800 text-slate-500 hover:border-amber-500/30'}`}
                    >
                      {domain.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 text-indigo-600">
                  <Type className="w-8 h-8" />
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                    Tùy chỉnh cách hiển thị Pinyin để tránh bị phụ thuộc khi đọc mặt chữ Hán.
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  {PINYIN_MODES.map(mode => (
                    <button
                      key={mode.id}
                      onClick={() => setLocalSettings(prev => ({ ...prev, showPinyinMode: mode.id }))}
                      className={`p-4 rounded-xl border-2 font-bold text-sm text-left transition-all ${localSettings.showPinyinMode === mode.id ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:border-indigo-600' : 'border-slate-100 dark:border-slate-800 text-slate-500 hover:border-indigo-500/30'}`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="text-center space-y-6">
                <div className="w-20 h-20 bg-[#006b5f]/10 text-[#006b5f] rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">Tuyệt vời!</h3>
                <p className="text-slate-600 dark:text-slate-300 max-w-sm mx-auto">
                  Mình đã chuẩn bị sẵn một tệp tin PDF/TXT mẫu (Sample Document) dựa trên thiết lập của bạn. 
                </p>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-6 text-center">
                <div className="relative mx-auto w-48 h-32 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-inner flex items-center justify-center">
                   <motion.div 
                     animate={{ x: [-20, 20, 20, -20], backgroundColor: ['#ffffff', '#bae6fd', '#bae6fd', '#ffffff'] }}
                     transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                     className="px-2 py-1 rounded select-none text-slate-800 font-bold dark:text-white"
                   >
                     你好世界
                   </motion.div>
                   <Sparkles className="absolute top-2 right-2 w-5 h-5 text-amber-500 animate-pulse" />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">Bôi đen để tra cứu</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Chỉ cần <strong>bôi đen từ hoặc câu</strong> trong tài liệu mẫu, Hanora sẽ tự động phân tích ngữ pháp và hiển thị nghĩa phù hợp ngữ cảnh.
                </p>
              </div>
            )}
          </div>

          {/* Footer Controls */}
          <div className="bg-slate-50 dark:bg-slate-900/50 p-6 flex justify-between border-t border-slate-100 dark:border-slate-800">
            {step > 1 ? (
              <button onClick={handlePrev} className="px-6 py-2.5 rounded-xl text-slate-500 font-bold hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors flex items-center gap-2">
                <ChevronLeft className="w-4 h-4" /> Quay lại
              </button>
            ) : (
              <div /> // Spacer
            )}
            
            {step < 5 ? (
              <button onClick={handleNext} className="px-6 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-lg shadow-slate-900/20">
                Tiếp tục <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={handleFinish} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#006b5f] to-[#14b8a6] text-white font-bold hover:shadow-xl hover:shadow-teal-500/30 transition-all flex items-center gap-2">
                Mở tài liệu mẫu <BookOpen className="w-4 h-4" />
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
