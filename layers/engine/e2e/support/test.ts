import { type Page, test as base, expect } from '@playwright/test'
import { type Backend, mockBackend, realBackend } from './backend'
import { existsSync, readFileSync } from 'node:fs'
import type { CapturedOidcState } from './auth-flow'
import { MockControl } from '../mock/client'
import { authStateFile } from './paths'
import { fakeOidcEntry } from '../mock/oidc'

/*
 * Shared `test` for the engine specs, run by every brand app.
 *
 * `brand` is a project option set in each app's playwright.config.ts, so a spec can skip a
 * genuine brand difference (`test.skip(brand === 'x', reason)`). Keep those rare: most
 * differences belong in BrandConfig, not in the tests.
 */
export type Brand = 'tokyosushi' | 'ygfliege'

export interface BrandOptions {
  brand: Brand
  /*
   * False when this brand's Zitadel client isn't set up for local e2e, so /auth/login can't
   * complete its authRequest round-trip (e.g. redirect_uri not registered). Specs that go
   * through Zitadel skip instead of failing or, worse, snapshotting an error page.
   */
  loginAvailable: boolean
  /*
   * Origin that must serve /auth/login after the Zitadel round-trip: the OIDC app's loginV2
   * baseUri, or the instance default when the app has none (one tokyosushi app serves several
   * origins, so its local runs log in on the test site).
   */
  loginOrigin: string | undefined
  /* OTP test user for this brand; undefined skips specs that log in through the UI. */
  e2eUserEmail: string | undefined
  /*
   * Mock mode (playwright.mock.config.ts): where the mock tsb-service listens and which fake OIDC session the
   * authenticated pages get. Undefined = real mode: the test server, Zitadel and its database.
   */
  mock: MockOptions | undefined
}

export interface MockOptions {
  url: string
  /* ZITADEL_AUTHORITY / ZITADEL_CLIENT_ID the app under test was built with. */
  oidcAuthority: string
  oidcClientId: string
}

let cachedState: CapturedOidcState | null = null

function loadAuthState(configFile: string | undefined): CapturedOidcState | null {
  if (cachedState) return cachedState
  const file = authStateFile(configFile)
  if (!existsSync(file)) return null
  cachedState = JSON.parse(readFileSync(file, 'utf-8')) as CapturedOidcState
  return cachedState
}

/*
 * The fixture shortcuts the OTP UI by replaying the oidc-client-ts localStorage
 * entries captured in globalSetup. Tests that need an authenticated user get a
 * ready-to-use page without paying the email-poll cost on every test.
 *
 * Mechanism: addInitScript runs before any page script on every navigation,
 * so the OIDC user is in localStorage by the time the auth middleware reads
 * it via isAuthenticated().
 */
export const test = base.extend<
  BrandOptions & { authenticatedPage: Page; backend: Backend; mockLifecycle: void }
>({
  brand: ['tokyosushi', { option: true }],
  loginAvailable: [true, { option: true }],
  loginOrigin: [undefined, { option: true }],
  e2eUserEmail: [undefined, { option: true }],
  mock: [undefined, { option: true }],

  /*
   * `page.goto` resolves once the app is hydrated. The app starts its JavaScript a moment after the first paint
   * (server/plugins/defer-hydration.ts), and on a page with nothing left to load the window's load event, which `goto`
   * waits for, can fire before that: a click straight after `goto` would then land on server-rendered HTML with no handlers.
   * Pages that are not the app (the fake Mollie page, a download) have no #__nuxt and are not waited for.
   */
  page: async ({ page }, use) => {
    const goto = page.goto.bind(page)
    page.goto = async (url, options) => {
      const response = await goto(url, options)
      await page
        .waitForFunction(
          () => {
            const root = document.getElementById('__nuxt')
            return !root || '__vue_app__' in root
          },
          undefined,
          { timeout: 10_000 },
        )
        .catch(() => undefined)
      return response
    }
    await use(page)
  },

  /* Real DB helpers or mock control behind one interface (support/backend.ts). */
  backend: async ({ mock }, use) => {
    await use(mock ? mockBackend(new MockControl(mock.url)) : realBackend())
  },

  /*
   * Mock mode only, every test: start from the mock's defaults, keep the browser off the internet, and afterwards fail
   * the test when the app asked the mock for something it cannot answer (the mock lags the app: add the field or
   * operation to e2e/mock/resolvers.ts rather than letting the app get a silent null).
   */
  mockLifecycle: [
    async ({ mock, context }, use, testInfo) => {
      if (!mock) {
        await use()
        return
      }
      const control = new MockControl(mock.url)
      await control.reset()
      await context.route(
        (url) => !['localhost', '127.0.0.1'].includes(url.hostname),
        (route) => route.abort('blockedbyclient'),
      )
      // What the browser complained about, attached to a failing test (a failed chunk or API call explains most flakes).
      const problems: string[] = []
      context.on('page', (opened) => {
        opened.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`))
        opened.on('console', (message) => {
          if (message.type() === 'error') problems.push(`console.error: ${message.text()}`)
        })
        opened.on('requestfailed', (request) =>
          problems.push(`requestfailed: ${request.url()} ${request.failure()?.errorText ?? ''}`),
        )
      })
      await use()
      if (testInfo.status !== testInfo.expectedStatus && problems.length > 0) {
        await testInfo.attach('browser-problems', {
          body: problems.join('\n'),
          contentType: 'text/plain',
        })
      }
      if (testInfo.status === testInfo.expectedStatus) {
        const { gaps } = await control.state()
        expect(
          gaps,
          'the app used API the mock does not implement (see e2e/mock/README.md)',
        ).toEqual([])
      }
    },
    { auto: true },
  ],

  authenticatedPage: async ({ page, context, mock }, use, testInfo) => {
    if (mock) {
      /*
       * A fake oidc-client-ts session: seeded before any page script, once per browser context (a later sign-out must not
       * be undone by the next navigation).
       */
      const entry = fakeOidcEntry({ authority: mock.oidcAuthority, clientId: mock.oidcClientId })
      await context.addInitScript((pair: [string, string]) => {
        if (localStorage.getItem('e2e-session-seeded')) return
        localStorage.setItem(pair[0], pair[1])
        localStorage.setItem('e2e-session-seeded', '1')
      }, entry)
      await use(page)
      return
    }

    const state = loadAuthState(testInfo.config.configFile)
    if (!state) {
      base.skip(
        true,
        "No e2e auth state: set this brand's e2e user email (E2E_USER_EMAIL for tokyosushi, YGF_E2E_USER_EMAIL for ygfliege) plus the DB_* and ZITADEL_* vars from support/db-env.ts so globalSetup can capture a session",
      )
      return
    }

    await context.clearCookies()
    await context.addInitScript((entries: [string, string][]) => {
      for (const [key, value] of entries) {
        localStorage.setItem(key, value)
      }
    }, state.entries)

    await use(page)
  },
})

export { expect } from '@playwright/test'
