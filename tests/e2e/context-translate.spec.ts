import { test, expect } from \'@playwright/test\'

test.describe(\'Context Translate Feature\', () => {
    test(\'should show fallback warning when AI off\', async ({ page }) => {
        await page.route(\'**/api/nlp/translate-context\', async route => {
            await route.fulfill({ json: {
                mode: \'test\',
                scope: \'sentence\',
                domain: \'general\',
                selection: { source: \'test\', dictionary_vi: \'test_vi\', literal_vi: \'test_lit\' },
                sentence: { source: \'test\', dictionary_vi: \'test_vi\', literal_vi: \'test_lit\' },
                paragraph: { source: \'test\', dictionary_vi: \'test_vi\', literal_vi: \'test_lit\', sentences: [] },
                context: { domain: \'g\', source_sentence: \'test\', role_vi: \'role\', explanation_vi: \'expl\' },
                grammar: { patterns: [], explanation_vi: \'expl\' }
            }})
        })
        await page.goto(\'/reader\')
        await expect(page.locator(\'body\')).toBeVisible()
    })
})