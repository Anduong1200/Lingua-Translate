import { useRef, useState, type FormEvent } from 'react'
import { Loader2, Send } from 'lucide-react'
import type { ChatMessage } from '../readerUtils'

type ChatPanelProps = {
    chatMessages: ChatMessage[]
    chatLoading: boolean
    chatInput: string
    onChatInputChange: (value: string) => void
    onChatSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export default function ChatPanel({ chatMessages, chatLoading, chatInput, onChatInputChange, onChatSubmit }: ChatPanelProps) {
    const chatBottomRef = useRef<HTMLDivElement>(null)

    return (
        <div className="h-full flex flex-col justify-between">
            <div className="flex-1 overflow-y-auto gap-y-3 mb-4 pr-2">
                {chatMessages.map((msg, i) => {
                    const isUser = msg.role === 'user';
                    return (
                        <div key={msg.id || i} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                            <div
                                className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed shadow-sm ${
                                    isUser
                                        ? 'bg-[#006b5f] text-white rounded-tr-none'
                                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-tl-none'
                                }`}
                            >
                                <p className="whitespace-pre-wrap">{msg.content}</p>
                            </div>
                            <span className="text-[9px] text-slate-400 mt-1 px-1">{msg.timestamp}</span>
                        </div>
                    );
                })}
                {chatLoading && (
                    <div className="flex items-center gap-x-2 text-slate-400 text-xs p-1">
                        <Loader2 className="w-4 h-4 animate-spin text-[#0d9488]" />
                        <span>Hanora AI đang soạn câu trả lời...</span>
                    </div>
                )}
                <div ref={chatBottomRef} />
            </div>

            {/* Chat Input */}
            <div className="mt-auto">
                <form
                    onSubmit={onChatSubmit}
                    className="relative flex items-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
                >
                    <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => onChatInputChange(e.target.value)}
                        placeholder="Hỏi về văn bản này..."
                        className="w-full py-3 pl-4 pr-12 text-sm outline-none bg-transparent dark:text-slate-200"
                    />
                    <button
                        type="submit"
                        disabled={chatLoading || !chatInput.trim()}
                        className="absolute right-2 p-2 bg-[#006b5f] hover:bg-[#005048] text-white rounded-xl transition-colors disabled:opacity-50"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </form>
            </div>
        </div>
    )
}
