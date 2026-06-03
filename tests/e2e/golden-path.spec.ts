import { expect, test } from '@playwright/test'
import { uploadSamplePdf, selectTextInPdfPage } from './test-utils'

test('golden path with real PDF: upload, select text, save highlight, reload, and review', async ({ page }) => {
    test.setTimeout(90_000)
    await page.route('https://fonts.googleapis.com/**', (route) => route.abort())
    await page.route('https://fonts.gstatic.com/**', (route) => route.abort())
    
    await page.request.post('http://127.0.0.1:3001/api/debug/reset-demo')

    const pdfPage = await uploadSamplePdf(page)

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
    await expect(page.getByText(/Đã lưu/i)).toBeVisible()

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
