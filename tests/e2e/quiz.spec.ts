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

        await page.route('**/api/nlp/quiz', async route => {
            await route.fulfill({
                json: {
                    mode: 'local',
                    question_count: 1,
                    questions: [
                        {
                            question: 'What does 市场需求 mean?',
                            options: ['Market demand', 'Market supply', 'Market price'],
                            answerIndex: 0,
                            explanation: '市场需求 refers to market demand.',
                        }
                    ],
                }
            })
        })

        await page.getByRole('button', { name: /Quiz/i }).click()
        await page.getByRole('button', { name: /Bắt đầu tạo câu hỏi/i }).click()
        
        // Wait for question to render
        await expect(page.getByText('What does 市场需求 mean?')).toBeVisible()

        // Answer the question incorrectly first to see explanation
        await page.getByText('Market supply').click()
        await expect(page.getByText('市场需求 refers to market demand.')).toBeVisible()

        // Ensure score is displayed
        await expect(page.getByText(/Kết quả: 0 \/ 1/i)).toBeVisible()
        
        // Quiz state finishes and it may show 'Bạn đã hoàn thành' or similar
        await expect(page.getByText(/Hoàn thành thử thách/i)).toBeVisible()
    })
})
