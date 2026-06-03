import { defineConfig, devices } from '@playwright/test'

const frontendPort = process.env.E2E_FRONTEND_PORT || '3000'

export default defineConfig({
    testDir: './tests/e2e',
    timeout: 30_000,
    expect: {
        timeout: 8_000,
    },
    fullyParallel: false,
    reporter: [['list']],
    use: {
        baseURL: `http://127.0.0.1:${frontendPort}`,
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
            command: `npx vite preview --host 127.0.0.1 --port ${frontendPort}`,
            url: `http://127.0.0.1:${frontendPort}`,
            reuseExistingServer: true,
            timeout: 60_000,
        },
    ],
})
