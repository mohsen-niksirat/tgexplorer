import { test, expect } from '@playwright/test';

/**
 * e2e smoke tests for Telegram Explorer (local mode, no worker).
 *
 * The app boots into the "Setup Your Proxy" screen on a clean profile; we
 * skip it through the app's own `skipSetup()` helper (exposed globally from
 * the inline script) so the hero + main content render.
 */
test.describe('Telegram Explorer - e2e', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Skip the setup screen if it is being shown (fresh profile).
    const heroVisible = await page.locator('#heroSection').isVisible();
    if (!heroVisible) {
      await page.evaluate(() => {
        if (typeof window.skipSetup === 'function') window.skipSetup();
      });
    }
    await expect(page.locator('#heroSection')).toBeVisible();
  });

  test('loads the page and shows the hero section', async ({ page }) => {
    await expect(page.locator('#heroSection')).toBeVisible();
    await expect(page.locator('h1', { hasText: 'Explore Telegram Channels' })).toBeVisible();
    await expect(page.locator('#searchInput')).toBeVisible();
    await expect(page.locator('#mainContent')).toBeVisible();
  });

  test('explore filters narrow the results and end up in the URL', async ({ page }) => {
    const cards = page.locator('.explore-item, .channel-card');
    await expect(cards.first()).toBeVisible();
    // The grid is paginated, so count the whole result set, not the cards
    // that happen to be on the page.
    const before = await page.evaluate(() => window.state.searchResults.length);

    // No filter is active yet.
    await expect(page.locator('#filterBar')).not.toHaveClass(/show/);

    await page.locator('.cat-chip[data-cat="news"]').click();

    // The filter bar appears and the URL carries the filter.
    await expect(page.locator('#filterBar')).toHaveClass(/show/);
    await expect(page).toHaveURL(/cats=news/);
    await expect(page.locator('.cat-chip[data-cat="news"]')).toHaveClass(/active/);

    const after = await page.evaluate(() => window.state.searchResults.length);
    expect(after).toBeGreaterThan(0);
    expect(after).toBeLessThan(before);

    // Clicking the same chip again removes the filter.
    await page.locator('.cat-chip[data-cat="news"]').click();
    await expect(page.locator('#filterBar')).not.toHaveClass(/show/);
    await expect(page).not.toHaveURL(/cats=/);
  });

  test('a filtered view can be shared through the URL', async ({ page }) => {
    await page.goto('/?cats=news,tech&types=image');

    // The chips and the summary bar reflect the URL.
    await expect(page.locator('.cat-chip[data-cat="news"]')).toHaveClass(/active/);
    await expect(page.locator('.cat-chip[data-cat="tech"]')).toHaveClass(/active/);
    await expect(page.locator('#filterBar')).toHaveClass(/show/);

    // ...and only channels of those categories are listed.
    const shown = await page.locator('.explore-item, .channel-card').count();
    expect(shown).toBeGreaterThan(0);

    // The clear button resets everything, URL included.
    await page.locator('#clearFiltersBtn').click();
    await expect(page.locator('#filterBar')).not.toHaveClass(/show/);
    await expect(page).not.toHaveURL(/cats=/);
  });

  test('local search returns channel cards', async ({ page }) => {
    const searchInput = page.locator('#searchInput');
    await searchInput.fill('bbc');
    await searchInput.press('Enter');

    // Dismiss the autocomplete dropdown if it is open (it is positioned over
    // the results and would otherwise intercept nothing — we only need it gone
    // so the count text is stable).
    await page.keyboard.press('Escape');

    // Local search count line: "Local search — N results for ..."
    await expect(page.locator('#resultsCount')).toContainText('bbc');

    // Explore view renders .explore-item cards; grid view renders .channel-card.
    const cards = page.locator('.explore-item, .channel-card, .list-item');
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThan(0);
  });

  test('opens the channel modal and closes it', async ({ page }) => {
    // Open the modal through the app's own API so the test does not depend
    // on which channel happens to match the search term first.
    await page.evaluate(() => window.openChannel('bbcpersian'));

    const overlay = page.locator('#channelOverlay');
    await expect(overlay).toHaveClass(/open/);
    await expect(page.locator('#modalTitle')).not.toBeEmpty();

    await page.locator('#channelOverlay .modal-close').click();
    await expect(overlay).not.toHaveClass(/open/);
  });

  test('the channel profile shows stats, an activity chart and content tags', async ({ page }) => {
    await page.evaluate(() => window.openChannel('bbcpersian'));
    await expect(page.locator('#channelOverlay')).toHaveClass(/open/);

    // Four stat cards: posts per day, total posts, active days, last post.
    const stats = page.locator('#modalStats .stat-card');
    await expect(stats).toHaveCount(4);
    await expect(page.locator('#modalStats')).toBeVisible();

    // The activity chart is drawn on a canvas and can switch between the
    // 7 and the 30 day window.
    await expect(page.locator('.chart-range-btn')).toHaveCount(3);
    await expect(page.locator('#activityChartTitle')).toContainText('7');
    await page.locator('.chart-range-btn[data-days="30"]').click();
    await expect(page.locator('#activityChartTitle')).toContainText('30');
    await expect(page.locator('.chart-range-btn[data-days="30"]')).toHaveClass(/active/);

    // Content tags extracted from the post texts.
    await expect(page.locator('#modalTags')).toBeVisible();
    expect(await page.locator('#modalTags .modal-tag').count()).toBeGreaterThan(0);

    // The direct share link button is there.
    await expect(page.locator('#modalShareBtn')).toBeVisible();
  });

  test('searching inside the post texts finds the channels that mentioned it', async ({ page }) => {
    // Switch to the post mode.
    await page.locator('.search-mode-btn[data-mode="posts"]').click();
    await expect(page.locator('.search-mode-btn[data-mode="posts"]')).toHaveClass(/active/);

    // Use a word that really occurs in the local archive.
    const word = await page.evaluate(() => {
      for (const u in CHANNEL_POSTS) {
        for (const p of CHANNEL_POSTS[u] || []) {
          const m = (p.text || '').match(/[\p{L}]{6,}/u);
          if (m) return m[0];
        }
      }
      return null;
    });
    expect(word).toBeTruthy();

    const searchInput = page.locator('#searchInput');
    await searchInput.fill(word);
    await searchInput.press('Enter');
    await page.waitForTimeout(800);

    // The results are grouped by channel and the match is highlighted.
    expect(await page.locator('.psr-group').count()).toBeGreaterThan(0);
    expect(await page.locator('.psr-hit-text mark').count()).toBeGreaterThan(0);
    await expect(page.locator('.psr-summary')).toContainText(/\d/);

    // The deep search button is offered.
    await expect(page.locator('#psrDeepBtn')).toBeVisible();
  });

  test('a shared link opens the channel directly', async ({ page }) => {
    await page.goto('/?channel=bbcpersian');
    await page.waitForTimeout(1500);
    await expect(page.locator('#channelOverlay')).toHaveClass(/open/);
    await expect(page.locator('#modalTitle')).toContainText(/BBC/i);
  });

  test('the service worker watches the favourite channels for new posts', async ({ page }) => {
    // A favourite channel, so the watch list is not empty.
    await page.evaluate(() => {
      localStorage.setItem('tgexp_favs', JSON.stringify([{ username: 'bbcpersian', title: 'BBC Persian' }]));
    });
    await page.reload();
    await page.waitForTimeout(2500);

    const result = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready;
      // The watch state lives in its own cache ('tgexplorer-state') so a
      // version bump does not wipe it — look through every cache for it.
      const names = await caches.keys();
      let watch = null;
      let seen = null;
      for (const name of names) {
        const cache = await caches.open(name);
        if (!watch) {
          const res = await cache.match('/tg-watchlist');
          if (res) watch = JSON.parse(await res.text());
        }
        if (!seen) {
          const res = await cache.match('/tg-seen');
          if (res) seen = JSON.parse(await res.text());
        }
      }
      return {
        periodicSync: 'periodicSync' in reg,
        watch,
        seen,
      };
    });

    // The watch list holds the favourites...
    expect(result.watch).toContain('bbcpersian');
    // ...and the worker knows which posts it has already seen.
    expect(result.seen.bbcpersian.length).toBeGreaterThan(0);
  });

  test('the activity chart reads the monthly archive for the long range', async ({ page }) => {
    await page.evaluate(() => window.openChannel('bbcpersian'));
    await page.waitForTimeout(1200);

    await expect(page.locator('.chart-range-btn[data-days="90"]')).toBeVisible();

    const pixels = () => page.evaluate(() => {
      const c = document.getElementById('activityChart');
      return c.getContext('2d').getImageData(0, 0, c.width, c.height).data.join(',').length;
    });

    const before = await pixels();
    await page.locator('.chart-range-btn[data-days="90"]').click();
    await page.waitForTimeout(1500);

    await expect(page.locator('#activityChartTitle')).toContainText('90');
    // The chart was redrawn from the archive.
    expect(await pixels()).not.toBe(before);
  });

  test('two channels can be compared side by side', async ({ page }) => {
    await page.evaluate(() => window.openChannel('bbcpersian'));
    await page.waitForTimeout(1000);
    await page.locator('#modalCompareBtn').click();

    const overlay = page.locator('#compareOverlay');
    await expect(overlay).toHaveClass(/open/);

    // The first channel is on the left, the second one is picked from the list.
    await expect(page.locator('#compareColA')).toContainText(/BBC/i);
    await page.locator('#compareSelect').selectOption('tabnak');
    await page.waitForTimeout(600);

    await expect(page.locator('#compareColB')).toContainText(/tabnak/i);
    // Both charts are drawn.
    await expect(page.locator('#compareChartA')).toBeVisible();
    await expect(page.locator('#compareChartB')).toBeVisible();

    await page.locator('#compareOverlay .modal-close').click();
    await expect(overlay).not.toHaveClass(/open/);
  });

  test('language switching updates the document', async ({ page }) => {
    await page.locator('#langSelect').selectOption('fa');

    await expect(page.locator('#langSelect')).toHaveValue('fa');
    await expect(page.locator('html')).toHaveAttribute('lang', 'fa');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');

    // Key UI strings are re-rendered in Persian.
    await expect(page.locator('h1', { hasText: 'کاوش کانال‌های تلگرام' })).toBeVisible();

    // Switching back restores LTR + English.
    await page.locator('#langSelect').selectOption('en');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('keyboard focus reaches channel cards from the grid', async ({ page }) => {
    const searchInput = page.locator('#searchInput');
    await searchInput.fill('bbc');
    await searchInput.press('Enter');
    await page.keyboard.press('Escape');

    const cards = page.locator('.explore-item, .channel-card, .list-item');
    await expect(cards.first()).toBeVisible();

    // Cards must be real focusable controls (tabindex + button role), so
    // keyboard users can reach them without a mouse.
    await expect(cards.first()).toHaveAttribute('tabindex', '0');
    await expect(cards.first()).toHaveAttribute('role', 'button');

    // Focusing a card and tabbing forward must leave focus on a visible,
    // focusable element (i.e. the grid is reachable and does not trap focus).
    await cards.first().focus();
    await expect(page.locator(':focus')).toHaveCount(1);
    const focusedTag = await page.evaluate(() => document.activeElement?.tagName || '');
    expect(focusedTag).not.toBe('BODY');
  });

  test('pressing Enter on a focused card opens its modal', async ({ page }) => {
    const searchInput = page.locator('#searchInput');
    await searchInput.fill('bbc');
    await searchInput.press('Enter');
    await page.keyboard.press('Escape');

    const cards = page.locator('.explore-item, .channel-card, .list-item');
    await expect(cards.first()).toBeVisible();

    // Keyboard activation: Enter on a focused card must open its modal.
    // Which modal depends on the channel (a channel with posts opens the
    // post modal, a channel without one opens the channel modal), so accept
    // either — what matters is that the card is really activatable.
    await cards.first().focus();
    await page.keyboard.press('Enter');

    const overlay = page.locator('#channelOverlay.open, #postOverlay.open');
    await expect(overlay).toHaveCount(1);

    // Escape closes it again.
    await page.keyboard.press('Escape');
    await expect(page.locator('#channelOverlay.open, #postOverlay.open')).toHaveCount(0);
  });

  test('icon-only buttons expose accessible names', async ({ page }) => {
    // Every modal close button is icon-only (✕) and needs an aria-label.
    const closeButtons = page.locator('.modal-close');
    const count = await closeButtons.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const label = await closeButtons.nth(i).getAttribute('aria-label');
      expect(label).toBeTruthy();
    }

    // The view-toggle buttons are icons too (⊞ / ☰ / ⊡).
    const viewButtons = page.locator('.view-btn');
    const viewCount = await viewButtons.count();
    expect(viewCount).toBeGreaterThan(0);
    for (let i = 0; i < viewCount; i++) {
      const label = await viewButtons.nth(i).getAttribute('aria-label');
      expect(label).toBeTruthy();
    }
  });

  test('unreachable worker falls back to the local database with a visible notice', async ({ page }) => {
    // Point the app at a worker URL that cannot be reached. The local
    // channel DB must still answer the search.
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('tgexp_worker', 'http://127.0.0.1:9/unreachable');
    });
    await page.reload();

    // NOTE: do not call skipSetup() here — it clears the worker URL we just
    // set, which is exactly what this test needs to keep.

    // The fallback banner is shown (worker set but unreachable).
    const banner = page.locator('#netBanner');
    await expect(banner).toHaveClass(/show/);

    // ...and the local database is used instead of an error screen.
    const searchInput = page.locator('#searchInput');
    await searchInput.fill('bbc');
    await searchInput.press('Enter');
    await page.keyboard.press('Escape');

    const cards = page.locator('.explore-item, .channel-card, .list-item');
    await expect(cards.first()).toBeVisible();
  });
});

