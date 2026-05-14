import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for EverShop end-to-end tests.
 * Tests live in `./e2e`. The webServer block boots EverShop in dev mode
 * before tests run (or reuses a running instance if you started one
 * yourself with `npm run dev`).
 */
export default defineConfig({
  testDir: './e2e',

  // Don't bail in CI; locally, fail fast.
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: [
    ['html', { open: 'never' }],
    ['list']
  ],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: 'ignore',
    stderr: 'pipe'
  }
});
