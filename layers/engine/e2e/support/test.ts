import { type Page, test as base } from '@playwright/test'
import { existsSync, readFileSync } from 'node:fs'
import type { CapturedOidcState } from './auth-flow'
import { authStateFile } from './paths'

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
  /* OTP test user for this brand; undefined skips specs that log in through the UI. */
  e2eUserEmail: string | undefined
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
export const test = base.extend<BrandOptions & { authenticatedPage: Page }>({
  brand: ['tokyosushi', { option: true }],
  loginAvailable: [true, { option: true }],
  e2eUserEmail: [undefined, { option: true }],
  authenticatedPage: async ({ page, context }, use, testInfo) => {
    const state = loadAuthState(testInfo.config.configFile)
    if (!state) {
      base.skip(true, 'No e2e auth state: set this brand\'s e2e user email (E2E_USER_EMAIL for tokyosushi, YGF_E2E_USER_EMAIL for ygfliege) plus the DB_* and ZITADEL_* vars from support/db-env.ts so globalSetup can capture a session')
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
