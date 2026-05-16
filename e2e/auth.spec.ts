import { expect, test } from '@playwright/test'
import { SEL } from './helpers/selectors'
import { waitForOtpFromZitadel } from './helpers/zitadel-otp'

/*
 * Auth coverage for the OTP-only login flow. The legacy password tests are gone
 * — there is no password field anywhere in the customer app. Test users get a
 * 6-digit code via email; the happy-path test reads the code straight from
 * Zitadel's event store (via the psql tunnel + AES-CFB decrypt) because the
 * real send path goes through Scaleway on the test instance and isn't
 * interceptable locally.
 *
 * Why not use the authenticatedPage fixture: those tests are about the login
 * UI itself, not about being logged in. The fixture replays a captured session
 * and would bypass the very thing under test.
 */

test.beforeEach(async ({ context }) => {
  /*
   * Cookies only — oidc-client-ts keeps PKCE state in sessionStorage that
   * must survive the Zitadel redirect chain.
   */
  await context.clearCookies()
})

test.describe('Authentication flows (OTP)', () => {
  test('Login via OTP code redirects to menu', async ({ page }) => {
    const email = process.env.E2E_USER_EMAIL
    test.skip(!email, 'E2E_USER_EMAIL must be set')

    const before = new Date()

    await page.goto('/fr/auth/login')

    /* App bounces through Zitadel for an authRequestID, then returns. */
    await page.waitForURL((url) => url.searchParams.has('authRequest') || url.searchParams.has('authRequestID'), {
      timeout: 30_000,
    })

    await page.locator('#auth-email').waitFor({ state: 'visible', timeout: 10_000 })
    /*
     * Wait for hydration before clicking — otherwise the click hits the form
     * before @submit.prevent attaches and the browser does a native GET.
     */
    await page.waitForLoadState('networkidle')
    await page.locator('#auth-email').fill(email!)
    await page.locator(SEL.loginSubmit).click()

    /* OTP input appears only after the backend confirms the code was sent. */
    await page.locator('#auth-code').waitFor({ state: 'visible', timeout: 15_000 })

    const code = await waitForOtpFromZitadel(email!, { after: before })
    await page.locator('#auth-code').fill(code)
    await page.locator(SEL.loginVerify).click()

    await page.waitForURL(/\/fr\/menu(?:\/?$|\?)/u, { timeout: 30_000 })
    await expect(page.locator(SEL.productCard).first()).toBeVisible()
  })

  test('Invalid OTP code shows error', async ({ page }) => {
    const email = process.env.E2E_USER_EMAIL
    test.skip(!email, 'E2E_USER_EMAIL must be set')


    await page.goto('/fr/auth/login')
    await page.waitForURL((url) => url.searchParams.has('authRequest') || url.searchParams.has('authRequestID'), {
      timeout: 30_000,
    })

    await page.locator('#auth-email').waitFor({ state: 'visible', timeout: 10_000 })
    /*
     * Wait for hydration before clicking — otherwise the click hits the form
     * before @submit.prevent attaches and the browser does a native GET.
     */
    await page.waitForLoadState('networkidle')
    await page.locator('#auth-email').fill(email!)
    await page.locator(SEL.loginSubmit).click()

    await page.locator('#auth-code').waitFor({ state: 'visible', timeout: 15_000 })

    /* Six obviously-wrong digits — backend should reject without consulting the event store. */
    await page.locator('#auth-code').fill('000000')
    await page.locator(SEL.loginVerify).click()

    await expect(page.locator(SEL.loginError)).toBeVisible({ timeout: 10_000 })
    await expect(page).toHaveURL(/\/auth\/login/u)
  })

  test('Login page shows SSO buttons and email form', async ({ page }) => {
    await page.goto('/fr/auth/login')
    await page.waitForURL((url) => url.searchParams.has('authRequest') || url.searchParams.has('authRequestID'), {
      timeout: 30_000,
    })

    await page.locator('#auth-email').waitFor({ state: 'visible', timeout: 10_000 })
    await expect(page.getByRole('button', { name: /google/iu })).toBeVisible()
    await expect(page.getByRole('button', { name: /apple/iu })).toBeVisible()
    await expect(page.locator(SEL.loginSubmit)).toBeVisible()
  })

  test('Resend code button is disabled during cooldown', async ({ page }) => {
    const email = process.env.E2E_USER_EMAIL
    test.skip(!email, 'E2E_USER_EMAIL must be set')


    await page.goto('/fr/auth/login')
    await page.waitForURL((url) => url.searchParams.has('authRequest') || url.searchParams.has('authRequestID'), {
      timeout: 30_000,
    })

    await page.locator('#auth-email').waitFor({ state: 'visible', timeout: 10_000 })
    /*
     * Wait for hydration before clicking — otherwise the click hits the form
     * before @submit.prevent attaches and the browser does a native GET.
     */
    await page.waitForLoadState('networkidle')
    await page.locator('#auth-email').fill(email!)
    await page.locator(SEL.loginSubmit).click()

    await page.locator('#auth-code').waitFor({ state: 'visible', timeout: 15_000 })

    /* Cooldown starts at 20s immediately after the code is sent. */
    const resendButton = page.getByRole('button', { name: /\d+s|0:\d/u })
    await expect(resendButton).toBeDisabled()
  })
})
