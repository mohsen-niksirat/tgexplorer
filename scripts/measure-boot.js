// Measure what the app does on boot: how many DOM nodes it creates, how
// often the Explore view is rendered and how long the main thread is busy.
const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH ||
      'C:\\Users\\MOHSEN\\AppData\\Local\\ms-playwright\\chromium-1248\\chrome-win64\\chrome.exe',
  });
  const context = await browser.newContext({ viewport: { width: 412, height: 823 } });
  const page = await context.newPage();

  // Count the renders from inside the page.
  await page.addInitScript(() => {
    window.__renders = 0;
    const orig = window.requestAnimationFrame;
    window.__countRender = () => { window.__renders++; };
  });

  const t0 = Date.now();
  await page.goto('http://localhost:3000/', { waitUntil: 'load' });
  const loadMs = Date.now() - t0;

  await page.evaluate(() => { if (typeof window.skipSetup === 'function') window.skipSetup(); });
  await page.waitForTimeout(3000);

  const stats = await page.evaluate(() => ({
    nodes: document.getElementsByTagName('*').length,
    exploreItems: document.querySelectorAll('.explore-item').length,
    moreBtns: document.querySelectorAll('.explore-more-btn').length,
    contentLen: document.getElementById('content').innerHTML.length,
    explorePage: window.state ? window.state.explorePage : null,
    results: window.state ? window.state.searchResults.length : null,
    cats: window.state ? window.state.filterCats : null,
    langs: window.state ? window.state.filterLangs : null,
    types: window.state ? window.state.filterTypes : null,
  }));

  console.log('load event: ' + loadMs + ' ms');
  console.log(JSON.stringify(stats, null, 2));

  // Long-task observer: how long is the main thread blocked?
  const longTasks = await page.evaluate(async () => {
    const tasks = [];
    try {
      const obs = new PerformanceObserver(list => {
        for (const e of list.getEntries()) tasks.push({ name: e.name, dur: Math.round(e.duration), start: Math.round(e.startTime) });
      });
      obs.observe({ entryTypes: ['longtask'] });
      await new Promise(r => setTimeout(r, 2000));
      obs.disconnect();
    } catch (e) { return ['longtask observer not supported: ' + e.message]; }
    return tasks;
  });
  console.log('long tasks: ' + JSON.stringify(longTasks));

  await browser.close();
})();
