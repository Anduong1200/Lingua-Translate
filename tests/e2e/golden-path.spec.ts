import { expect, test } from '@playwright/test'

test('upload selectable text, open reader, analyze and show context panel', async ({ page }) => {
    await page.request.post('http://127.0.0.1:3001/api/debug/reset-demo')

    await page.goto('/dashboard')
    await page.getByText('Tải Tài Liệu Mới', { exact: false }).first().waitFor()

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
        name: 'market-demand.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('由于市场需求下降，该公司调整了生产计划。', 'utf-8'),
    })

    // Upload automatically navigates to /reader on success in our DashboardPage
    await page.waitForURL('**/reader')
    
    await expect(page.getByText('Hanora NLP').first()).toBeVisible()
    await expect(page.getByText('由于市场需求下降')).toBeVisible()

    await page.getByText('市场需求', { exact: false }).first().click()
    await expect(page.getByText('nhu cầu thị trường', { exact: false })).toBeVisible()
})
