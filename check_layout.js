import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  console.log("Navigating to http://localhost:3000...");
  try {
    await page.goto('http://localhost:3000');
    // Wait a bit for React to render and Tailwind CSS to apply
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  } catch(e) {
    console.log("Failed to load page. Is Vite running?", e.message);
    await browser.close();
    process.exit(1);
  }

  console.log("\n--- Checking 1: Header Overlap ---");
  const moonBtn = page.locator('button[title="Dark Mode"], button[title="Light Mode"]').first();
  const startBtn = page.locator('button:has-text("Bắt đầu ngay")').first();
  
  if (await moonBtn.isVisible() && await startBtn.isVisible()) {
    const moonBox = await moonBtn.boundingBox();
    const startBox = await startBtn.boundingBox();
    console.log("Moon Box:", moonBox);
    console.log("Start Button Box:", startBox);
    if (moonBox && startBox) {
      if (moonBox.x + moonBox.width > startBox.x) {
        console.log("❌ OVERLAP DETECTED IN HEADER!");
      } else {
        console.log("✅ Header layout OK. Gap:", startBox.x - (moonBox.x + moonBox.width));
      }
    }
  } else {
    console.log("Header elements not found.");
  }

  console.log("\n--- Checking 2: CTA and Features Text ---");
  const ctaBtn = page.locator('button:has-text("Dùng thử miễn phí")').first();
  const featuresText = page.locator('text="Tính năng cốt lõi"').first();
  
  if (await ctaBtn.isVisible() && await featuresText.isVisible()) {
    const ctaBox = await ctaBtn.boundingBox();
    const fBox = await featuresText.boundingBox();
    console.log("CTA Box:", ctaBox);
    console.log("Features Text Box:", fBox);
    if (ctaBox && fBox) {
      if (ctaBox.y + ctaBox.height > fBox.y) {
        console.log("❌ OVERLAP DETECTED IN FEATURES SECTION!");
      } else {
        console.log("✅ Features layout OK. Vertical Gap:", fBox.y - (ctaBox.y + ctaBox.height));
      }
    }
  } else {
    console.log("CTA or Features Text not found.");
  }

  console.log("\n--- Checking 3: Paragraph and Tags ---");
  const paraText = page.locator('text=/Hanora được thiết kế để đồng hành/').first();
  const tagDiv = page.locator('text="Local-First Storage"').first();
  
  if (await paraText.isVisible() && await tagDiv.isVisible()) {
    const pBox = await paraText.boundingBox();
    const tBox = await tagDiv.boundingBox();
    console.log("Paragraph Box:", pBox);
    console.log("Tag Box:", tBox);
    if (pBox && tBox) {
      if (pBox.y + pBox.height > tBox.y) {
        console.log("❌ OVERLAP DETECTED IN SECONDARY SECTION!");
      } else {
        console.log("✅ Secondary layout OK. Vertical Gap:", tBox.y - (pBox.y + pBox.height));
      }
    }
  } else {
    console.log("Paragraph or Tags not found.");
  }

  await browser.close();
})();
