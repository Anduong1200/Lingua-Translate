import { expect, test } from '@playwright/test'
import { uploadSamplePdf } from './test-utils'

test.describe('Layout Feature', () => {
    test.beforeEach(async ({ page }) => {
        await page.route('https://fonts.googleapis.com/**', (route) => route.abort())
        await page.route('https://fonts.gstatic.com/**', (route) => route.abort())
        await page.request.post('http://127.0.0.1:3001/api/debug/reset-demo').catch(() => null)
    })

    test('should render reader layout correctly without visual regressions', async ({ page }) => {
        test.setTimeout(90_000)
        await uploadSamplePdf(page)

        // Check sidebar existence
        await expect(page.locator('aside').first()).toBeVisible()

        // Check PDF viewer existence
        await expect(page.locator('[data-page-number="1"]').first()).toBeVisible()

        // Verify experimental badges are present where required
        await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
        
        await page.getByRole('tab', { name: /Từ vựng/i }).click()
        await expect(page.getByText('Experimental').first()).toBeVisible()
    })
})