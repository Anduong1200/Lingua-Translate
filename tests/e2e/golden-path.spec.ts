import { expect, test } from '@playwright/test'

function escapePdfText(value: string) {
    return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

function createSelectablePdfBuffer(text: string) {
    const stream = `BT /F1 24 Tf 72 720 Td (${escapePdfText(text)}) Tj ET`
    const objects = [
        '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n',
        '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n',
        '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj\n',
        '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >> endobj\n',
        `5 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj\n`,
    ]
    let body = '%PDF-1.4\n'
    const offsets = [0]
    for (const object of objects) {
        offsets.push(Buffer.byteLength(body, 'binary'))
        body += object
    }
    const xrefOffset = Buffer.byteLength(body, 'binary')
    body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
    for (const offset of offsets.slice(1)) {
        body += `${String(offset).padStart(10, '0')} 00000 n \n`
    }
    body += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`
    return Buffer.from(body, 'binary')
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
    await page.request.post('http://127.0.0.1:3001/api/debug/reset-demo')

    await page.goto('/dashboard')
    await completeOnboardingIfVisible(page)

    await page.goto('/dashboard')
    await page.locator('input[type="file"]').setInputFiles({
        name: 'sample-reader.pdf',
        mimeType: 'application/pdf',
        buffer: createSelectablePdfBuffer('marketdemanddecline'),
    })

    await page.waitForURL('**/reader')
    const pdfPage = page.locator('[data-page-number="1"]').first()
    await expect(pdfPage).toBeVisible()
    await expect(pdfPage.locator('canvas')).toBeVisible()

    const textSpan = pdfPage.locator('span', { hasText: 'marketdemanddecline' }).first()
    await expect(textSpan).toBeVisible()
    await textSpan.evaluate((span) => {
        const range = document.createRange()
        range.selectNodeContents(span)
        const selection = window.getSelection()
        selection?.removeAllRanges()
        selection?.addRange(range)
        const rect = span.getBoundingClientRect()
        span.dispatchEvent(new MouseEvent('mouseup', {
            bubbles: true,
            clientX: rect.left + rect.width / 2,
            clientY: rect.top + rect.height / 2,
        }))
    })

    await page.getByRole('button', { name: /Analyze/i }).click()
    await expect(page.getByText(/marketdemanddecline/i).first()).toBeVisible()

    await page.getByRole('button', { name: /Highlight/i }).click()
    await expect(page.getByText(/Đã lưu annotation/i)).toBeVisible()

    await page.reload()
    await expect(page.locator('[data-page-number="1"] .bg-amber-200\\/35').first()).toBeVisible()

    await page.goto('/flashcards')
    await expect(page.getByText(/marketdemanddecline/i).first()).toBeVisible()
    await page.getByRole('button', { name: /Dễ|Easy/i }).first().click()
})
