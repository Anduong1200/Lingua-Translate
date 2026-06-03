import React, { memo, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { Award, BookMarked, BookOpen, BookmarkPlus, Brain, CheckCircle, ChevronDown, Columns, FilePlus2, FileText, Highlighter, History, Layers, Loader2, MessageSquare, Minus, Plus, Search, Send, Settings, Sparkles, SpellCheck, Trash2, Type, Upload, UserCircle, Volume2, X } from 'lucide-react'
import { useStore } from '@/store/useStore'
import type { AnnotationRecord, ChineseAnalysis, ChineseDefinition, ChineseSentenceAnalysis, ChineseToken, DocumentContent, DocumentTranslationSentence, FlashCard, SavedWord } from '@/types'
import { estimateHskLabel, getVietnameseDefinition } from '@/lib/chinese'
import { generateId } from '@/lib/utils'
import { API_BASE_URL, splitDocumentSentences } from '@/store/slices/types'
import { primaryNavPages, workspacePageCount } from '@/config/pages'
import { type ChatMessage, findSentenceForSelection, formatAiChatReply, isSelectableToken, messageTime, type PdfSelection, type QuizQuestion, speakChinese } from './readerUtils'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

import { useReaderController } from './hooks/useReaderController'
import { ReaderView, SidebarTab, TranslateScope, TextSelection, FloatingCoords, BackendTranslationUnit, ContextTranslationResult, BackendQuizResponse, readStoredHistory, cleanDictionaryText, tokenVietnamese, tokenEnglish, tokenPinyin, knownSentenceTranslation, isMissingTranslation, sentenceFallbackTranslation, splitDocumentParagraphs, findParagraphForSelection, groupSentencesByParagraph, bestSentenceTranslation, buildContextualToken, splitFallbackSentences, safeBbox, historyStorageKey } from './components/readerShared'

import { SentenceLine } from './components/SentenceLine'
import { PdfDocumentViewer } from './components/PdfDocumentViewer'
import { EmptyReader } from './components/EmptyReader'
import { TextDocumentReader } from './components/TextDocumentReader'
import { ReaderSidebar } from './components/ReaderSidebar'
import { ChatPanel, FloatingChatWidget } from './components/ChatPanel'
import { ReaderInfoBlock } from './components/ReaderInfoBlock'
import { QuizPanel } from './components/QuizPanel'
import { SavedHub } from './components/SavedHub'
import { PasteDocumentModal } from './components/PasteDocumentModal'

export default function ReaderPage() {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const ctrl = useReaderController(fileInputRef)
    const {
        store, currentView, setCurrentView, selectedSentence, selectedToken, textSelection, pdfSelection, popupCoords, setPopupCoords,
        savedNotice, setSavedNotice, showFontSizeMenu, setShowFontSizeMenu, pasteModalOpen, setPasteModalOpen, zoomPercent, setZoomPercent,
        activeTab, setActiveTab, historyList, chatOpen, setChatOpen, chatInput, setChatInput, chatMessages, chatLoading,
        contextTranslation, contextTranslationLoading, contextTranslateScope, quizQuestions, quizLoading, quizScore, quizFinished,
        currentQuestionIndex, selectedAnswerIndex, sentences, currentTranslations, activeSentenceIndex, hskLabel, candidateSelection,
        activeAnalysis, selectedSurface, sourceSentence, quickVi, quickEn, quickPinyin, selectedParagraphContext, selectedSentenceTranslation,
        selectedLiteralTranslation, loadingAnalysis, handleTranslateScope, handleSentenceClick, handleTokenSelection, handleTextMouseSelection,
        handlePdfSelection, handlePopupAnalyze, handleSave, handleGenerateAiNote, handleChatSubmit, handleGenerateQuiz, handleQuizAnswer,
        handleTranslateDocument, handleScanVocabulary, handleCreateAutoReviewItems, handleUploadFile, handleCreatePastedDocument, aiContext, isGeneratingAIContext, setTextSelection, setPdfSelection, analyzeSelection, removeAnnotation,
    } = ctrl
    const { currentDocument, documents, setCurrentDocument, savedWords, annotations, flashCards, submitReview, removeSavedWord, settings, isSideBySide, toggleSideBySide, updateSettings, isTranslatingDocument, isScanningVocabulary } = store
    const [ocrAttemptedIds, setOcrAttemptedIds] = useState<Set<string>>(() => new Set())
    const [isRefreshingOcr, setIsRefreshingOcr] = useState(false)

    const toolbarTop = popupCoords ? Math.max(70, popupCoords.y - 78) : 0
    const toolbarLeft = popupCoords ? Math.min(window.innerWidth - 220, Math.max(12, popupCoords.x - 110)) : 0
    const viewButtons: Array<{ id: ReaderView; label: string }> = [
        { id: 'documents', label: 'Đọc tài liệu' },
        { id: 'library', label: 'Lưu trong reader' },
        { id: 'study-hub', label: 'Ôn trong reader' },
    ]

    useEffect(() => {
        const document = currentDocument
        if (!document || document.type !== 'pdf' || !document.sourceUrl || document.content.trim() || ocrAttemptedIds.has(document.id)) return

        let cancelled = false
        setOcrAttemptedIds((current) => new Set(current).add(document.id))
        setIsRefreshingOcr(true)
        setSavedNotice('Đang OCR PDF scan để tạo lớp chữ chọn được...')

        fetch(`${API_BASE_URL}/documents/${document.id}/ocr`, { method: 'POST' })
            .then((response) => {
                if (!response.ok) throw new Error(`OCR failed: ${response.status}`)
                return response.json() as Promise<{ content: string; page_count: number }>
            })
            .then((result) => {
                if (cancelled || !result.content?.trim()) return
                const updatedDocument = {
                    ...document,
                    content: result.content,
                    sentences: splitDocumentSentences(result.content, document.id),
                }
                store.addDocument?.(updatedDocument)
                store.setCurrentDocument?.(updatedDocument)
                setSavedNotice(`Đã OCR ${result.page_count || 1} trang PDF, có thể bôi chữ để tra từ.`)
            })
            .catch(() => {
                if (!cancelled) setSavedNotice('Chưa OCR được PDF scan. Kiểm tra Tesseract/Poppler và thử upload lại.')
            })
            .finally(() => {
                if (!cancelled) setIsRefreshingOcr(false)
            })

        return () => {
            cancelled = true
        }
    }, [currentDocument, ocrAttemptedIds, setSavedNotice, store])

    return (
        <div className="relative flex h-screen flex-col overflow-hidden bg-[#f6f8fb] text-slate-800">
            <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.docx"
                className="hidden"
                onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) void handleUploadFile(file)
                    event.target.value = ''
                }}
            />

            <header className="z-30 flex shrink-0 flex-col gap-2 border-b border-slate-200 bg-white/90 px-4 py-2 shadow-sm backdrop-blur-xl md:px-6">
                <div className="flex min-h-[48px] w-full items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                        <Link to="/dashboard" className="flex shrink-0 items-center gap-2">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#006b5f] text-white shadow-sm">
                                <Sparkles className="h-4.5 w-4.5" />
                            </span>
                            <span className="leading-tight">
                                <span className="block text-[18px] font-black tracking-tight text-teal-700">Hanora</span>
                                <span className="hidden text-[9px] font-black uppercase tracking-[0.18em] text-slate-400 sm:block">{workspacePageCount} workspace pages</span>
                            </span>
                        </Link>
                        <nav className="hidden items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1 xl:flex">
                            {primaryNavPages.map((page) => {
                                const PageIcon = page.icon
                                const isActive = page.key === 'reader'
                                return (
                                    <Link
                                        key={page.key}
                                        to={page.path}
                                        className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black transition ${
                                            isActive ? 'bg-white text-[#006b5f] shadow-sm' : 'text-slate-500 hover:bg-white hover:text-[#006b5f]'
                                        }`}
                                    >
                                        <PageIcon className="h-3.5 w-3.5" />
                                        {page.shortLabel}
                                    </Link>
                                )
                            })}
                        </nav>
                        <nav className="hidden items-center gap-1 rounded-2xl border border-teal-100 bg-teal-50/60 p-1 md:flex">
                            {viewButtons.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => setCurrentView(item.id)}
                                    className={`rounded-xl px-3 py-2 text-xs font-black transition ${
                                        currentView === item.id ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:bg-white hover:text-teal-700'
                                    }`}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </nav>
                    </div>

                {currentView === 'documents' && (
                    <div className="hidden min-w-0 items-center gap-3 rounded-full border border-teal-100/60 bg-white/90 px-4 py-1.5 shadow-sm lg:flex">
                        <button onClick={() => setZoomPercent((value) => Math.max(70, value - 10))} className="rounded-full p-1 text-slate-500 transition hover:bg-slate-100 hover:text-teal-700" title="Thu nhỏ">
                            <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-10 text-center font-mono text-xs font-black text-slate-700">{zoomPercent}%</span>
                        <button onClick={() => setZoomPercent((value) => Math.min(220, value + 10))} className="rounded-full p-1 text-slate-500 transition hover:bg-slate-100 hover:text-teal-700" title="Phóng to">
                            <Plus className="h-3.5 w-3.5" />
                        </button>
                        <div className="mx-1 h-4 w-px bg-slate-200" />
                        <select
                            value={currentDocument?.id || ''}
                            onChange={(event) => setCurrentDocument(documents.find((item) => item.id === event.target.value) ?? null)}
                            className="max-w-[190px] bg-transparent text-xs font-black text-slate-700 outline-none"
                            title="Chọn tài liệu"
                        >
                            {documents.length === 0 && <option value="">Chưa có tài liệu</option>}
                            {documents.map((document) => (
                                <option key={document.id} value={document.id}>{document.title}</option>
                            ))}
                        </select>
                        <ChevronDown className="h-3 w-3 text-slate-400" />
                    </div>
                )}

                <div className="flex shrink-0 items-center gap-2">
                    {currentView === 'documents' && (
                        <>
                            <button onClick={() => fileInputRef.current?.click()} className="rounded-xl p-2 text-teal-600 transition hover:bg-teal-100/50" title="Tải tài liệu">
                                <Upload className="h-5 w-5" />
                            </button>
                            <button onClick={() => setPasteModalOpen(true)} className="rounded-xl p-2 text-teal-600 transition hover:bg-teal-100/50" title="Dán tài liệu">
                                <FilePlus2 className="h-5 w-5" />
                            </button>
                            <button
                                onClick={handleTranslateDocument}
                                disabled={!currentDocument || isTranslatingDocument}
                                className="hidden rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-teal-700 disabled:opacity-50 lg:inline-flex"
                                title="Dịch tài liệu"
                            >
                                {isTranslatingDocument ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                            </button>
                            <button
                                onClick={handleScanVocabulary}
                                disabled={!currentDocument || isScanningVocabulary}
                                className="hidden rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-teal-700 disabled:opacity-50 lg:inline-flex"
                                title="Quét từ vựng"
                            >
                                {isScanningVocabulary ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                            </button>
                            <button
                                onClick={handleCreateAutoReviewItems}
                                disabled={!currentDocument || isScanningVocabulary}
                                className="hidden rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-teal-700 disabled:opacity-50 lg:inline-flex"
                                title="Tạo flashcards tự động"
                            >
                                <BookmarkPlus className="h-5 w-5" />
                            </button>
                            {currentDocument?.type !== 'pdf' && (
                                <button
                                    onClick={toggleSideBySide}
                                    className={`hidden rounded-xl p-2 transition lg:inline-flex ${isSideBySide ? 'bg-teal-50 text-teal-700' : 'text-slate-500 hover:bg-slate-100 hover:text-teal-700'}`}
                                    title="Dịch song song"
                                >
                                    <Columns className="h-5 w-5" />
                                </button>
                            )}
                            <div className="relative hidden lg:block">
                                <button onClick={() => setShowFontSizeMenu((value) => !value)} className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-teal-700" title="Cỡ chữ">
                                    <Type className="h-5 w-5" />
                                </button>
                                {showFontSizeMenu && (
                                    <div className="absolute right-0 top-full z-50 mt-2 w-36 rounded-xl border border-teal-100 bg-white p-2 shadow-xl">
                                        {(['small', 'medium', 'large'] as const).map((size) => (
                                            <button
                                                key={size}
                                                onClick={() => {
                                                    updateSettings({ fontSize: size })
                                                    setShowFontSizeMenu(false)
                                                }}
                                                className={`block w-full rounded-lg px-2.5 py-2 text-left text-xs font-black ${
                                                    settings.fontSize === size ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-50'
                                                }`}
                                            >
                                                {size === 'small' ? 'Nhỏ' : size === 'large' ? 'Lớn' : 'Vừa'}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                    <Link to="/settings" className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600" title="Settings">
                        <Settings className="h-5 w-5" />
                    </Link>
                    <Link to="/dashboard" className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600" title="User space">
                        <UserCircle className="h-5 w-5" />
                    </Link>
                </div>
                </div>

                <div className="flex w-full gap-2 overflow-x-auto pb-0.5 xl:hidden">
                    <nav className="flex shrink-0 items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1">
                        {primaryNavPages.map((page) => {
                            const PageIcon = page.icon
                            const isActive = page.key === 'reader'
                            return (
                                <Link
                                    key={page.key}
                                    to={page.path}
                                    className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-black transition ${
                                        isActive ? 'bg-white text-[#006b5f] shadow-sm' : 'text-slate-500 hover:bg-white hover:text-[#006b5f]'
                                    }`}
                                >
                                    <PageIcon className="h-3.5 w-3.5" />
                                    {page.shortLabel}
                                </Link>
                            )
                        })}
                    </nav>
                    <nav className="flex shrink-0 items-center gap-1 rounded-2xl border border-teal-100 bg-teal-50/60 p-1 md:hidden">
                        {viewButtons.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setCurrentView(item.id)}
                                className={`shrink-0 rounded-xl px-3 py-2 text-xs font-black transition ${
                                    currentView === item.id ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:bg-white hover:text-teal-700'
                                }`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </nav>
                </div>
            </header>

            {savedNotice && (
                <div className="pointer-events-none fixed left-1/2 top-20 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-teal-700 bg-teal-900 px-4 py-2.5 text-xs font-black text-white shadow-lg">
                    {isRefreshingOcr ? <Loader2 className="h-4 w-4 animate-spin text-emerald-300" /> : <CheckCircle className="h-4 w-4 text-emerald-300" />}
                    <span>{savedNotice}</span>
                </div>
            )}

            {currentView === 'documents' ? (
                <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
                    {popupCoords && selectedSurface && (
                        <div
                            style={{ left: toolbarLeft, top: toolbarTop }}
                            className="floating-reader-toolbar fixed z-40 flex items-center gap-3 rounded-xl border border-teal-100 bg-white/95 px-3 py-2 shadow-xl backdrop-blur-md"
                        >
                            <button onClick={handlePopupAnalyze} className="group flex flex-col items-center gap-1 text-teal-700 transition hover:text-teal-900" title="Analyze">
                                <span className="rounded-xl bg-teal-50 p-1.5 transition group-hover:bg-teal-100"><Brain className="h-4 w-4" /></span>
                                <span className="text-[9px] font-black">Analyze</span>
                            </button>
                            <div className="h-7 w-px bg-slate-100" />
                            <button onClick={() => void handleSave(undefined, 'Highlight từ Reader')} className="group flex flex-col items-center gap-1 text-slate-600 transition hover:text-teal-900" title="Highlight">
                                <span className="rounded-xl p-1.5 transition group-hover:bg-slate-50"><Highlighter className="h-4 w-4" /></span>
                                <span className="text-[9px] font-black">Highlight</span>
                            </button>
                            <div className="h-7 w-px bg-slate-100" />
                            <button onClick={() => void handleSave()} className="group flex flex-col items-center gap-1 text-slate-600 transition hover:text-teal-900" title="Review">
                                <span className="rounded-xl p-1.5 transition group-hover:bg-slate-50"><BookmarkPlus className="h-4 w-4" /></span>
                                <span className="text-[9px] font-black">Review</span>
                            </button>
                        </div>
                    )}

                    {currentDocument?.type === 'pdf' && currentDocument.sourceUrl ? (
                        <div className="flex-1 overflow-y-auto border-r border-teal-50/20 bg-slate-900 px-6 py-8">
                            <PdfDocumentViewer
                                sourceUrl={currentDocument.sourceUrl}
                                documentText={currentDocument.content}
                                onSelection={handlePdfSelection}
                                annotations={annotations.filter((annotation) => annotation.document_id === currentDocument.id)}
                                zoom={zoomPercent}
                            />
                        </div>
                    ) : (
                        <TextDocumentReader
                            currentDocument={currentDocument}
                            sentences={sentences}
                            translations={currentTranslations}
                            selectedSentence={selectedSentence}
                            selectedToken={selectedToken}
                            selectedText={selectedSurface}
                            zoomPercent={zoomPercent}
                            hskLabel={hskLabel}
                            fontSize={settings.fontSize || 'medium'}
                            sideBySide={isSideBySide}
                            onMouseSelection={handleTextMouseSelection}
                            onSentenceClick={handleSentenceClick}
                            onTokenSelection={handleTokenSelection}
                            onUploadClick={() => fileInputRef.current?.click()}
                            onPasteClick={() => setPasteModalOpen(true)}
                        />
                    )}

                    <ReaderSidebar
                        selectedSurface={selectedSurface}
                        quickVi={quickVi}
                        quickEn={quickEn}
                        quickPinyin={quickPinyin}
                        sourceSentence={sourceSentence}
                        sentenceTranslation={selectedSentenceTranslation}
                        literalTranslation={selectedLiteralTranslation}
                        paragraphContext={selectedParagraphContext}
                        contextTranslation={contextTranslation}
                        contextTranslationLoading={contextTranslationLoading}
                        contextTranslateScope={contextTranslateScope}
                        analysis={activeAnalysis}
                        aiContext={aiContext}
                        loadingAnalysis={loadingAnalysis}
                        generatingAI={isGeneratingAIContext}
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        savedWords={savedWords}
                        historyList={historyList}
                        onSave={() => void handleSave()}
                        onSaveToken={(token) => void handleSave(token)}
                        onGenerateAiNote={() => void handleGenerateAiNote()}
                        onTranslateScope={(scope) => void handleTranslateScope(scope)}
                        onSelectHistory={(text) => {
                            const selection: TextSelection = {
                                selectedText: text,
                                sourceSentence: findSentenceForSelection(currentDocument?.content || text, text),
                                paragraphContext: currentDocument ? findParagraphForSelection(currentDocument.content, text) : text,
                                pageContext: currentDocument?.content || text,
                            }
                            setTextSelection(selection)
                            setPdfSelection(null)
                            void analyzeSelection(selection)
                        }}
                        quizQuestions={quizQuestions}
                        quizLoading={quizLoading}
                        quizScore={quizScore}
                        quizFinished={quizFinished}
                        currentQuestionIndex={currentQuestionIndex}
                        selectedAnswerIndex={selectedAnswerIndex}
                        onGenerateQuiz={handleGenerateQuiz}
                        onQuizAnswer={handleQuizAnswer}
                    />
                </div>
            ) : (
                <SavedHub
                    viewType={currentView}
                    savedWords={savedWords}
                    annotations={annotations}
                    flashCards={flashCards}
                    onRemoveWord={removeSavedWord}
                    onRemoveAnnotation={removeAnnotation}
                    onSubmitReview={(id, rating) => void submitReview(id, rating)}
                />
            )}

            {currentView === 'documents' && (
                <FloatingChatWidget
                    open={chatOpen}
                    onOpenChange={setChatOpen}
                    selectedSurface={selectedSurface}
                    chatMessages={chatMessages}
                    chatLoading={chatLoading}
                    chatInput={chatInput}
                    onChatInputChange={setChatInput}
                    onChatSubmit={handleChatSubmit}
                />
            )}

            <PasteDocumentModal
                isOpen={pasteModalOpen}
                onClose={() => setPasteModalOpen(false)}
                onSubmit={handleCreatePastedDocument}
            />
        </div>
    )
}
