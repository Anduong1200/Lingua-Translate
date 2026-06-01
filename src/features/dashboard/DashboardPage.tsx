import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload, Sparkles, Award, Play, Bell, Zap,
  HelpCircle, AlertCircle, RefreshCw, ChevronRight, FileText, Loader2, BookOpen, Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PandaMascot from '@/components/PandaMascot';
import RecentDocuments from '@/components/RecentDocuments';
import { useStore } from '@/store/useStore';
import { DocumentContent } from '@/types';

export default function DashboardPage() {
  const navigate = useNavigate();
  const {
    savedWords, documents, reviewItems, learningProgress,
    setCurrentDocument, addDocument, translateFile, deleteDocument
  } = useStore();

  const [dragActive, setDragActive] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteTitle, setPasteTitle] = useState('');
  const [pasteContent, setPasteContent] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculate HSK progress circular properties
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const targetProgress = learningProgress.dailyGoal > 0 ? learningProgress.todayProgress / learningProgress.dailyGoal : 0;
  const percentage = Math.min(100, Math.round(targetProgress * 100));
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  let highestHsk = 1;
  savedWords.forEach(w => {
    if (w.hskLevel && w.hskLevel > highestHsk) highestHsk = w.hskLevel;
  });
  const hskLevelText = highestHsk === 7 ? 'HSK 7–9' : `HSK ${highestHsk}`;

  const dueReviews = reviewItems.filter((item) => new Date(item.due_at).getTime() <= Date.now());

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleUploadDocument = (title: string, content: string, type: 'txt' | 'pdf' | 'docx' = 'txt') => {
    const docId = `local-${Date.now()}`;
    const newDoc: DocumentContent = {
        id: docId,
        title,
        type,
        content,
        sentences: [],
        uploadedAt: new Date(),
        readingProgress: 0,
        highlights: [],
        notes: []
    };
    addDocument(newDoc);

    // Set as current and navigate to reader
    setTimeout(() => {
      const storedDoc = useStore.getState().documents.find(d => d.id === docId);
      if (storedDoc) {
        setCurrentDocument(storedDoc);
        navigate('/reader');
      }
    }, 100);
  };

  const processFile = async (file: File) => {
    if (!file) return;
    setIsUploading(true);
    try {
      const result = await translateFile(file);
      if (result) {
        setCurrentDocument(result);
        navigate('/reader');
      } else {
        alert('Không thể đọc được file này. Vui lòng thử lại với PDF, DOCX, TXT hoặc ảnh rõ nét.');
      }
    } catch (err) {
      alert('Đã xảy ra lỗi khi tải file.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handlePasteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pasteTitle.trim() || !pasteContent.trim()) return;
    handleUploadDocument(pasteTitle.trim() + '.txt', pasteContent.trim(), 'txt');
    setPasteTitle('');
    setPasteContent('');
    setShowPasteModal(false);
  };

  const handleSelectDocument = (doc: DocumentContent) => {
    setCurrentDocument(doc);
    navigate('/reader');
  };

  const handleDeleteDocument = (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa tài liệu này?")) {
      void deleteDocument(id);
    }
  };

  const handleStartReview = () => {
    navigate('/flashcards');
  };

  return (
    <div className="w-full flex flex-col lg:flex-row gap-8 pb-16 relative z-10">

      {/* 1. LEFT COLUMN: Greetings, Media uploaders, and Recent list (65% width) */}
      <div className="w-full lg:w-2/3 space-y-8">

        {/* Welcome Block + Animated Panda Mascot side-by-side */}
        <div className="flex flex-col sm:flex-row items-center justify-between bg-gradient-to-tr from-[#f0f9f9]/80 to-white/60 dark:from-slate-900/60 dark:to-slate-950/30 rounded-3xl p-8 border border-white/40 dark:border-slate-800/40 shadow-xl relative overflow-hidden backdrop-blur-md">
          {/* Blurred decorative accent glow */}
          <div className="absolute top-0 right-0 w-36 h-36 bg-[#006b5f]/5 dark:bg-[#006b5f]/5 rounded-full filter blur-xl" />

          <div className="space-y-4 max-w-md text-center sm:text-left">
            <h1 className="text-3xl md:text-4xl font-display font-black text-[#131b2e] dark:text-slate-100 tracking-tight leading-none">
              Chào mừng quay lại!
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Hôm nay là một ngày tuyệt vời để bứt phá tiếng Trung của bạn cùng Hanora Context Reader. Hãy học từ mới và phân tích bài khóa ngay nhé!
            </p>
          </div>

          {/* Clean waving custom CSS vector Panda box mascot */}
          <div className="mt-6 sm:mt-0 transform hover:scale-105 duration-200">
            <PandaMascot />
          </div>
        </div>

        {/* Upload documents dasher element */}
        <div className="space-y-4">
          <h2 className="font-display font-bold text-lg md:text-xl text-[#006b5f] dark:text-teal-400 tracking-tight flex items-center">
            <Upload className="w-5 h-5 mr-2 animate-bounce" />
            <span>Tải Tài Liệu Mới</span>
          </h2>

          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`group cursor-pointer border-2 border-dashed rounded-3xl p-10 text-center transition-all duration-300 bg-white/60 dark:bg-slate-900/40 border-teal-200/80 dark:border-slate-800 shadow-xl flex flex-col items-center justify-center relative min-h-[240px] hover:border-[#006b5f]/40 hover:-translate-y-0.5 ${
              dragActive
                ? 'border-[#006b5f] bg-[#f0f9f9]/20 dark:bg-teal-950/20'
                : ''
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            {/* Real hidden file picker */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".txt,.pdf,.docx,.png,.jpg,.jpeg,.webp"
              className="hidden"
            />

            {isUploading && (
              <div className="absolute inset-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md rounded-[28px] flex flex-col items-center justify-center z-20">
                <Loader2 className="w-10 h-10 text-[#006b5f] animate-spin mb-4" />
                <p className="text-sm font-bold text-slate-600 dark:text-slate-350">Đang xử lý & phân tích tài liệu...</p>
              </div>
            )}

            <div className="p-4 bg-[#f0f9f9] dark:bg-teal-950/40 rounded-2xl text-[#006b5f] mb-4 group-hover:scale-110 transition-transform duration-300">
              <Upload className="w-6 h-6" />
            </div>

            <h3 className="font-display font-bold text-base text-slate-800 dark:text-slate-150 mb-1">Kéo thả tài liệu tiếng Trung</h3>
            <p className="text-xs text-slate-400 dark:text-slate-400 mb-6">Định dạng hỗ trợ: PDF, DOCX, TXT, PNG/JPG/WEBP</p>

            <div className="flex gap-x-3 items-center">
              <button
                type="button"
                className="bg-[#006b5f] hover:bg-[#005048] text-white font-bold text-xs px-6 py-3 rounded-xl transition-all shadow-md shadow-teal-500/10 cursor-pointer active:scale-95 duration-100"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                Chọn tệp tin
              </button>

              <button
                type="button"
                className="bg-slate-50 dark:bg-slate-950 hover:bg-[#006b5f]/5 dark:hover:bg-slate-800 text-slate-500 hover:text-[#006b5f] hover:border-[#006b5f]/30 dark:text-slate-400 font-bold text-xs px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-800 transition-all cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPasteModal(true);
                }}
              >
                Nhập tay văn bản
              </button>
            </div>
          </div>
        </div>

        {/* Recent Documents interactive rows list */}
        <RecentDocuments
          documents={documents}
          onSelectDocument={handleSelectDocument}
          onDeleteDocument={handleDeleteDocument}
        />

      </div>

      {/* 2. RIGHT COLUMN: Statistics sidebar & Daily review module (35% width) */}
      <div className="w-full lg:w-1/3 space-y-8">

        {/* HSK Progress Wheel Circle Indicator */}
        <div className="bg-white/70 dark:bg-slate-900/70 border border-white/40 dark:border-slate-800/40 rounded-3xl p-6 space-y-5 shadow-lg backdrop-blur-md">
          <h2 className="font-display font-bold text-base md:text-lg text-slate-800 dark:text-slate-150 tracking-tight">
            Tiến Độ Học Tập HSK
          </h2>

          <div className="flex flex-col items-center justify-center p-4">
            {/* Circle Progress graphics */}
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                {/* Background circular track grey */}
                <circle
                  cx="72"
                  cy="72"
                  r={radius}
                  fill="transparent"
                  stroke="#e2e8f0"
                  strokeWidth="8"
                  className="dark:stroke-slate-800"
                />
                {/* Filled circular track teal */}
                <circle
                  cx="72"
                  cy="72"
                  r={radius}
                  fill="transparent"
                  stroke="url(#progress-gradient)"
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
                {/* Gradation definitions inside SVG */}
                <defs>
                  <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#006b5f" />
                    <stop offset="100%" stopColor="#0060ac" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Inner numeric counter */}
              <div className="absolute text-center">
                <p className="text-xs font-black text-slate-400 font-mono tracking-wider">{hskLevelText}</p>
                <p className="text-3xl font-display font-black text-slate-800 dark:text-slate-100 tracking-tight leading-none mt-1">{percentage}%</p>
              </div>
            </div>

            <div className="text-center mt-6 max-w-xs space-y-1">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 leading-tight">
                Mục tiêu học tập hôm nay
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-400">
                Hoàn thành thêm <span className="font-bold text-[#006b5f] dark:text-teal-400">{Math.max(0, learningProgress.dailyGoal - learningProgress.todayProgress)}</span> từ mới để hoàn thiện 100% mục tiêu!
              </p>
            </div>
          </div>
        </div>

        {/* Daily review Deck component */}
        <div className="bg-gradient-to-br from-[#f0f9f9]/80 via-white/80 to-[#eaedff]/30 dark:from-slate-900/40 dark:to-slate-950/20 border border-[#006b5f]/20 dark:border-slate-800/40 rounded-3xl p-8 text-center relative overflow-hidden shadow-lg backdrop-blur-md group hover:border-[#006b5f]/30 duration-300">
          {/* Accent light aura */}
          <div className="absolute top-[-50px] left-[-50px] w-24 h-24 bg-[#006b5f]/5 rounded-full filter blur-xl" />

          {/* Card Graphic */}
          <div className="relative w-16 h-16 mx-auto mb-5 flex items-center justify-center">
            {/* Back stacked cards */}
            <div className="absolute top-1.5 left-3.5 w-10 h-12 bg-white/60 dark:bg-slate-950/60 border border-[#006b5f]/20 dark:border-slate-800 rounded-xl transform rotate-12 group-hover:rotate-[16deg] duration-300" />
            <div className="absolute top-0.5 left-2 w-10 h-12 bg-white/80 dark:bg-slate-950/85 border border-[#006b5f]/10 dark:border-slate-800 rounded-xl transform -rotate-6 group-hover:-rotate-[10deg] duration-300" />
            {/* Front card */}
            <div className="relative w-10 h-12 bg-gradient-to-br from-[#006b5f] to-[#0060ac] text-white rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/25 border border-teal-600/10 transform duration-300 group-hover:scale-105">
              <Zap className="w-5 h-5 fill-amber-300 stroke-amber-300 text-amber-300" />
            </div>
          </div>

          <h2 className="text-4xl font-display font-black text-slate-800 dark:text-slate-100 tracking-tight leading-none">
            {dueReviews.length}
          </h2>
          <p className="text-[12px] font-bold text-slate-500 dark:text-slate-400 mt-2 tracking-wide uppercase">
            Từ Vựng Cần Ôn Tập Hôm Nay
          </p>

          <button
            onClick={handleStartReview}
            disabled={dueReviews.length === 0 && reviewItems.length === 0}
            className="w-full mt-6 bg-[#006b5f] hover:bg-[#005048] text-white font-extrabold text-xs py-3.5 rounded-2xl shadow-lg shadow-teal-500/15 transition-all cursor-pointer flex items-center justify-center gap-x-1.5 disabled:bg-slate-200 dark:disabled:bg-slate-900 disabled:text-slate-400 dark:disabled:text-slate-700 disabled:shadow-none disabled:cursor-not-allowed transform active:scale-95 duration-100"
          >
            <span>BẮT ĐẦU ÔN TẬP</span>
          </button>
        </div>

      </div>

      {/* Manual Input Paste Modal */}
      <AnimatePresence>
        {showPasteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Dark blur glass overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPasteModal(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-white/85 dark:bg-slate-900/85 border border-white/40 dark:border-slate-800/40 rounded-3xl w-full max-w-xl p-8 shadow-2xl space-y-5 backdrop-blur-xl"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <h3 className="font-display font-bold text-slate-800 dark:text-slate-100 text-base flex items-center">
                  <FileText className="w-5 h-5 text-[#006b5f] mr-2" />
                  <span>Nhập nội dung văn bản mới</span>
                </h3>
                <button
                  onClick={() => setShowPasteModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold font-mono cursor-pointer w-8 h-8 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handlePasteSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Tiêu đề tài liệu</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Đoạn văn mẫu ôn thi HSK 3"
                    value={pasteTitle}
                    onChange={(e) => setPasteTitle(e.target.value)}
                    className="w-full text-xs p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:border-[#006b5f] focus:ring-1 focus:ring-[#006b5f] focus:outline-none dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Nội dung văn bản (Hanzi)</label>
                  <textarea
                    required
                    rows={8}
                    placeholder="Dán nội dung chữ Hán học tập của bạn tại đây..."
                    value={pasteContent}
                    onChange={(e) => setPasteContent(e.target.value)}
                    className="w-full text-xs p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent focus:border-[#006b5f] focus:ring-1 focus:ring-[#006b5f] focus:outline-none custom-scrollbar dark:text-slate-100 leading-relaxed"
                  />
                </div>
                <div className="flex gap-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPasteModal(false)}
                    className="flex-1 bg-slate-50 dark:bg-slate-950 hover:bg-[#006b5f]/5 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl py-3 text-xs font-bold cursor-pointer transition-all border border-slate-200 dark:border-slate-800"
                  >
                    Bỏ qua
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-[#006b5f] hover:bg-[#005048] text-white rounded-xl py-3 text-xs font-bold cursor-pointer transition-all shadow-md shadow-[#006b5f]/20"
                  >
                    Lưu & Phân tích
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
