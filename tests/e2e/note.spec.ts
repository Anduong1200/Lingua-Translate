import { expect, test } from '@playwright/test'
import { uploadSamplePdf, selectTextInPdfPage } from './test-utils'

test.describe('Note Feature', () => {
    test.beforeEach(async ({ page }) => {
        await page.route('https://fonts.googleapis.com/**', (route) => route.abort())
        await page.route('https://fonts.gstatic.com/**', (route) => route.abort())
        await page.request.post('http://127.0.0.1:3001/api/debug/reset-demo').catch(() => null)
    })

    test('should save, edit, reload and delete note', async ({ page }) => {
        test.setTimeout(90_000)
        const pdfPage = await uploadSamplePdf(page)

        // Select text and analyze
        await selectTextInPdfPage(pdfPage, '市场需求')
        await page.getByRole('button', { name: /Analyze/i }).click()

        // Write a note and save
        await page.locator('textarea[placeholder*="Thêm ghi chú"]').fill('This is a test note')
        await page.getByRole('button', { name: /Highlight/i }).click()
        
        // Check that note is saved and visible in sidebar
        await expect(page.getByText('This is a test note').first()).toBeVisible()

        // Edit the note
        await page.getByRole('button', { name: /Chỉnh sửa/i }).first().click()
        await page.locator('textarea').last().fill('This is an updated test note')
        await page.getByRole('button', { name: /Lưu/i }).first().click()
        await expect(page.getByText('This is an updated test note').first()).toBeVisible()

        // Reload the page and ensure the note persists
        await page.reload()
        await expect(page.locator('[data-page-number="1"] .bg-amber-200\\/35').first()).toBeVisible()
        // Re-open sidebar by clicking highlight
        await page.locator('[data-page-number="1"] .bg-amber-200\\/35').first().click()
        await expect(page.getByText('This is an updated test note').first()).toBeVisible()

        // Delete the note
        await page.getByRole('button', { name: /Xóa/i }).first().click()
        // Wait for it to disappear from sidebar
        await expect(page.getByText('This is an updated test note')).not.toBeVisible()
        // Highlight layer on PDF should be removed
        await expect(page.locator('[data-page-number="1"] .bg-amber-200\\/35').first()).not.toBeVisible()
    })
})