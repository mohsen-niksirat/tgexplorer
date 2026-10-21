// Capture the README screenshots from the running app.
//
//   node scripts/screenshots.js
//
// Writes docs/grid.png, docs/search.png and docs/channel.png.
const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'docs');
const BASE = process.env.BASE_URL || 'http://localhost:3000';

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH ||
      'C:\\Users\\MOHSEN\\AppData\\Local\\ms-playwright\\chromium-1248\\chrome-win64\\chrome.exe',
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 2,
    colorScheme: 'dark',
  });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: 'load' });
  await page.evaluate(() => { if (typeof window.skipSetup === 'function') window.skipSetup(); });
  await page.waitForTimeout(3500);

  // 1) the Explore grid
  await page.screenshot({ path: path.join(OUT, 'grid.png') });
  console.log('wrote docs/grid.png');

  // 2) the search
  const search = page.locator('#searchInput');
  await search.fill('crypto');
  await search.press('Enter');
  await page.waitForTimeout(1500);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, 'search.png') });
  console.log('wrote docs/search.png');

  // 3) the channel profile
  await page.evaluate(() => window.openChannel('bbcpersian'));
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(OUT, 'channel.png') });
  console.log('wrote docs/channel.png');

  // 4) the mobile view of the grid
  const mobile = await browser.newContext({
    viewport: { width: 412, height: 823 },
    deviceScaleFactor: 2,
    colorScheme: 'dark',
    isMobile: true,
    hasTouch: true,
  });
  const mpage = await mobile.newPage();
  await mpage.goto(BASE, { waitUntil: 'load' });
  await mpage.evaluate(() => { if (typeof window.skipSetup === 'function') window.skipSetup(); });
  await mpage.waitForTimeout(3500);
  await mpage.screenshot({ path: path.join(OUT, 'mobile.png') });
  console.log('wrote docs/mobile.png');

  await browser.close();
})();
