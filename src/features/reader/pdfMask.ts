export function splitPdfMaskPages(documentText: string, pageCount: number) {
    const normalized = (documentText || '').replace(/\r/g, '').trim()
    if (!normalized || pageCount <= 0) return []

    const formFeedPages = normalized
        .split(/\f+/)
        .map((page) => page.trim())
        .filter(Boolean)
    if (formFeedPages.length > 1) {
        return Array.from({ length: pageCount }, (_, index) => formFeedPages[index] || '')
    }

    if (pageCount === 1) return [normalized]

    const lines = normalized
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean)
    if (!lines.length) return Array.from({ length: pageCount }, () => '')

    const linesPerPage = Math.max(1, Math.ceil(lines.length / pageCount))
    return Array.from({ length: pageCount }, (_, index) => lines.slice(index * linesPerPage, (index + 1) * linesPerPage).join('\n'))
}
