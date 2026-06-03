import { test, expect } from \'@playwright/test\'

test.describe(\'Layout Feature\', () => {
    test(\'should render responsive layout without errors\', async ({ page }) => {
        await page.goto(\'/\')
        await expect(page.locator(\'body\')).toBeVisible()
    })
})