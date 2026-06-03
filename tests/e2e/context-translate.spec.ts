import { expect, test } from '@playwright/test'
import { uploadSamplePdf, selectTextInPdfPage } from './test-utils'

test.describe('Context Translate Feature', () => {
    test.beforeEach(async ({ page }) => {
        await page.route('https://fonts.googleapis.com/**', (route) => route.abort())
        await page.route('https://fonts.gstatic.com/**', (route) => route.abort())
        await page.request.post('http://127.0.0.1:3001/api/debug/reset-demo').catch(() => null)
    })

    test('should show dictionary fallback warning when AI is off, and natural translation when AI is on', async ({ page }) => {
        test.setTimeout(90_000)
        const pdfPage = await uploadSamplePdf(page)

        // Select text to analyze
        await selectTextInPdfPage(pdfPage, '市场需求')
        await page.getByRole('button', { name: /Analyze/i }).click()

        // By default without a key or consent, the real backend will return dictionary fallback
        await expect(page.getByText('Đang dùng bản dịch từ điển cục bộ, chưa phải bản dịch tự nhiên')).toBeVisible()
        await expect(page.getByText('nhu cầu thị trường').first()).toBeVisible()

        // Now mock the API to simulate AI natural translation being successful
        await page.route('**/api/analyze', async route => {
            await route.fulfill({
                json: {
                    status: 'success',
                    selection: { text: '市场需求', mode: 'phrase' },
                    quick_meaning: {
                        simplified: '市场需求',
                        pinyin_display: 'shìchǎng xūqiú',
                        definitions_vi: ['nhu cầu thị trường'],
                        definitions_en: []
                    },
                    translations: {
                        literal_vi: 'thị trường / nhu cầu',
                        dictionary_vi: 'nhu cầu thị trường',
                        ai_natural_vi: 'Nhu cầu của thị trường đối với sản phẩm'
                    },
                    role_analysis: { contextual_role_vi: 'Noun', role_explanation_vi: '' },
                    context: { domain: 'economics', source_sentence: '由于市场需求下降' },
                    grammar: { patterns: [], explanation_vi: '' }
                }
            })
        })

        // Analyze again (or analyze another phrase) to trigger the mocked AI response
        await selectTextInPdfPage(pdfPage, '由于市场需求下降')
        await page.getByRole('button', { name: /Analyze/i }).click()

        // It should now render the ai_natural_vi text without the fallback warning
        await expect(page.getByText('Nhu cầu của thị trường đối với sản phẩm')).toBeVisible()
        await expect(page.getByText('Đang dùng bản dịch từ điển cục bộ')).not.toBeVisible()
    })
})