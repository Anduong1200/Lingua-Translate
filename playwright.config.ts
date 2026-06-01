import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
    testDir: './tests/e2e',
    timeout: 30_000,
    expect: {
        timeout: 8_000,
    },
    fullyParallel: false,
    reporter: [['list']],
    use: {
        baseURL: 'http://127.0.0.1:3000',
        trace: 'retain-on-failure',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    webServer: [
        {
            command: 'python -m uvicorn main:app --app-dir backend --host 127.0.0.1 --port 3001',
            url: 'http://127.0.0.1:3001/api/health',
            reuseExistingServer: true,
            timeout: 60_000,
        },
        {
            command: 'npm run dev:frontend -- --host 127.0.0.1 --port 3000',
            url: 'http://127.0.0.1:3000',
            reuseExistingServer: true,
            timeout: 60_000,
        },
    ],
})
