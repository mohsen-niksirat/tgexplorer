import { defineConfig, devices } from '@playwright/test';

/**
 * @type {import('@playwright/test').PlaywrightTestConfig}
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }], ['json', { outputFile: 'test-results/results.json' }]],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        executablePath:
          process.env.PLAYWRIGHT_EXECUTABLE_PATH ||
          'C:\\Users\\MOHSEN\\AppData\\Local\\ms-playwright\\chromium-1248\\chrome-win64\\chrome.exe',
        headless: true,
      },
    },
  ],
  webServer: {
    command: 'npx serve . -p 3000',
    port: 3000,
    reuseExistingServer: true,
  },
});
