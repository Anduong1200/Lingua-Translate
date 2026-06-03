import { useState, type FormEvent } from 'react'
import type { ChatMessage } from '../readerUtils'
import { messageTime, formatAiChatReply, findSentenceForSelection } from '../readerUtils'

export function useReaderChat() {
    const [chatOpen, setChatOpen] = useState(false)
    const [chatInput, setChatInput] = useState('')
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
    const [chatLoading, setChatLoading] = useState(false)

    const handleChatSubmit = async (
        event: FormEvent<HTMLFormElement>,
        contextInfo: {
            documentContext: string;
            selectedSurface: string;
            sourceSentence: string;
            pageContext: string;
            domainMode: string;
            userLevel: string;
            generateAIContextReading: (payload: any) => Promise<any>;
        }
    ) => {
        event.preventDefault()
        const question = chatInput.trim()
        if (!question || chatLoading) return
        const userMessage: ChatMessage = { id: `user-${Date.now()}`, role: 'user', content: question, timestamp: messageTime() }
        setChatMessages((messages) => [...messages, userMessage])
        setChatInput('')
        setChatLoading(true)

        try {
            const { documentContext, selectedSurface, sourceSentence, pageContext, domainMode, userLevel, generateAIContextReading } = contextInfo
            const result = await generateAIContextReading({
                selected_text: selectedSurface || question,
                source_sentence: sourceSentence || findSentenceForSelection(documentContext, selectedSurface || question),
                paragraph_context: `${documentContext}\n\nCâu hỏi người dùng: ${question}`,
                page_context: `${pageContext}\n\nCâu hỏi người dùng: ${question}`,
                domain_mode: domainMode,
                user_level: userLevel,
            })
            setChatMessages((messages) => [
                ...messages,
                { id: `assistant-${Date.now()}`, role: 'assistant', content: formatAiChatReply(result), timestamp: messageTime() },
            ])
        } catch {
            setChatMessages((messages) => [
                ...messages,
                { id: `assistant-${Date.now()}`, role: 'assistant', content: 'Không gọi được AI context endpoint. Hãy kiểm tra backend và cấu hình API key.', timestamp: messageTime() },
            ])
        } finally {
            setChatLoading(false)
        }
    }

    return {
        chatOpen, setChatOpen,
        chatInput, setChatInput,
        chatMessages, setChatMessages,
        chatLoading, setChatLoading,
        handleChatSubmit
    }
}
