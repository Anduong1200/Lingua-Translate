import { expect, test } from '@playwright/test'
import { uploadSamplePdf, selectTextInPdfPage } from './test-utils'

test.describe('AI Chat Feature', () => {
    test.beforeEach(async ({ page }) => {
        await page.route('https://fonts.googleapis.com/**', (route) => route.abort())
        await page.route('https://fonts.gstatic.com/**', (route) => route.abort())
        await page.request.post('http://127.0.0.1:3001/api/debug/reset-demo').catch(() => null)
    })

    test('should show correct AI status based on config and handle chat', async ({ page }) => {
        test.setTimeout(90_000)

        // Mock the initial status to be missing key and no consent
        await page.route('**/api/ai/status', async route => {
            await route.fulfill({ json: { enabled: false, mode: 'local', message: 'No key' } })
        })
        await page.route('**/api/ai/consent', async route => {
            await route.fulfill({ json: { consent: { allow_send_selected_text: false, allow_send_page_context: false, allow_send_notes: false } } })
        })

        const pdfPage = await uploadSamplePdf(page)
        await selectTextInPdfPage(pdfPage, '市场需求')
        await page.getByRole('button', { name: /Analyze/i }).click()
        
        // Open Chat Tab
        await page.getByRole('tab', { name: /Trợ lý AI/i }).click()

        // Assert warning messages
        await expect(page.getByText('Chưa cấu hình API Key')).toBeVisible()
        await expect(page.getByText('Cần cấp quyền chia sẻ văn bản')).toBeVisible()

        // Unroute and mock successful status
        await page.unroute('**/api/ai/status')
        await page.unroute('**/api/ai/consent')

        await page.route('**/api/ai/status', async route => {
            await route.fulfill({ json: { enabled: true, mode: 'gemini', message: 'Ready' } })
        })
        await page.route('**/api/ai/consent', async route => {
            await route.fulfill({ json: { consent: { allow_send_selected_text: true, allow_send_page_context: true, allow_send_notes: true } } })
        })

        // Mock chat response
        await page.route('**/api/ai/chat', async route => {
            await route.fulfill({
                json: {
                    status: 'success',
                    reply: 'Đây là câu trả lời từ AI mock.',
                    generated_at: new Date().toISOString()
                }
            })
        })

        // Force a re-render/re-fetch of the chat panel by going to another tab and back
        await page.getByRole('tab', { name: /Ngữ cảnh/i }).click()
        await page.getByRole('tab', { name: /Trợ lý AI/i }).click()

        // Input chat
        await page.locator('textarea[placeholder*="Hỏi Hanora AI..."]').fill('Giải thích thêm về từ này')
        await page.getByRole('button', { name: /Gửi/i }).click()

        // Check if mock reply is rendered
        await expect(page.getByText('Đây là câu trả lời từ AI mock.')).toBeVisible()
    })
})