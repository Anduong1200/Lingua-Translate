import { expect, test } from '@playwright/test'

const CHINESE_PDF_TEXT = [
    '由于市场需求下降，该公司调整了生产计划。',
    '计算机系统需要处理大量数据。',
].join('\n')

async function createChinesePdfBuffer(page: import('@playwright/test').Page) {
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

async function completeOnboardingIfVisible(page: import('@playwright/test').Page) {
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

test('golden path with real PDF: upload, select text, save highlight, reload, and review', async ({ page }) => {
    test.setTimeout(90_000)
    await page.route('https://fonts.googleapis.com/**', (route) => route.abort())
    await page.route('https://fonts.gstatic.com/**', (route) => route.abort())
    const pdfBuffer = await createChinesePdfBuffer(page)

    await page.request.post('http://127.0.0.1:3001/api/debug/reset-demo')

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
    await expect
        .poll(() => pdfPage.evaluate((element) => element.getAttribute('data-page-text') || element.textContent || ''), {
            timeout: 30_000,
        })
        .toContain('市场需求')

    await selectTextInPdfPage(pdfPage, '市场需求')

    await page.getByRole('button', { name: /Analyze/i }).click()
    await expect(page.getByText('市场需求').first()).toBeVisible()
    await expect(page.getByText(/nhu cầu thị trường/i).first()).toBeVisible()

    await page.getByRole('button', { name: /Highlight/i }).click()
    await expect(page.getByText(/Đã lưu annotation/i)).toBeVisible()

    await selectTextInPdfPage(pdfPage, '生产计划')
    await page.getByRole('button', { name: /Analyze/i }).click()
    await expect(page.getByText('生产计划').first()).toBeVisible()
    await expect(page.getByText(/kế hoạch sản xuất/i).first()).toBeVisible()

    await page.reload()
    await expect(page.locator('[data-page-number="1"] .bg-amber-200\\/35').first()).toBeVisible()

    await page.goto('/flashcards', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('市场需求').first()).toBeVisible()
    await page.getByRole('button', { name: /Dễ|Easy/i }).first().click()
})

async function selectTextInPdfPage(locator: import('@playwright/test').Locator, phrase: string) {
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
