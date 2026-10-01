import { defineConfig, devices } from '@playwright/test'
import type { BrandOptions } from '../../layers/engine/e2e/support/test'

/*
 * Two suites per viewport:
 *  - brand-*:  this app's own specs (./e2e): home, menu, i18n.
 *  - engine-*: the shared shop-flow specs (layers/engine/e2e), run by every brand app
 *              so an engine change is verified against each brand's UI and data.
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
    baseURL: 'http://localhost:3000',
    brand: 'tokyosushi',
    loginAvailable: true,
    // The TSB web app uses the test instance's default login UI.
    loginOrigin: 'https://tsb.brunomoyse.be',
    e2eUserEmail: process.env.E2E_USER_EMAIL,
    locale: 'fr-BE',
    extraHTTPHeaders: {
      'Accept-Language': 'fr-BE,fr;q=0.9',
    },
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'brand-desktop', testDir: './e2e', use: desktop },
    { name: 'brand-mobile', testDir: './e2e', use: mobile, testMatch: ['smoke.spec.ts'] },
    { name: 'engine-desktop', testDir: engineDir, use: desktop },
    { name: 'engine-mobile', testDir: engineDir, use: mobile, testMatch: ['cart.spec.ts', 'visual.spec.ts'] },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000/fr/',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
