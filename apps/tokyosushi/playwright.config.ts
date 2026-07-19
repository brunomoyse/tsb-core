import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  timeout: 60_000,
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
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
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5'],
      },
      testMatch: ['smoke.spec.ts', 'cart.spec.ts'],
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000/fr/',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
