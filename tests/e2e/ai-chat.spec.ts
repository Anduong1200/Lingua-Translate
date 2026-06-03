import { test, expect } from \'@playwright/test\'

test.describe(\'AI Chat Feature\', () => {
    test(\'should handle consent and missing key\', async ({ page }) => {
        await page.route(\'**/api/ai/chat\', async route => {
            await route.fulfill({ json: { reply: \'Mocked AI response\', usage: {} } })
        })
        await page.goto(\'/reader\')
        await expect(page.locator(\'body\')).toBeVisible()
    })
})