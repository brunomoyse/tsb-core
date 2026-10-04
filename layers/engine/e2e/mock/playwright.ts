import { type PlaywrightTestConfig, type Project, devices } from '@playwright/test'
import type { BrandOptions } from '../support/test'
import type { MockBrand } from './types'
import { fileURLToPath } from 'node:url'

/*
 * The Playwright configuration of mock mode, shared by every brand app (apps/<brand>/playwright.mock.config.ts):
 *
 *   npm run test:e2e:mock -w tokyosushi         (or ygfliege)
 *
 * It starts, as `webServer`s, the mock tsb-service (e2e/mock/server.ts) and a PRODUCTION build of the app whose API,
 * WebSocket, S3 and Zitadel URLs all point at that mock, and runs the specs against them. No secret, database, tunnel
 * or Zitadel is involved: authenticated pages get a fake oidc-client-ts session (support/test.ts), and what the real
 * mode does with SQL is done through the mock's control API (support/backend.ts).
 *
 * Environment:
 *   E2E_SKIP_BUILD=1   reuse the build in apps/<brand>/.output (it must have been built with this file's env)
 *   E2E_REUSE=1        reuse a mock / app already listening on the ports (local iteration)
 *   CI                 retries 1, forbidOnly, github annotations next to the HTML report
 *
 * The build overwrites apps/<brand>/.output and .nuxt: do not run it while a dev server of that app is running.
 */

export interface MockModeOptions {
  brand: MockBrand
  /** Apps/<brand> (absolute): the build and the server run there. */
  appDir: string
  appPort: number
  mockPort: number
  /** Specs of the app's own e2e folder that run on the mobile project. */
  brandMobileSpecs?: string[]
}

const engineSpecDir = fileURLToPath(new URL('..', import.meta.url))
const desktop = { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } }
const mobile = devices['Pixel 5']

/* Specs that cannot run on the mock: they need pixel baselines of the real data. */
const REAL_BACKEND_ONLY = ['visual.spec.ts']

/** The environment baked into the app build: every URL points at the mock. */
export function mockBuildEnv({ appPort, mockPort }: Pick<MockModeOptions, 'appPort' | 'mockPort'>) {
  return {
    BASE_URL: `http://localhost:${appPort}`,
    API_BASE_URL: `http://localhost:${mockPort}/api/v1`,
    S3_BUCKET_URL: `http://localhost:${mockPort}`,
    GRAPHQL_WS_URL: `ws://localhost:${mockPort}/api/v1/graphql`,
    ZITADEL_AUTHORITY: `http://localhost:${mockPort}/zitadel`,
    ZITADEL_CLIENT_ID: 'e2e-client',
  }
}

export function mockPlaywrightConfig(options: MockModeOptions): PlaywrightTestConfig<BrandOptions> {
  const { brand, appDir, appPort, mockPort, brandMobileSpecs = [] } = options
  const env = mockBuildEnv(options)
  const reuse = Boolean(process.env.E2E_REUSE)
  const nuxt = 'node ../../node_modules/nuxt/bin/nuxt.mjs build'
  const serve = 'node .output/server/index.mjs'

  const projects: Project<BrandOptions>[] = [
    {
      name: 'brand-desktop',
      testDir: `${appDir}/e2e`,
      testIgnore: [...REAL_BACKEND_ONLY, '**/mobile-*.spec.ts'],
      use: desktop,
    },
    {
      name: 'engine-desktop',
      testDir: engineSpecDir,
      testIgnore: [...REAL_BACKEND_ONLY, '**/mobile-*.spec.ts'],
      use: desktop,
    },
    {
      name: 'engine-mobile',
      testDir: engineSpecDir,
      // The cart flows with a mobile layout of their own. Widen as more specs learn the mobile UI.
      testMatch: ['cart.spec.ts', '**/mobile-*.spec.ts'],
      use: mobile,
    },
  ]
  // The brand's phone project: its smoke specs and every `mobile-*.spec.ts` of its e2e folder.
  projects.splice(1, 0, {
    name: 'brand-mobile',
    testDir: `${appDir}/e2e`,
    testMatch: [...brandMobileSpecs, '**/mobile-*.spec.ts'],
    use: mobile,
  })

  return {
    timeout: 60_000,
    expect: { timeout: 10_000 },
    fullyParallel: false,
    // One mock per brand holds the state of the running test: tests run one at a time.
    workers: 1,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI
      ? [['list'], ['github'], ['html', { open: 'never' }]]
      : [['list'], ['html', { open: 'never' }]],
    use: {
      baseURL: `http://localhost:${appPort}`,
      brand,
      // The mock serves the whole round trip: authorize -> the app's login page -> OTP endpoints -> token endpoint.
      loginAvailable: true,
      loginOrigin: undefined,
      e2eUserEmail: 'e2e@example.test',
      mock: {
        url: `http://localhost:${mockPort}`,
        oidcAuthority: env.ZITADEL_AUTHORITY,
        oidcClientId: env.ZITADEL_CLIENT_ID,
      },
      locale: 'fr-BE',
      extraHTTPHeaders: { 'Accept-Language': 'fr-BE,fr;q=0.9' },
      trace: process.env.CI ? 'on-first-retry' : 'retain-on-failure',
      screenshot: 'only-on-failure',
    },
    projects,
    webServer: [
      {
        command: `node ${fileURLToPath(new URL('./server.ts', import.meta.url))}`,
        env: {
          MOCK_BRAND: brand,
          MOCK_PORT: String(mockPort),
          MOCK_APP_URL: env.BASE_URL,
        },
        url: `http://localhost:${mockPort}/__mock/health`,
        reuseExistingServer: reuse,
        timeout: 30_000,
        stdout: 'pipe',
      },
      {
        command: process.env.E2E_SKIP_BUILD ? serve : `${nuxt} && ${serve}`,
        cwd: appDir,
        env: { ...env, NITRO_PORT: String(appPort), NITRO_HOST: '127.0.0.1' },
        url: `http://localhost:${appPort}/fr/menu`,
        reuseExistingServer: reuse,
        timeout: 300_000,
        stdout: 'ignore',
      },
    ],
  }
}
