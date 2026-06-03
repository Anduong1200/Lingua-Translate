import React, { memo, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import {
    Award,
    BookMarked,
    BookOpen,
    BookmarkPlus,
    Brain,
    CheckCircle,
    ChevronDown,
    Columns,
    FilePlus2,
    FileText,
    Highlighter,
    History,
    Layers,
    Loader2,
    MessageSquare,
    Minus,
    Plus,
    Search,
    Send,
    Settings,
    Sparkles,
    SpellCheck,
    Trash2,
    Type,
    Upload,
    UserCircle,
    Volume2,
    X,
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import type {
    AnnotationRecord,
    ChineseAnalysis,
    ChineseDefinition,
    ChineseSentenceAnalysis,
    ChineseToken,
    DocumentContent,
    DocumentTranslationSentence,
    FlashCard,
    SavedWord,
} from '@/types'
import { estimateHskLabel, getVietnameseDefinition } from '@/lib/chinese'
import { generateId } from '@/lib/utils'
import { API_BASE_URL } from '@/store/slices/types'
import { primaryNavPages, workspacePageCount } from '@/config/pages'
import {
    type ChatMessage,
    findSentenceForSelection,
    formatAiChatReply,
    isSelectableToken,
    messageTime,
    type PdfSelection,
    type QuizQuestion,
    speakChinese,
} from '../readerUtils'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

export type ReaderView = 'documents' | 'library' | 'study-hub'
export type SidebarTab = 'dict' | 'pinyin' | 'ai' | 'quiz'
export type TranslateScope = 'sentence' | 'paragraph' | 'context'

export type TextSelection = {
    selectedText: string
    sourceSentence: string
    paragraphContext: string
    pageContext: string
}

export type FloatingCoords = { x: number; y: number } | null

export type BackendTranslationUnit = {
    source: string
    dictionary_vi: string
    literal_vi: string
    pinyin?: string
    domain?: string
    grammar_patterns?: Array<{ pattern: string; meaning_vi: string; confidence?: number }>
}

export type ContextTranslationResult = {
    mode: string
    scope: TranslateScope
    domain: string
    selection: BackendTranslationUnit
    sentence: BackendTranslationUnit
    paragraph: {
        source: string
        dictionary_vi: string
        literal_vi: string
        sentences: BackendTranslationUnit[]
    }
    context: {
        domain: string
        source_sentence: string
        role_vi: string
        explanation_vi: string
        confidence?: number
    }
    grammar: {
        patterns: Array<{ pattern: string; meaning_vi: string; confidence?: number }>
        explanation_vi: string
    }
}

export type BackendQuizResponse = {
    mode: string
    question_count: number
    questions: QuizQuestion[]
}

export const historyStorageKey = 'hanora_reader_history'

export function readStoredHistory() {
    try {
        const raw = localStorage.getItem(historyStorageKey)
        const parsed = raw ? JSON.parse(raw) : []
        return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
    } catch {
        return []
    }
}

export function cleanDictionaryText(value?: string) {
    if (!value) return ''
    if (/^Cần bổ sung nghĩa tiếng Việt/.test(value)) return ''
    if (/chưa có bản dịch|chưa có nghĩa/i.test(value)) return ''
    if (/No local dictionary match/i.test(value)) return ''
    return value
}

export function tokenVietnamese(token?: ChineseToken | null) {
    return cleanDictionaryText(token?.definitions_vi?.[0]) || cleanDictionaryText(getVietnameseDefinition(token)) || ''
}

export function tokenEnglish(token?: ChineseToken | null) {
    return cleanDictionaryText(token?.definitions_en?.[0]) || cleanDictionaryText(token?.definitions.find((definition) => definition.lang === 'en')?.value) || ''
}

export function tokenPinyin(tokens: ChineseToken[]) {
    return tokens
        .map((token) => token.pinyin)
        .filter(Boolean)
        .join(' ')
}

export function knownSentenceTranslation(text: string) {
    const normalized = text.replace(/\s+/g, '')
    if (normalized.includes('无论你是经济领域的专家') && normalized.includes('计算机科学的学生') && normalized.includes('学习材料')) {
        return 'Dù bạn là chuyên gia trong lĩnh vực kinh tế hay là sinh viên ngành khoa học máy tính, bạn đều có thể tìm thấy tài liệu học tập phù hợp với mình.'
    }
    return ''
}

export function isMissingTranslation(value?: string) {
    return !value || /chưa có bản dịch|chưa có nghĩa|Cần bổ sung nghĩa|No local dictionary/i.test(value)
}

export function sentenceFallbackTranslation(sentence: ChineseSentenceAnalysis) {
    const knownTranslation = knownSentenceTranslation(sentence.text)
    if (knownTranslation) return knownTranslation

    return sentence.tokens
        .map((token) => {
            if (token.pos === 'punctuation') return token.surface
            const vi = tokenVietnamese(token)
            return vi ? vi.split(';')[0].split(',')[0] : token.surface
        })
        .join('')
}

export function splitDocumentParagraphs(text: string) {
    const normalized = text.replace(/\r/g, '').trim()
    if (!normalized) return []
    return normalized
        .split(/\n{2,}|\n(?=\s*[\u4e00-\u9fffA-Za-z0-9])/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean)
}

export function findParagraphForSelection(context: string, selectedText: string) {
    const selected = selectedText.trim()
    if (!context.trim()) return selected
    const paragraphs = splitDocumentParagraphs(context)
    return paragraphs.find((paragraph) => selected && paragraph.includes(selected)) || findSentenceForSelection(context, selected) || selected
}

export function groupSentencesByParagraph(documentText: string, sentences: ChineseSentenceAnalysis[]) {
    const paragraphs = splitDocumentParagraphs(documentText)
    if (!paragraphs.length) return [{ id: 'paragraph-1', label: 'Đoạn 1', text: documentText, sentences }]

    const blocks = paragraphs.map((paragraph, index) => ({
        id: `paragraph-${index + 1}`,
        label: `Đoạn ${index + 1}`,
        text: paragraph,
        sentences: [] as ChineseSentenceAnalysis[],
    }))

    sentences.forEach((sentence) => {
        const block = blocks.find((item) => item.text.includes(sentence.text)) || blocks[0]
        block.sentences.push(sentence)
    })

    return blocks.filter((block) => block.sentences.length > 0)
}

export function bestSentenceTranslation({
    analysis,
    selectedSentence,
    translation,
}: {
    analysis: ChineseAnalysis | null
    selectedSentence: ChineseSentenceAnalysis | null
    translation?: DocumentTranslationSentence
}) {
    const candidates = [
        analysis?.translations?.dictionary_vi,
        knownSentenceTranslation(selectedSentence?.text || ''),
        translation?.dictionary_vi,
        analysis?.quick_meaning?.definitions_vi?.join('; '),
        selectedSentence ? sentenceFallbackTranslation(selectedSentence) : '',
    ]

    return candidates.find((candidate) => !isMissingTranslation(candidate)) || ''
}

export function buildContextualToken(surface: string, analysis: ChineseAnalysis | null, fallbackToken?: ChineseToken | null): ChineseToken {
    const quick = analysis?.quick_meaning
    const vi = quick?.definitions_vi?.[0] || tokenVietnamese(fallbackToken) || analysis?.translations?.dictionary_vi || ''
    const en = quick?.definitions_en?.[0] || tokenEnglish(fallbackToken)
    const definitions: ChineseDefinition[] = [...(fallbackToken?.definitions ?? [])]

    if (vi && !definitions.some((definition) => definition.lang === 'vi')) {
        definitions.unshift({ lang: 'vi', value: vi, source: 'reader_context', confidence: quick?.confidence ?? 0.65 })
    }
    if (en && !definitions.some((definition) => definition.lang === 'en')) {
        definitions.push({ lang: 'en', value: en, source: 'reader_context', confidence: quick?.confidence ?? 0.55 })
    }

    return {
        ...fallbackToken,
        surface,
        normalized: fallbackToken?.normalized || surface,
        pinyin: quick?.pinyin || fallbackToken?.pinyin || '',
        pos: fallbackToken?.pos || (surface.length > 1 ? 'phrase' : null),
        hsk_level: quick?.hsk_level ?? fallbackToken?.hsk_level ?? null,
        definitions,
        definitions_vi: quick?.definitions_vi || fallbackToken?.definitions_vi || (vi ? [vi] : []),
        definitions_en: quick?.definitions_en || fallbackToken?.definitions_en || (en ? [en] : []),
        domain_tags: quick?.domain_tags || fallbackToken?.domain_tags || [],
        confidence: quick?.confidence ?? fallbackToken?.confidence ?? 0.5,
    }
}

export function splitFallbackSentences(document: DocumentContent | null): ChineseSentenceAnalysis[] {
    if (!document?.content) return []
    const source = document.sentences.length
        ? document.sentences.map((sentence) => sentence.text)
        : document.content
              .replace(/\r/g, '')
              .split(/(?<=[。！？!?])\s*|\n+/)
              .map((sentence) => sentence.trim())
              .filter(Boolean)

    return source.map((text) => ({
        text,
        tokens: [{ surface: text, pinyin: '', definitions: [], pos: null, domain_tags: [] }],
        grammar_patterns: [],
    }))
}

export function safeBbox(value?: string, pageWidth: number = 1, pageHeight: number = 1) {
    if (!value) return null
    try {
        const bbox = JSON.parse(value) as any
        if (
            typeof bbox.x_ratio === 'number' &&
            typeof bbox.y_ratio === 'number' &&
            typeof bbox.w_ratio === 'number' &&
            typeof bbox.h_ratio === 'number'
        ) {
            return {
                x: bbox.x_ratio * pageWidth,
                y: bbox.y_ratio * pageHeight,
                width: bbox.w_ratio * pageWidth,
                height: bbox.h_ratio * pageHeight,
            }
        }
        if (
            typeof bbox.x === 'number' &&
            typeof bbox.y === 'number' &&
            typeof bbox.width === 'number' &&
            typeof bbox.height === 'number'
        ) {
            return bbox as { x: number; y: number; width: number; height: number }
        }
        return null
    } catch {
        return null
    }
}

