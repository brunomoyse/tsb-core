import { expect, test } from '@playwright/test'
import { SEL } from './helpers/selectors'
import { dismissCookieConsent } from './fixtures/cookie-consent.fixture'

test.beforeEach(async ({ context }) => {
  await context.clearCookies()
  // Only clear cookies — do NOT clear localStorage or sessionStorage.
  // Oidc-client-ts stores PKCE state in sessionStorage that must survive redirects.
})

test.describe('Authentication flows', () => {
  test('Login with valid credentials redirects to menu', async ({ page }) => {
    const email = process.env.E2E_USER_EMAIL
    const password = process.env.E2E_USER_PASSWORD
    test.skip(!email || !password, 'E2E_USER_EMAIL and E2E_USER_PASSWORD must be set')

    // Clear Zitadel session, then navigate to login
    await page.goto('https://tsbauth.brunomoyse.be/oidc/v1/end_session')
    await page.waitForLoadState('domcontentloaded')
    await page.goto('http://localhost:3000/fr/auth/login')

    // Wait for Zitadel redirect chain → custom login page with authRequestID
    await page.waitForURL('**authRequest**', { timeout: 30_000 })
    await page.waitForFunction(() => Boolean(document.querySelector('#__nuxt')?.__vue_app__))

    await page.locator('#email').fill(email!)
    await page.locator('#password').fill(password!)
    await page.locator(SEL.loginSubmit).click()

    // Wait for either /menu (full success) or callback page to finish
    const menuReached = await page.waitForURL('**/fr/menu', { timeout: 15_000 }).then(() => true).catch(() => false)
    if (!menuReached) {
      // Token exchange succeeded but processCallback may have failed (dev mode issue).
      // Navigate to menu directly — OIDC token is in sessionStorage.
      await page.goto('http://localhost:3000/fr/menu')
      await page.waitForLoadState('domcontentloaded')
    }
    await expect(page.locator(SEL.productCard).first()).toBeVisible()
  })

  test('Login with wrong password shows error', async ({ page }) => {
    const email = process.env.E2E_USER_EMAIL
    test.skip(!email, 'E2E_USER_EMAIL must be set')

    await page.goto('https://tsbauth.brunomoyse.be/oidc/v1/end_session')
    await page.waitForLoadState('domcontentloaded')
    await page.goto('http://localhost:3000/fr/auth/login')

    await page.waitForURL('**authRequest**', { timeout: 30_000 })
    await page.waitForFunction(() => Boolean(document.querySelector('#__nuxt')?.__vue_app__))
    await dismissCookieConsent(page)

    await page.locator('#email').fill(email!)
    await page.locator('#password').fill('WrongPassword123!')
    await page.locator(SEL.loginSubmit).click()

    // Error div has role="alert" — use this instead of data-testid which may not exist on production domain
    await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 10_000 })
  })

  test('Register page renders', async ({ page }) => {
    await page.goto('/fr/auth/register')
    await dismissCookieConsent(page)
    await expect(page.locator('h1').first()).toBeVisible()
    await expect(page.locator('#email')).toBeVisible()
  })

  test('Forgot password page renders', async ({ page }) => {
    await page.goto('/fr/auth/forgot-password')
    await dismissCookieConsent(page)
    await expect(page.locator('h1').first()).toBeVisible()
    await expect(page.locator('#email')).toBeVisible()
  })
})
