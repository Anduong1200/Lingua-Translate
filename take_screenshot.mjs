import { chromium } from '@playwright/test';
import path from 'path';

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    
    await page.goto(process.argv[2] || 'http://localhost:5173');
    await page.waitForTimeout(2000);
    
    // Save to artifacts directory
    const screenshotPath = 'C:\\Users\\ADMIN\\.gemini\\antigravity-ide\\brain\\4cb40cc9-a773-4088-ad25-2ff814f83257\\screenshot.png';
    await page.screenshot({ path: screenshotPath, fullPage: true });
    
    await browser.close();
    console.log('Screenshot saved to ' + screenshotPath);
})();
