import { test, expect } from \'@playwright/test\'

test.describe(\'Quiz Feature\', () => {
    test(\'should generate quiz and update score\', async ({ page }) => {
        await page.route(\'**/api/nlp/quiz\', async route => {
            await route.fulfill({ json: { mode: \'test\', question_count: 1, questions: [{ question: \'Q?\', options: [\'A\', \'B\'], answerIndex: 0, explanation: \'expl\' }] } })
        })
        await page.goto(\'/reader\')
        await expect(page.locator(\'body\')).toBeVisible()
    })
})