import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Bug, Download, Send } from 'lucide-react'

interface BugReportModalProps {
    isOpen: boolean
    onClose: () => void
}

export default function BugReportModal({ isOpen, onClose }: BugReportModalProps) {
    const [issueText, setIssueText] = useState('')
    const [includeDiagnostics, setIncludeDiagnostics] = useState(true)

    if (!isOpen) return null

    const handleExportDiagnostics = () => {
        const diagnosticData = {
            appVersion: '1.0.0-beta',
            os: navigator.userAgent,
            timestamp: new Date().toISOString(),
            logs: JSON.parse(localStorage.getItem('hanora_error_logs') || '[]')
        }
        const blob = new Blob([JSON.stringify(diagnosticData, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = `hanora_diagnostics_${new Date().toISOString().replace(/[:.]/g, '-')}.json`
        anchor.click()
        URL.revokeObjectURL(url)
    }

    const handleCopyReport = () => {
        const report = `[Bug Report]\n\nIssue:\n${issueText}\n\nOS: ${navigator.userAgent}\nApp Version: 1.0.0-beta`
        navigator.clipboard.writeText(report)
        alert('Đã copy báo cáo. Vui lòng dán vào Github Issues hoặc gửi email cho đội ngũ phát triển.')
        onClose()
    }

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                />
                
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 p-6 z-10"
                >
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                            <Bug className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Báo lỗi hệ thống</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Góp ý hoặc báo lỗi để giúp Hanora tốt hơn.</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Mô tả lỗi gặp phải</label>
                            <textarea
                                value={issueText}
                                onChange={(e) => setIssueText(e.target.value)}
                                placeholder="Ví dụ: Khi tôi bôi đen câu ABC thì bảng tra từ không hiện..."
                                className="w-full h-32 p-3 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-[#006b5f] resize-none"
                            />
                        </div>

                        <div className="flex flex-col gap-2 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={includeDiagnostics}
                                    onChange={(e) => setIncludeDiagnostics(e.target.checked)}
                                    className="w-4 h-4 text-[#006b5f] rounded border-slate-300"
                                />
                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Đính kèm Diagnostics Data</span>
                            </label>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-7">
                                Dữ liệu bao gồm thông tin OS, Browser, App Version và Error Logs (không chứa nội dung file PDF cá nhân của bạn).
                            </p>
                            
                            {includeDiagnostics && (
                                <button
                                    onClick={handleExportDiagnostics}
                                    className="ml-7 mt-2 inline-flex w-fit items-center gap-1.5 text-[11px] font-bold text-[#006b5f] dark:text-teal-400 hover:underline"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    Tải file Diagnostic (.json)
                                </button>
                            )}
                        </div>

                        <button
                            onClick={handleCopyReport}
                            disabled={!issueText.trim()}
                            className="w-full py-3 bg-[#006b5f] hover:bg-[#005048] disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:cursor-not-allowed text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
                        >
                            <Send className="w-4 h-4" />
                            Copy báo cáo
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    )
}
