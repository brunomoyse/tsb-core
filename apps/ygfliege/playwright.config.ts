import { defineConfig, devices } from '@playwright/test'
import type { BrandOptions } from '../../layers/engine/e2e/support/test'

/*
 * Runs against a local dev server + local tsb-service (see .env: API on :8081,
 * seeded with the YGF menu from tsb-service/seeds/ygfliege_menu.sql).
 *
 * Two suites per viewport:
 *  - brand-*:  this app's own specs (./e2e): compose-a-bowl.
 *  - engine-*: the shared shop-flow specs (layers/engine/e2e), run by every brand app
 *              so an engine change is verified against each brand's UI and data.
 *
 * global-setup forces ordering open for the run (the seeded hours are 11:30 to
 * 22:00, outside which add-to-cart stays disabled); global-teardown restores it.
 * Logged-in engine specs skip unless YGF_E2E_USER_EMAIL is set (see global-setup).
 */
const engineDir = '../../layers/engine/e2e'
const desktop = { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } }
const mobile = devices['Pixel 5']

export default defineConfig<BrandOptions>({
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  retries: 1,
  reporter: 'html',
  snapshotPathTemplate: './e2e/__screenshots__/{testFilePath}/{arg}-{projectName}{ext}',
  use: {
    baseURL: 'http://localhost:3001',
    brand: 'ygfliege',
    loginAvailable: Boolean(process.env.YGF_E2E_USER_EMAIL),
    e2eUserEmail: process.env.YGF_E2E_USER_EMAIL,
    locale: 'fr-BE',
    extraHTTPHeaders: {
      'Accept-Language': 'fr-BE,fr;q=0.9',
    },
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'brand-desktop', testDir: './e2e', use: desktop },
    { name: 'engine-desktop', testDir: engineDir, use: desktop },
    { name: 'engine-mobile', testDir: engineDir, use: mobile, testMatch: ['cart.spec.ts', 'visual.spec.ts'] },
  ],
  webServer: {
    command: 'npm run dev -- --port 3001',
    url: 'http://localhost:3001/fr/',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
