import { defineConfig } from '@playwright/test'
import type { BrandOptions } from '../../layers/engine/e2e/support/test'
import { fileURLToPath } from 'node:url'
import { mockPlaywrightConfig } from '../../layers/engine/e2e/mock/playwright'

// Mock mode: the app against the mock tsb-service, no secret or real backend. See layers/engine/e2e/mock/playwright.ts.
export default defineConfig<BrandOptions>(
  mockPlaywrightConfig({
    brand: 'tokyosushi',
    appDir: fileURLToPath(new URL('.', import.meta.url)).replace(/\/$/u, ''),
    appPort: 3200,
    mockPort: 8100,
    brandMobileSpecs: ['smoke.spec.ts'],
  }),
)
