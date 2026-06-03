import { type FormEvent } from 'react'
import { Loader2, MessageSquare, Send, X } from 'lucide-react'
import { type ChatMessage } from '../readerUtils'

import { useState, useEffect } from 'react'
import { API_BASE_URL } from '@/store/slices/types'
import { Link } from 'react-router-dom'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

function AiChecklist() {
    const [status, setStatus] = useState<{ enabled: boolean, mode: string, message: string } | null>(null)
    const [consent, setConsent] = useState<{ allow_send_selected_text: boolean, allow_send_page_context: boolean, allow_send_notes: boolean } | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        Promise.all([
            fetch(`${API_BASE_URL}/ai/status`).then(res => res.json()),
            fetch(`${API_BASE_URL}/ai/consent`).then(res => res.json())
        ]).then(([statusData, consentData]) => {
            setStatus(statusData as { enabled: boolean, mode: string, message: string })
            setConsent(consentData.consent as { allow_send_selected_text: boolean, allow_send_page_context: boolean, allow_send_notes: boolean })
        }).catch(() => {
            // ignore
        }).finally(() => {
            setLoading(false)
        })
    }, [])

    if (loading) return <div className="p-4 text-center text-xs text-slate-500">Đang kiểm tra AI...</div>

    const isKeyReady = status?.enabled
    const isConsentReady = consent?.allow_send_selected_text || consent?.allow_send_page_context

    if (isKeyReady && isConsentReady) {
        return (
            <div className="rounded-2xl border border-slate-100 bg-white p-5 text-center">
                <MessageSquare className="mx-auto h-6 w-6 text-teal-600" />
                <p className="mt-2 text-xs font-semibold text-slate-500">Hỏi thêm về văn bản, sắc thái nghĩa hoặc cách dùng từ đang chọn.</p>
            </div>
        )
    }

    return (
        <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4">
            <div className="mb-3 flex items-center gap-2 text-amber-700">
                <AlertCircle className="h-5 w-5" />
                <h4 className="font-bold text-sm">AI chưa sẵn sàng</h4>
            </div>
            <div className="space-y-2 text-xs text-slate-600">
                <div className="flex items-start gap-2">
                    {isKeyReady ? <CheckCircle2 className="h-4 w-4 text-teal-500 shrink-0 mt-0.5" /> : <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />}
                    <span>{isKeyReady ? 'Đã cấu hình API Key' : 'Chưa cấu hình API Key (hoặc dùng key hệ thống)'}</span>
                </div>
                <div className="flex items-start gap-2">
                    {isConsentReady ? <CheckCircle2 className="h-4 w-4 text-teal-500 shrink-0 mt-0.5" /> : <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />}
                    <span>{isConsentReady ? 'Đã cấp quyền chia sẻ nội dung' : 'Cần cấp quyền chia sẻ văn bản để AI phân tích'}</span>
                </div>
            </div>
            <div className="mt-4">
                <Link to="/settings" className="inline-block rounded-lg bg-white px-4 py-2 text-xs font-bold text-amber-700 shadow-sm border border-amber-200 hover:bg-amber-100 transition">Mở Cài đặt AI</Link>
            </div>
        </div>
    )
}

export function ChatPanel({
    chatMessages,
    chatLoading,
    chatInput,
    onChatInputChange,
    onChatSubmit,
}: {
    chatMessages: ChatMessage[]
    chatLoading: boolean
    chatInput: string
    onChatInputChange: (value: string) => void
    onChatSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
    return (
        <div className="flex h-full min-h-[320px] flex-col">
            <div className="mb-4 flex-1 space-y-3 overflow-y-auto pr-1">
                {chatMessages.length === 0 && <AiChecklist />}
                {chatMessages.map((message) => {
                    const isUser = message.role === 'user'
                    return (
                        <div key={message.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                            <div className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed shadow-sm ${isUser ? 'rounded-tr-none bg-teal-600 text-white' : 'rounded-tl-none border border-slate-100 bg-white text-slate-700'}`}>
                                <p className="whitespace-pre-wrap">{message.content}</p>
                            </div>
                            <span className="mt-1 px-1 text-[9px] text-slate-400">{message.timestamp}</span>
                        </div>
                    )
                })}
                {chatLoading && (
                    <div className="flex items-center gap-2 p-1 text-xs text-slate-400">
                        <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
                        <span>Hanora AI đang soạn câu trả lời...</span>
                    </div>
                )}
            </div>
            <form onSubmit={onChatSubmit} className="relative flex items-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <input
                    value={chatInput}
                    onChange={(event) => onChatInputChange(event.target.value)}
                    placeholder="Hỏi về văn bản này..."
                    className="w-full bg-transparent py-3 pl-4 pr-12 text-sm outline-none"
                />
                <button
                    type="submit"
                    disabled={chatLoading || !chatInput.trim()}
                    className="absolute right-2 rounded-xl bg-teal-600 p-2 text-white transition hover:bg-teal-700 disabled:opacity-50"
                >
                    <Send className="h-4 w-4" />
                </button>
            </form>
        </div>
    )
}

export function FloatingChatWidget({
    open,
    onOpenChange,
    selectedSurface,
    chatMessages,
    chatLoading,
    chatInput,
    onChatInputChange,
    onChatSubmit,
}: {
    open: boolean
    onOpenChange: (value: boolean) => void
    selectedSurface: string
    chatMessages: ChatMessage[]
    chatLoading: boolean
    chatInput: string
    onChatInputChange: (value: string) => void
    onChatSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
    if (!open) {
        return (
            <button
                onClick={() => onOpenChange(true)}
                className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-teal-200/70 bg-white text-teal-700 shadow-2xl shadow-teal-500/20 transition hover:scale-105 hover:bg-teal-50"
                title="Mở chat AI"
            >
                <MessageSquare className="h-6 w-6" />
                {chatLoading && <span className="absolute right-0 top-0 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-white" />}
            </button>
        )
    }

    return (
        <div className="fixed bottom-6 right-6 z-50 flex h-[min(620px,calc(100vh-120px))] w-[min(440px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border border-teal-100 bg-white shadow-2xl shadow-slate-900/20">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-teal-100 bg-teal-50/80 px-4 py-3">
                <div className="min-w-0">
                    <h3 className="text-sm font-black text-slate-900">Hanora AI Chat</h3>
                    <p className="truncate text-[10px] font-semibold text-teal-700">
                        {selectedSurface ? `Đang hỏi theo: ${selectedSurface}` : 'Hỏi theo tài liệu hiện tại'}
                    </p>
                </div>
                <button
                    onClick={() => onOpenChange(false)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm transition hover:text-slate-800"
                    title="Đóng chat"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
            <div className="min-h-0 flex-1 p-4">
                <ChatPanel
                    chatMessages={chatMessages}
                    chatLoading={chatLoading}
                    chatInput={chatInput}
                    onChatInputChange={onChatInputChange}
                    onChatSubmit={onChatSubmit}
                />
            </div>
        </div>
    )
}

