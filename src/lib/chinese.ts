import type {
    ChineseAnalysis,
    ChineseDefinition,
    ChineseGrammarPattern,
    ChineseSentenceAnalysis,
    ChineseToken,
    DocumentContent,
} from '@/types'

type DictionarySeed = {
    simplified: string
    pinyin: string
    vi: string
    en: string
    pos?: string
    hskLevel?: number
    domainTags?: string[]
    examples?: string[]
}

export const DEMO_CHINESE_TEXT = `我非常喜欢学习中文。中文虽然很难，但是很有意思。每天早上我都听中文广播，晚上我会写汉字。
最近我在准备HSK考试，希望能取得好成绩。由于市场需求下降，该公司调整了生产计划。`

export const DEMO_DOCUMENT: DocumentContent = {
    id: 'demo-hsk-reader',
    title: 'HSK 3 + kinh tế ngắn.txt',
    type: 'txt',
    content: DEMO_CHINESE_TEXT,
    sentences: [],
    uploadedAt: new Date('2026-05-24T00:00:00'),
    readingProgress: 0,
    highlights: [],
    notes: [],
}

export const CHINESE_DICTIONARY: DictionarySeed[] = [
    { simplified: '我', pinyin: 'wǒ', vi: 'tôi', en: 'I; me', pos: 'pronoun', hskLevel: 1, examples: ['我是学生。 (Tôi là học sinh.)'] },
    { simplified: '非常', pinyin: 'fēi cháng', vi: 'rất, vô cùng', en: 'very; extremely', pos: 'adverb', hskLevel: 2, examples: ['我非常高兴。 (Tôi rất vui.)'] },
    { simplified: '喜欢', pinyin: 'xǐ huan', vi: 'thích, yêu thích', en: 'to like', pos: 'verb', hskLevel: 1, examples: ['我喜欢看电影。 (Tôi thích xem phim.)'] },
    { simplified: '学习', pinyin: 'xué xí', vi: 'học tập', en: 'to study; to learn', pos: 'verb', hskLevel: 1, examples: ['他在学习中文。 (Anh ấy đang học tiếng Trung.)'] },
    { simplified: '中文', pinyin: 'zhōng wén', vi: 'tiếng Trung', en: 'Chinese language', pos: 'noun', hskLevel: 1, examples: ['我学习中文。 (Tôi học tiếng Trung.)'] },
    { simplified: '虽然', pinyin: 'suī rán', vi: 'mặc dù', en: 'although', pos: 'conjunction', hskLevel: 4, examples: ['虽然下雨，但是我还是去了。 (Dù trời mưa nhưng tôi vẫn đi.)'] },
    { simplified: '但是', pinyin: 'dàn shì', vi: 'nhưng', en: 'but; however', pos: 'conjunction', hskLevel: 2 },
    { simplified: '很', pinyin: 'hěn', vi: 'rất', en: 'very', pos: 'adverb', hskLevel: 1 },
    { simplified: '难', pinyin: 'nán', vi: 'khó', en: 'difficult', pos: 'adjective', hskLevel: 2 },
    { simplified: '有意思', pinyin: 'yǒu yì si', vi: 'thú vị', en: 'interesting', pos: 'adjective', hskLevel: 3 },
    { simplified: '每天', pinyin: 'měi tiān', vi: 'mỗi ngày', en: 'every day', pos: 'time', hskLevel: 2 },
    { simplified: '早上', pinyin: 'zǎo shang', vi: 'buổi sáng', en: 'morning', pos: 'time', hskLevel: 1 },
    { simplified: '都', pinyin: 'dōu', vi: 'đều', en: 'all; both', pos: 'adverb', hskLevel: 1 },
    { simplified: '听', pinyin: 'tīng', vi: 'nghe', en: 'to listen', pos: 'verb', hskLevel: 1 },
    { simplified: '广播', pinyin: 'guǎng bō', vi: 'phát thanh, đài', en: 'broadcast', pos: 'noun', hskLevel: 5, domainTags: ['media'] },
    { simplified: '晚上', pinyin: 'wǎn shang', vi: 'buổi tối', en: 'evening', pos: 'time', hskLevel: 1 },
    { simplified: '会', pinyin: 'huì', vi: 'biết, sẽ, có thể', en: 'can; will', pos: 'modal', hskLevel: 1 },
    { simplified: '写', pinyin: 'xiě', vi: 'viết', en: 'to write', pos: 'verb', hskLevel: 1 },
    { simplified: '汉字', pinyin: 'hàn zì', vi: 'chữ Hán', en: 'Chinese character', pos: 'noun', hskLevel: 3 },
    { simplified: '最近', pinyin: 'zuì jìn', vi: 'gần đây', en: 'recently', pos: 'time', hskLevel: 3 },
    { simplified: '在', pinyin: 'zài', vi: 'đang, ở', en: 'at; in; progressive marker', pos: 'preposition', hskLevel: 1 },
    { simplified: '准备', pinyin: 'zhǔn bèi', vi: 'chuẩn bị', en: 'to prepare', pos: 'verb', hskLevel: 3 },
    { simplified: '考试', pinyin: 'kǎo shì', vi: 'kỳ thi, thi', en: 'exam; to test', pos: 'noun', hskLevel: 2 },
    { simplified: '希望', pinyin: 'xī wàng', vi: 'hi vọng', en: 'to hope', pos: 'verb', hskLevel: 3 },
    { simplified: '能', pinyin: 'néng', vi: 'có thể', en: 'can; be able to', pos: 'modal', hskLevel: 1 },
    { simplified: '取得', pinyin: 'qǔ dé', vi: 'đạt được', en: 'to obtain; to achieve', pos: 'verb', hskLevel: 5 },
    { simplified: '好', pinyin: 'hǎo', vi: 'tốt', en: 'good', pos: 'adjective', hskLevel: 1 },
    { simplified: '成绩', pinyin: 'chéng jì', vi: 'thành tích, kết quả học tập', en: 'achievement; grades', pos: 'noun', hskLevel: 4 },
    { simplified: '由于', pinyin: 'yóu yú', vi: 'do, bởi vì', en: 'due to; owing to', pos: 'preposition', hskLevel: 5, domainTags: ['academic', 'business'] },
    { simplified: '市场', pinyin: 'shì chǎng', vi: 'thị trường', en: 'market', pos: 'noun', hskLevel: 4, domainTags: ['economics'] },
    { simplified: '需求', pinyin: 'xū qiú', vi: 'nhu cầu', en: 'demand; requirement', pos: 'noun', hskLevel: 6, domainTags: ['economics', 'business'] },
    { simplified: '下降', pinyin: 'xià jiàng', vi: 'giảm, đi xuống', en: 'to decline; to drop', pos: 'verb', hskLevel: 5, domainTags: ['economics'] },
    { simplified: '公司', pinyin: 'gōng sī', vi: 'công ty', en: 'company', pos: 'noun', hskLevel: 2, domainTags: ['business'] },
    { simplified: '调整', pinyin: 'tiáo zhěng', vi: 'điều chỉnh', en: 'to adjust', pos: 'verb', hskLevel: 5, domainTags: ['business'] },
    { simplified: '生产', pinyin: 'shēng chǎn', vi: 'sản xuất', en: 'production; to produce', pos: 'verb', hskLevel: 4, domainTags: ['business'] },
    { simplified: '计划', pinyin: 'jì huà', vi: 'kế hoạch', en: 'plan', pos: 'noun', hskLevel: 3, domainTags: ['business'] },
    { simplified: '市场需求', pinyin: 'shì chǎng xū qiú', vi: 'nhu cầu thị trường', en: 'market demand', pos: 'noun phrase', hskLevel: 6, domainTags: ['economics'] },
    { simplified: '计算机', pinyin: 'jì suàn jī', vi: 'máy tính', en: 'computer', pos: 'noun', hskLevel: 5, domainTags: ['computer_science'] },
    { simplified: '系统', pinyin: 'xì tǒng', vi: 'hệ thống', en: 'system', pos: 'noun', hskLevel: 5, domainTags: ['computer_science'] },
    { simplified: '需要', pinyin: 'xū yào', vi: 'cần, cần phải', en: 'to need', pos: 'verb', hskLevel: 2 },
    { simplified: '处理', pinyin: 'chǔ lǐ', vi: 'xử lý; giải quyết', en: 'to handle; to process; to deal with', pos: 'verb', hskLevel: 5, domainTags: ['general', 'computer_science'] },
    { simplified: '大量', pinyin: 'dà liàng', vi: 'lượng lớn, rất nhiều', en: 'large amount; massive', pos: 'adjective', hskLevel: 5 },
    { simplified: '数据', pinyin: 'shù jù', vi: 'dữ liệu', en: 'data', pos: 'noun', hskLevel: 5, domainTags: ['computer_science'] },
]

