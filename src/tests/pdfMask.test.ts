import { describe, expect, it } from 'vitest'
import { splitPdfMaskPages } from '../features/reader/pdfMask'

describe('splitPdfMaskPages', () => {
    it('keeps OCR text aligned by form-feed PDF page separators', () => {
        const pages = splitPdfMaskPages('第一页 市场需求\f第二页 计算机系统\f第三页 学习材料', 3)

        expect(pages).toEqual(['第一页 市场需求', '第二页 计算机系统', '第三页 学习材料'])
    })

    it('falls back to line chunks when legacy OCR text has no page separator', () => {
        const pages = splitPdfMaskPages('一\n二\n三\n四', 2)

        expect(pages).toEqual(['一\n二', '三\n四'])
    })
})
