import { type Page, test as base } from '@playwright/test'
import { SEL } from '../helpers/selectors'
import { dismissCookieConsent, waitForNuxtHydration } from './cookie-consent.fixture'

async function login(page: Page): Promise<void> {
  const email = process.env.E2E_USER_EMAIL
  const password = process.env.E2E_USER_PASSWORD

  if (!email || !password) {
    base.skip(true, 'E2E_USER_EMAIL and E2E_USER_PASSWORD must be set')
    return
  }

  // Clear any existing Zitadel session
  await page.goto('https://tsbauth.brunomoyse.be/oidc/v1/end_session')
  await page.waitForLoadState('domcontentloaded')

  // Navigate to login — OIDC flow: app → Zitadel → custom login page with authRequestID
  await page.goto('http://localhost:3000/fr/auth/login')
  await page.waitForURL('**authRequest**', { timeout: 30_000 })

  // Wait for Vue hydration so @submit.prevent handler is attached
  await page.waitForFunction(() => Boolean(document.querySelector('#__nuxt')?.__vue_app__))
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  await page.locator(SEL.loginSubmit).click()

  // After submit: createSession → finalizeOidcAuth → callback page → token exchange → /menu
  // The callback page now falls back to /menu even if processCallback fails.
  await page.waitForURL('**/fr/menu', { timeout: 30_000 })

  await waitForNuxtHydration(page)
  await dismissCookieConsent(page)
}

export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page, context }, use) => {
    await context.clearCookies()
    // Only clear cookies — oidc-client-ts stores PKCE state in sessionStorage
    await login(page)
    await use(page)
  },
})

export { expect } from '@playwright/test'
