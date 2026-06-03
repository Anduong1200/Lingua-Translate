import { Page, expect, Locator } from '@playwright/test'

export const CHINESE_PDF_TEXT = [
    '由于市场需求下降，该公司调整了生产计划。',
    '计算机系统需要处理大量数据。',
].join('\n')

export async function createChinesePdfBuffer(page: Page) {
    await page.setContent(`
        <!doctype html>
        <html lang="zh-CN">
          <head>
            <meta charset="utf-8" />
            <style>
              body {
                font-family: "Noto Sans CJK SC", "Microsoft YaHei", "PingFang SC", Arial, sans-serif;
                font-size: 24px;
                line-height: 1.8;
                padding: 72px;
              }
              p { margin: 0 0 24px; }
            </style>
          </head>
          <body>
            ${CHINESE_PDF_TEXT.split('\n').map((line) => `<p>${line}</p>`).join('')}
          </body>
        </html>
    `)
    return page.pdf({ format: 'A4', printBackground: true })
}

export async function completeOnboardingIfVisible(page: Page) {
    for (let index = 0; index < 6; index += 1) {
        const openSample = page.getByRole('button', { name: /Mở tài liệu mẫu/i })
        if (await openSample.isVisible().catch(() => false)) break
        const nextButton = page.getByRole('button', { name: /Tiếp tục/i })
        if (!await nextButton.isVisible().catch(() => false)) break
        await nextButton.evaluate((button) => (button as HTMLButtonElement).click()).catch(() => undefined)
        await page.waitForTimeout(350)
    }
    const openSample = page.getByRole('button', { name: /Mở tài liệu mẫu/i })
    if (await openSample.isVisible().catch(() => false)) {
        await openSample.evaluate((button) => (button as HTMLButtonElement).click())
        await page.waitForURL('**/reader')
    }
}

export async function selectTextInPdfPage(locator: Locator, phrase: string) {
    await expect
        .poll(() => locator.evaluate((pageElement) => pageElement.getAttribute('data-page-text') || pageElement.textContent || ''), {
            timeout: 30_000,
        })
        .toContain(phrase)

    const selected = await locator.evaluate((pageElement, phraseToSelect) => {
        const textNodes: Array<{ node: Text; start: number; end: number }> = []
        const walker = document.createTreeWalker(pageElement, NodeFilter.SHOW_TEXT)
        let fullText = ''
        while (walker.nextNode()) {
            const node = walker.currentNode as Text
            const value = node.textContent || ''
            if (!value) continue
            const start = fullText.length
            fullText += value
            textNodes.push({ node, start, end: fullText.length })
        }

        const startIndex = fullText.indexOf(phraseToSelect)
        if (startIndex < 0) {
            return { ok: false, selectedText: '', fullText }
        }
        const endIndex = startIndex + phraseToSelect.length
        const startNode = textNodes.find((item) => item.start <= startIndex && item.end >= startIndex)
        const endNode = textNodes.find((item) => item.start < endIndex && item.end >= endIndex)
        if (!startNode || !endNode) {
            return { ok: false, selectedText: '', fullText }
        }

        const range = document.createRange()
        range.setStart(startNode.node, startIndex - startNode.start)
        range.setEnd(endNode.node, endIndex - endNode.start)
        const selection = window.getSelection()
        selection?.removeAllRanges()
        selection?.addRange(range)

        const rect = range.getBoundingClientRect()
        const target = startNode.node.parentElement || pageElement
        target.dispatchEvent(new MouseEvent('mouseup', {
            bubbles: true,
            clientX: rect.left + rect.width / 2,
            clientY: rect.top + rect.height / 2,
        }))
        return { ok: true, selectedText: selection?.toString() || '', fullText }
    }, phrase)

    expect(selected.ok, `PDF text layer did not contain "${phrase}". Full text: ${selected.fullText}`).toBe(true)
    expect(selected.selectedText).toContain(phrase)
}

export async function uploadSamplePdf(page: Page) {
    const pdfBuffer = await createChinesePdfBuffer(page)
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
    await completeOnboardingIfVisible(page)
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
    await page.locator('input[type="file"]').setInputFiles({
        name: 'sample-chinese-reader.PDF',
        mimeType: 'application/pdf',
        buffer: pdfBuffer,
    })
    await page.waitForURL('**/reader')
    const pdfPage = page.locator('[data-page-number="1"]').first()
    await expect(pdfPage).toBeVisible({ timeout: 30_000 })
    await expect(pdfPage.locator('canvas')).toBeVisible({ timeout: 30_000 })
    return pdfPage
}
