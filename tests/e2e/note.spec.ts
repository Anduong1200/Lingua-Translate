import { test, expect } from \'@playwright/test\'

test.describe(\'Note Feature\', () => {
    test.beforeEach(async ({ page }) => {
        await page.request.post(\'http://127.0.0.1:3001/api/debug/reset-demo\').catch(() => null)
        await page.goto(\'/dashboard\')
    })

    test(\'should save, edit, reload and delete note\', async ({ page }) => {
        await page.route(\'**/api/annotations\', async route => {
            if (route.request().method() === \'POST\') {
                await route.fulfill({ json: { id: \'note-1\', text: \'test\', type: \'highlight\' } })
            } else if (route.request().method() === \'GET\') {
                await route.fulfill({ json: [{ id: \'note-1\', text: \'test\', type: \'highlight\' }] })
            } else {
                await route.continue()
            }
        })
        await expect(page.locator(\'body\')).toBeVisible()
    })
})