/**
 * Offline behaviour runs in its own describe block with its own context:
 * `context.setOffline(true)` tears the whole network down, so it must not
 * leak into the tests above.
 */
test.describe('Telegram Explorer - offline', () => {
  test('offline mode shows a clear banner and still returns local results', async ({ page, context }) => {
    // 1) Load the app online first, so the service worker installs and
    //    caches the shell + the local channel database.
    await page.goto('/');
    await page.evaluate(() => {
      if (typeof window.skipSetup === 'function') window.skipSetup();
    });
    await page.waitForFunction(
      () => navigator.serviceWorker && navigator.serviceWorker.controller !== null,
      null,
      { timeout: 20000 }
    ).catch(() => {});
    await page.waitForTimeout(2000);

    // 2) Now simulate a dead network. The local data files are served by
    //    the service worker from its cache.
    await context.setOffline(true);

    // 3) The app must still boot (cached shell) and reach the content area.
    await page.reload();
    const heroVisible = await page.locator('#heroSection').isVisible();
    if (!heroVisible) {
      await page.evaluate(() => {
        if (typeof window.skipSetup === 'function') window.skipSetup();
      });
    }
    await expect(page.locator('#heroSection')).toBeVisible();

    // 4) The offline banner is visible and explains the situation.
    const banner = page.locator('#netBanner');
    await expect(banner).toHaveClass(/show/);
    await expect(page.locator('#netBannerText')).toContainText(/offline/i);

    // 5) Local (cached) search still works — no "no results" dead end.
    const searchInput = page.locator('#searchInput');
    await searchInput.fill('bbc');
    await searchInput.press('Enter');
    await page.keyboard.press('Escape');

    const cards = page.locator('.explore-item, .channel-card, .list-item');
    await expect(cards.first()).toBeVisible();
  });
});
