import { defineConfig, devices } from '@playwright/test';

// 4173 is also where the design prototype is served; PLAYWRIGHT_PORT keeps the
// two apart so a test never runs against the wrong page.
const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 4173);
const HOST = process.env.PLAYWRIGHT_HOST ?? 'localhost';
const development = process.env.PLAYWRIGHT_DEV === '1';

/**
 * End-to-end journeys on the demo account, which needs no token.
 *
 * They run against a production build served by `vite preview`, the closest
 * thing to what is uploaded. Chromium only: `npx playwright install chromium`
 * once on a new machine.
 */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://${HOST}:${PORT}`,
    locale: 'en-US',
    trace: 'retain-on-failure',
    // A worker from an earlier build must never answer for this one.
    serviceWorkers: 'block',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: development ? `npm run dev -- --host ${HOST} --port ${PORT} --strictPort` : `npm run build && npm run preview -- --host ${HOST} --port ${PORT} --strictPort`,
    url: `http://${HOST}:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
