const { chromium } = require('playwright');
const path = require('path');

(async () => {
    // Launch browser
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();
    
    try {
        console.log('Navigating to http://localhost:3000/reader');
        // Increase timeout and wait for load state
        await page.goto('http://localhost:3000/reader', { 
            waitUntil: 'networkidle',
            timeout: 10000 
        });
        
        // Wait for PDF elements to settle if any, or wait a bit for effects to render
        await page.waitForTimeout(2000);

        const screenshotPath = 'C:/Users/ADMIN/.gemini/antigravity-ide/brain/4cb40cc9-a773-4088-ad25-2ff814f83257/reader_screenshot.png';
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log('Screenshot taken successfully at:', screenshotPath);
    } catch (err) {
        console.error('Failed to take screenshot:', err);
    } finally {
        await browser.close();
    }
})();
