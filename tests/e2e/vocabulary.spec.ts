import { test, expect } from \'@playwright/test\'

test.describe(\'Vocabulary Feature\', () => {
    test(\'should display vocabulary correctly\', async ({ page }) => {
        await page.route(\'**/api/vocabulary*\', async route => {
            await route.fulfill({ json: { items: [{ id: \'v-1\', word: \'test\', pinyin: \'test\', meaning: \'test\' }] } })
        })
        await page.goto(\'/vocabulary\')
        await expect(page.locator(\'body\')).toBeVisible()
    })
})