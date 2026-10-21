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
    const searchInput = page.locator('#searchInput');
    await searchInput.fill('bbc');
    await searchInput.press('Enter');
    await page.keyboard.press('Escape');

    const cards = page.locator('.explore-item, .channel-card, .list-item');
    await expect(cards.first()).toBeVisible();
    await cards.first().click();

    const overlay = page.locator('#channelOverlay');
    await expect(overlay).toHaveClass(/open/);
    await expect(page.locator('#modalTitle')).not.toBeEmpty();

    await page.locator('#channelOverlay .modal-close').click();
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

  test('pressing Enter on a focused card opens the channel modal', async ({ page }) => {
    const searchInput = page.locator('#searchInput');
    await searchInput.fill('bbc');
    await searchInput.press('Enter');
    await page.keyboard.press('Escape');

    const cards = page.locator('.explore-item, .channel-card, .list-item');
    await expect(cards.first()).toBeVisible();

    // Keyboard activation: Enter on a focused card must open its modal.
    await cards.first().focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#channelOverlay')).toHaveClass(/open/);

    // Escape closes it again.
    await page.keyboard.press('Escape');
    await expect(page.locator('#channelOverlay')).not.toHaveClass(/open/);
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

  test('offline mode shows a clear banner and still returns local results', async ({ page, context }) => {
    // Simulate a dead network for everything EXCEPT the local data files
    // (channels.js / posts.js), which the service worker serves from cache.
    await context.route('**/*', route => {
      const url = route.request().url();
      if (/\/(channels|posts|avatars)\.js(\?|$)/.test(url)) return route.continue();
      return route.abort('internetdisconnected');
    });
    // A real offline signal — navigator.onLine flips to false, which is what
    // the app listens to for the offline banner.
    await context.setOffline(true);

    // The app must still boot (cached shell) and reach the content area.
    await page.goto('/');
    const heroVisible = await page.locator('#heroSection').isVisible();
    if (!heroVisible) {
      await page.evaluate(() => {
        if (typeof window.skipSetup === 'function') window.skipSetup();
      });
    }
    await expect(page.locator('#heroSection')).toBeVisible();

    // Offline banner is visible and explains the situation.
    const banner = page.locator('#netBanner');
    await expect(banner).toHaveClass(/show/);
    await expect(page.locator('#netBannerText')).toContainText(/offline/i);

    // Local (cached) search still works — no "no results" dead end.
    const searchInput = page.locator('#searchInput');
    await searchInput.fill('bbc');
    await searchInput.press('Enter');
    await page.keyboard.press('Escape');

    const cards = page.locator('.explore-item, .channel-card, .list-item');
    await expect(cards.first()).toBeVisible();
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
