import { type BrowserContext, type Page, expect } from '@playwright/test'
import type { MockOptions } from './test'
import { fakeOidcEntry } from '../mock/oidc'
import { SEL } from './selectors'
import { waitForLoginPage } from './auth-flow'

/*
 * Drives the login UI (components/auth/AuthFlow.vue) step by step, for the specs that are about signing in. Each helper
 * waits for what the next step needs, so a spec never sleeps: the form is only submitted once Vue has hydrated (a click
 * before that would be a native GET of the page), and the code input only exists once the backend accepted the address.
 */

/** Opens the login page and waits for the Zitadel round trip to bring back its `?authRequest=`. */
export async function openLogin(page: Page, locale = 'fr'): Promise<void> {
  await page.goto(`/${locale}/auth/login`)
  await waitForLoginPage(page, undefined)
  await page.locator('#auth-email').waitFor({ state: 'visible' })
  await page.waitForLoadState('networkidle')
}

/** Types the address and presses "Continuer" (does not wait for the code step: it may be refused). */
export async function submitEmail(page: Page, email: string): Promise<void> {
  await page.locator('#auth-email').fill(email)
  await page.locator(SEL.loginSubmit).click()
}

/** Address submitted and accepted: the code input is there. */
export async function requestCode(page: Page, email: string): Promise<void> {
  await submitEmail(page, email)
  await expect(page.locator('#auth-code')).toBeVisible()
}

/** Types the 6 digits and presses "Vérifier". */
export async function submitCode(page: Page, code: string): Promise<void> {
  await page.locator('#auth-code').fill(code)
  await page.locator(SEL.loginVerify).click()
}

/** The whole sign-in from the login page, for specs that only need to be signed in through the real flow. */
export async function loginWithCode(page: Page, email: string, code: string): Promise<void> {
  await openLogin(page)
  await requestCode(page, email)
  await submitCode(page, code)
}

/** LocalStorage entries of the OIDC session (oidc-client-ts: `oidc.user:<authority>:<client>`). */
export function sessionEntries(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    Object.keys(localStorage).filter((key) => key.startsWith('oidc.user:')),
  )
}

/**
 * Seeds a faked OIDC session with a chosen lifetime before any page script runs (`expiresInSeconds` negative = a token
 * that expired already, which the app renews with its refresh token on the next navigation). The `authenticatedPage`
 * fixture is the usual way to be signed in; this is for the specs about the session's age.
 */
export async function seedSession(
  context: BrowserContext,
  mock: MockOptions,
  options: { expiresInSeconds?: number } = {},
): Promise<void> {
  const entry = fakeOidcEntry({
    authority: mock.oidcAuthority,
    clientId: mock.oidcClientId,
    ...options,
  })
  await context.addInitScript((pair: [string, string]) => {
    if (localStorage.getItem('e2e-session-seeded')) return
    localStorage.setItem(pair[0], pair[1])
    localStorage.setItem('e2e-session-seeded', '1')
  }, entry)
}