const punctuation = new Set(['。', '，', '、', '！', '？', '；', '：', '.', ',', '!', '?', ';', ':', '\n'])
const dictionaryByWord = new Map(CHINESE_DICTIONARY.map((entry) => [entry.simplified, entry]))
const maxDictionaryLength = Math.max(...CHINESE_DICTIONARY.map((entry) => entry.simplified.length))

function fallbackDefinition(surface: string): ChineseDefinition[] {
    return [
        {
            lang: 'vi',
            value: `Cần bổ sung nghĩa tiếng Việt cho "${surface}"`,
            source: 'local_fallback',
            confidence: 0.35,
        },
        {
            lang: 'en',
            value: 'No local dictionary match yet',
            source: 'local_fallback',
            confidence: 0.25,
        },
    ]
}

function toToken(surface: string): ChineseToken {
    const entry = dictionaryByWord.get(surface)
    if (!entry) {
        return {
            surface,
            pinyin: /[\u4e00-\u9fff]/.test(surface) ? 'pīn yīn' : '',
            pos: punctuation.has(surface) ? 'punctuation' : null,
            hsk_level: null,
            definitions: punctuation.has(surface) ? [] : fallbackDefinition(surface),
            domain_tags: [],
        }
    }

    return {
        surface: entry.simplified,
        pinyin: entry.pinyin,
        pos: entry.pos ?? null,
        hsk_level: entry.hskLevel ?? null,
        definitions: [
            { lang: 'vi', value: entry.vi, source: 'hanora_seed_vi', confidence: 0.86 },
            { lang: 'en', value: entry.en, source: 'seed_en', confidence: 0.76 },
        ],
        domain_tags: entry.domainTags ?? [],
        examples: entry.examples ?? [],
    }
}

