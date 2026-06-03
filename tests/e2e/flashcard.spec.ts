import { expect, test } from '@playwright/test'
import { uploadSamplePdf, selectTextInPdfPage } from './test-utils'

test.describe('Flashcard Feature', () => {
    test.beforeEach(async ({ page }) => {
        await page.route('https://fonts.googleapis.com/**', (route) => route.abort())
        await page.route('https://fonts.gstatic.com/**', (route) => route.abort())
        await page.request.post('http://127.0.0.1:3001/api/debug/reset-demo').catch(() => null)
    })

    test('should progress flashcard due_at after rating', async ({ page }) => {
        test.setTimeout(90_000)
        const pdfPage = await uploadSamplePdf(page)

        // Select text and analyze
        await selectTextInPdfPage(pdfPage, '市场需求')
        await page.getByRole('button', { name: /Analyze/i }).click()

        // Highlight/Add review
        await page.getByRole('button', { name: /Highlight/i }).click()
        await expect(page.getByText(/Đã lưu/i)).toBeVisible()

        // Open flashcards tab
        await page.goto('/flashcards', { waitUntil: 'domcontentloaded' })
        await expect(page.getByText('市场需求').first()).toBeVisible()

        // Before rating, we should check it's in the queue
        await expect(page.getByText(/Còn .* thẻ/i)).toBeVisible()
        
        // Rate it as Easy
        await page.getByRole('button', { name: /Dễ|Easy/i }).first().click()

        // It should be removed from the immediate queue
        await expect(page.getByText('Tuyệt vời! Đã hoàn thành ôn tập hôm nay')).toBeVisible()
        
        // We can reload to ensure persistence
        await page.reload()
        await expect(page.getByText('Tuyệt vời! Đã hoàn thành ôn tập hôm nay')).toBeVisible()
    })
})
