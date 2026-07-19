import { defineConfig, devices } from '@playwright/test'

// No auth global-setup: the compose-a-bowl flow is cart-only (client-side),
// so tests run unauthenticated against a local dev server + local tsb-service
// (see .env — API on :8081, seeded with the YGF menu from
// tsb-service/seeds/ygfliege_menu.sql).
export default defineConfig({
  timeout: 60_000,
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3001',
    locale: 'fr-BE',
    extraHTTPHeaders: {
      'Accept-Language': 'fr-BE,fr;q=0.9',
    },
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'Desktop Chrome',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
  webServer: {
    command: 'npm run dev -- --port 3001',
    url: 'http://localhost:3001/fr/',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