export function splitSentences(text: string): string[] {
    return text
        .replace(/\r/g, '')
        .split(/(?<=[。！？!?])\s*|\n+/)
        .map((sentence) => sentence.trim())
        .filter(Boolean)
}

export function segmentChineseText(text: string): ChineseToken[] {
    const tokens: ChineseToken[] = []
    let index = 0

    while (index < text.length) {
        const char = text[index]

        if (/\s/.test(char)) {
            index += 1
            continue
        }

        if (punctuation.has(char)) {
            tokens.push(toToken(char))
            index += 1
            continue
        }

        if (/[A-Za-z0-9]/.test(char)) {
            let end = index + 1
            while (end < text.length && /[A-Za-z0-9]/.test(text[end])) end += 1
            tokens.push({
                surface: text.slice(index, end),
                pinyin: '',
                pos: 'latin',
                hsk_level: null,
                definitions: [],
                domain_tags: [],
            })
            index = end
            continue
        }

        let matched = ''
        for (let length = Math.min(maxDictionaryLength, text.length - index); length > 0; length -= 1) {
            const candidate = text.slice(index, index + length)
            if (dictionaryByWord.has(candidate)) {
                matched = candidate
                break
            }
        }

        if (matched) {
            tokens.push(toToken(matched))
            index += matched.length
        } else {
            tokens.push(toToken(char))
            index += 1
        }
    }

    return tokens
}

function grammarPatterns(sentence: string): ChineseGrammarPattern[] {
    const patterns: ChineseGrammarPattern[] = []

    if (sentence.includes('虽然') && sentence.includes('但是')) {
        patterns.push({
            pattern: '虽然...但是...',
            meaning_vi: 'mặc dù... nhưng..., dùng để nêu quan hệ nhượng bộ rồi chuyển ý',
            confidence: 0.9,
        })
    }

    if (sentence.includes('由于')) {
        patterns.push({
            pattern: '由于...',
            meaning_vi: 'do/vì, thường dùng trong văn viết, báo cáo hoặc giải thích nguyên nhân',
            confidence: 0.84,
        })
    }

    if (sentence.includes('在') && /准备|学习|听|写/.test(sentence)) {
        patterns.push({
            pattern: '在 + Verb',
            meaning_vi: 'đang làm gì đó, đánh dấu hành động đang diễn ra',
            confidence: 0.68,
        })
    }

    return patterns
}

export function analyzeChineseText(text: string): ChineseAnalysis {
    const sentences: ChineseSentenceAnalysis[] = splitSentences(text).map((sentence) => ({
        text: sentence,
        tokens: segmentChineseText(sentence),
        grammar_patterns: grammarPatterns(sentence),
    }))

    return {
        text,
        sentences,
    }
}

export function getVietnameseDefinition(token?: ChineseToken | null): string {
    return token?.definitions.find((definition) => definition.lang === 'vi')?.value ?? ''
}

export function estimateHskLabel(tokens: ChineseToken[]): string {
    const levels = tokens
        .map((token) => token.hsk_level)
        .filter((level): level is number => typeof level === 'number')

    if (levels.length === 0) return 'Ngoài HSK'
    const max = Math.max(...levels)
    if (max <= 3) return 'HSK 1-3'
    if (max <= 6) return 'HSK 4-6'
    return 'HSK 7-9'
}
