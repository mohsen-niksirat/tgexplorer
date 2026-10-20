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

    // Focusing a card and tabbing forward must leave focus on a visible,
    // focusable element (i.e. the grid is reachable and does not trap focus).
    await cards.first().focus();
    await page.keyboard.press('Tab');
    const focusedTag = await page.evaluate(() => document.activeElement?.tagName || '');
    expect(focusedTag).not.toBe('BODY');
  });
});
