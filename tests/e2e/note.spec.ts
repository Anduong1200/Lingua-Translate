import { expect, test } from '@playwright/test'
import { uploadSamplePdf, selectTextInPdfPage } from './test-utils'

test.describe('Note Feature', () => {
    test.beforeEach(async ({ page }) => {
        await page.route('https://fonts.googleapis.com/**', (route) => route.abort())
        await page.route('https://fonts.gstatic.com/**', (route) => route.abort())
        await page.request.post('http://127.0.0.1:3001/api/debug/reset-demo').catch(() => null)
    })

    test('should save, reload and delete reader highlight annotation', async ({ page }) => {
        test.setTimeout(90_000)
        const pdfPage = await uploadSamplePdf(page)

        // Select text and analyze
        await selectTextInPdfPage(pdfPage, '市场需求')
        await page.getByRole('button', { name: /Analyze/i }).click()

        await page.getByRole('button', { name: /Highlight/i }).click()
        await expect(page.getByText(/Đã lưu/i)).toBeVisible()

        await page.reload()
        await expect(page.locator('[data-page-number="1"] .bg-amber-200\\/35').first()).toBeVisible()

        await page.getByRole('button', { name: /Lưu trong reader/i }).click()
        await page.getByRole('button', { name: /Annotation/i }).click()
        await expect(page.getByText('市场需求').first()).toBeVisible()
        await expect(page.getByText('Highlight từ Reader').first()).toBeVisible()

        await page.getByRole('button', { name: /Xóa/i }).first().click()
        await expect(page.getByText('Highlight từ Reader')).not.toBeVisible()
    })
})
