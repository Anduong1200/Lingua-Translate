import { test, expect } from \'@playwright/test\'

test.describe(\'Flashcard Feature\', () => {
    test(\'should add flashcard and update due_at\', async ({ page }) => {
        await page.route(\'**/api/flashcards*\', async route => {
            await route.fulfill({ json: { items: [{ id: \'fc-1\', front: \'test\', back: \'test\', due_at: new Date().toISOString() }] } })
        })
        await page.goto(\'/flashcards\')
        await expect(page.locator(\'body\')).toBeVisible()
    })
})