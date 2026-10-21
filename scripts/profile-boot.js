// Profile the boot: run the page with the same CPU throttling Lighthouse
// uses (4x) and record the long tasks with a marker for each phase.
const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH ||
      'C:\\Users\\MOHSEN\\AppData\\Local\\ms-playwright\\chromium-1248\\chrome-win64\\chrome.exe',
  });
  const context = await browser.newContext({ viewport: { width: 412, height: 823 } });
  const page = await context.newPage();

  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

  await page.addInitScript(() => {
    window.__tasks = [];
    window.__mark = name => performance.mark(name);
    try {
      new PerformanceObserver(list => {
        for (const e of list.getEntries()) {
          window.__tasks.push({ start: Math.round(e.startTime), dur: Math.round(e.duration), name: e.name });
        }
      }).observe({ entryTypes: ['longtask'] });
    } catch (e) { /* ignore */ }
  });

  await page.goto('http://localhost:3000/', { waitUntil: 'load' });
  await page.evaluate(() => { if (typeof window.skipSetup === 'function') window.skipSetup(); });
  await page.waitForTimeout(4000);

  const out = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] || {};
    const marks = performance.getEntriesByType('mark').map(m => ({ name: m.name, t: Math.round(m.startTime) }));
    const paints = performance.getEntriesByType('paint').map(p => ({ name: p.name, t: Math.round(p.startTime) }));
    const res = performance.getEntriesByType('resource')
      .filter(r => /posts\.js|channels\.js|avatars\.js|i18n\.js|telegram-web-app|index\.html/.test(r.name))
      .map(r => ({ name: r.name.replace('http://localhost:3000', ''), start: Math.round(r.startTime), end: Math.round(r.responseEnd) }));
    return {
      tasks: window.__tasks,
      domContentLoaded: Math.round(nav.domContentLoadedEventEnd || 0),
      loadEvent: Math.round(nav.loadEventEnd || 0),
      responseEnd: Math.round(nav.responseEnd || 0),
      paints, marks, res,
      nodes: document.getElementsByTagName('*').length,
      cards: document.querySelectorAll('.explore-item').length,
    };
  });

  console.log('TTFB(responseEnd): ' + out.responseEnd + 'ms | DOMContentLoaded: ' + out.domContentLoaded + 'ms | load: ' + out.loadEvent + 'ms');
  console.log('paints: ' + JSON.stringify(out.paints));
  console.log('nodes: ' + out.nodes + ' | cards: ' + out.cards);
  console.log('\nresources:');
  out.res.forEach(r => console.log('  ' + r.start + ' -> ' + r.end + 'ms  ' + r.name));
  console.log('\nlong tasks (4x CPU throttle):');
  out.tasks.forEach(t => console.log('  ' + t.dur + 'ms @' + t.start));

  await browser.close();
})();
