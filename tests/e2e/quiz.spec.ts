import { expect, test } from '@playwright/test'
import { uploadSamplePdf, selectTextInPdfPage } from './test-utils'

test.describe('Quiz Feature', () => {
    test.beforeEach(async ({ page }) => {
        await page.route('https://fonts.googleapis.com/**', (route) => route.abort())
        await page.route('https://fonts.gstatic.com/**', (route) => route.abort())
        await page.request.post('http://127.0.0.1:3001/api/debug/reset-demo').catch(() => null)
    })

    test('should generate quiz, answer, update score and finish', async ({ page }) => {
        test.setTimeout(90_000)
        const pdfPage = await uploadSamplePdf(page)

        // Select text to analyze first to show the sidebar with quiz panel
        await selectTextInPdfPage(pdfPage, '市场需求')
        await page.getByRole('button', { name: /Analyze/i }).click()

        // Mock the Quiz AI generation since we don't have a real Gemini key in CI
        await page.route('**/api/ai/quiz', async route => {
            await route.fulfill({
                json: {
                    status: 'success',
                    questions: [
                        {
                            id: 'q1',
                            question: 'What does 市场需求 mean?',
                            options: [
                                { id: 'o1', text: 'Market demand', is_correct: true },
                                { id: 'o2', text: 'Market supply', is_correct: false },
                                { id: 'o3', text: 'Market price', is_correct: false },
                            ],
                            explanation: '市场需求 refers to market demand.',
                        }
                    ],
                    generated_at: new Date().toISOString()
                }
            })
        })

        // Generate Quiz
        await page.getByRole('button', { name: /Tạo câu hỏi/i }).click()
        
        // Wait for question to render
        await expect(page.getByText('What does 市场需求 mean?')).toBeVisible()

        // Answer the question incorrectly first to see explanation
        await page.getByText('Market supply').click()
        await expect(page.getByText('Sai rồi')).toBeVisible()
        await expect(page.getByText('市场需求 refers to market demand.')).toBeVisible()

        // Click next/finish (since there is only 1 question, it might say Finish)
        const nextButton = page.getByRole('button', { name: /Tiếp tục|Hoàn thành/i })
        await nextButton.click()

        // Ensure score is displayed
        await expect(page.getByText(/Điểm: \d+/i)).toBeVisible()
        
        // Quiz state finishes and it may show 'Bạn đã hoàn thành' or similar
        await expect(page.getByText(/Hoàn thành/i)).toBeVisible()
    })
})