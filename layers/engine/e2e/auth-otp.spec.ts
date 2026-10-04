import { expect, test } from './support/test'
import {
  loginWithCode,
  openLogin,
  requestCode,
  sessionEntries,
  submitCode,
  submitEmail,
} from './support/login'
import { SEL } from './support/selectors'
import { chooseLocale } from './support/locale'
import { waitForNuxtHydration } from './support/hydration'

/*
 * The OTP sign-in against the mock's fake Zitadel and /auth/session/otp/* endpoints (mock/auth.ts, mock/zitadel.ts): the
 * paths auth.spec.ts cannot reach on a real server (wrong or expired code, new account, throttling, a refused address)
 * and what happens around them (where the customer lands, the session that results). French UI, both brands.
 */

const EMAIL = 'eva@example.test'

test.describe('OTP sign-in', () => {
  test.beforeEach(({ backend }) => {
    test.skip(!backend.isMock, 'needs the mock sign-in endpoints')
  })

  test('a valid code signs in: session stored, account reachable, REST calls in order', async ({
    page,
    backend,
  }) => {
    await loginWithCode(page, EMAIL, '123456')
    await page.waitForURL(/\/fr\/menu(?:\/?$|\?)/u)

    expect(await sessionEntries(page)).toHaveLength(1)
    const calls = (await backend.mock.restCalls('/auth/')).map((call) => call.path)
    expect(calls).toEqual([
      '/auth/session/otp/request',
      '/auth/session/otp/verify',
      '/auth/finalize',
    ])
    const [request, verify] = await backend.mock.restCalls('/auth/session/otp')
    expect(request?.body).toMatchObject({ loginName: EMAIL, lang: 'fr' })
    expect(verify?.body).toMatchObject({ code: '123456' })

    // Signed in for real: the account page greets the user the token belongs to.
    await page.goto('/fr/me')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Bonjour, Eva')
  })

  test('a wrong code keeps the code step open with an error, and the right one still works', async ({
    page,
  }) => {
    await openLogin(page)
    await requestCode(page, EMAIL)

    await submitCode(page, '000000')
    await expect(page.locator(SEL.loginError)).toContainText('Code invalide ou expiré')
    await expect(page).toHaveURL(/\/auth\/login/u)
    await expect(page.locator('#auth-code')).toBeVisible()
    expect(await sessionEntries(page)).toHaveLength(0)

    await submitCode(page, '123456')
    await page.waitForURL(/\/fr\/menu/u)
    expect(await sessionEntries(page)).toHaveLength(1)
  })

  test('the verify button needs the 6 digits', async ({ page }) => {
    await openLogin(page)
    await requestCode(page, EMAIL)
    await page.locator('#auth-code').fill('12345')
    await expect(page.locator(SEL.loginVerify)).toBeDisabled()
    await page.locator('#auth-code').fill('123456')
    await expect(page.locator(SEL.loginVerify)).toBeEnabled()
  })

  test('an expired code is refused until a resend; the resend unlocks after the cooldown', async ({
    page,
    backend,
  }) => {
    // The countdown is a real 20 s timer: drive it with the browser clock instead of waiting.
    await page.clock.install()
    await backend.mock.scenario({ otp: { codeExpired: true } })
    await openLogin(page)
    await requestCode(page, EMAIL)

    await submitCode(page, '123456')
    await expect(page.locator(SEL.loginError)).toContainText('Code invalide ou expiré')

    const resend = page.getByRole('button', { name: /Renvoyer/u })
    await expect(resend).toBeDisabled()
    await expect(resend).toContainText('Renvoyer dans')
    await page.clock.runFor(21_000)
    await expect(resend).toBeEnabled()
    await expect(resend).toHaveText('Renvoyer le code')

    await resend.click()
    // A new cooldown starts, and the mock issued a fresh code.
    await expect(resend).toBeDisabled()
    await expect
      .poll(async () => (await backend.mock.restCalls('/auth/session/otp/resend')).length)
      .toBe(1)

    await submitCode(page, '123456')
    await page.waitForURL(/\/fr\/menu/u)
  })

  test('"Retour" goes back to the address step and a different address starts a new session', async ({
    page,
    backend,
  }) => {
    await openLogin(page)
    await requestCode(page, EMAIL)
    await page.getByRole('button', { name: 'Retour' }).click()
    await expect(page.locator('#auth-email')).toBeVisible()
    await requestCode(page, 'other@example.test')
    await submitCode(page, '123456')
    await page.waitForURL(/\/fr\/menu/u)

    const requests = await backend.mock.restCalls('/auth/session/otp/request')
    expect(requests.map((call) => call.body.loginName)).toEqual([EMAIL, 'other@example.test'])
  })

  test('a new account is asked for its name before it is signed in', async ({ page, backend }) => {
    await backend.mock.scenario({ otp: { newAccount: true } })
    await openLogin(page)
    await requestCode(page, 'new@example.test')
    await submitCode(page, '123456')

    // Three steps now, and no session until the name is saved.
    await expect(page.locator('#auth-firstname')).toBeVisible()
    expect(await sessionEntries(page)).toHaveLength(0)
    const submit = page
      .locator('form')
      .filter({ has: page.locator('#auth-firstname') })
      .locator('button[type="submit"]')
    await page.locator('#auth-firstname').fill('Nina')
    await page.locator('#auth-lastname').fill('Neuve')
    await submit.click()

    await page.waitForURL(/\/fr\/menu/u)
    expect(await sessionEntries(page)).toHaveLength(1)
    const calls = (await backend.mock.restCalls('/auth/')).map((call) => call.path)
    expect(calls).toEqual([
      '/auth/session/otp/request',
      '/auth/session/otp/verify',
      '/auth/session/otp/complete-profile',
      '/auth/finalize',
    ])
    const [profile] = await backend.mock.restCalls('/auth/session/otp/complete-profile')
    expect(profile?.body).toMatchObject({ firstName: 'Nina', lastName: 'Neuve' })
    await page.goto('/fr/me')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Bonjour, Nina')
  })

  test('a malformed address is caught in the form: no request, the field is flagged', async ({
    page,
    backend,
  }) => {
    await openLogin(page)
    await submitEmail(page, 'pas-un-email')
    await expect(page.locator('#auth-email')).toHaveAttribute('aria-invalid', 'true')
    await expect(page.locator('#auth-email-error')).toContainText('adresse e-mail valide')
    expect(await backend.mock.restCalls('/auth/')).toHaveLength(0)

    // Typing again clears the flag so Enter is never blocked by a stale error.
    await page.locator('#auth-email').fill(EMAIL)
    await expect(page.locator('#auth-email-error')).toHaveCount(0)
  })

  test('an address that cannot receive mail is flagged on the field itself', async ({
    page,
    backend,
  }) => {
    await backend.mock.scenario({ otp: { requestFailure: 'invalid_email' } })
    await openLogin(page)
    await submitEmail(page, 'typo@hotmail.coma')
    await expect(page.locator('#auth-email-error')).toContainText("Impossible d'envoyer un code")
    await expect(page.locator('#auth-code')).toHaveCount(0)
    await expect(page.locator('#auth-email')).toBeFocused()
  })

  for (const [failure, message] of [
    ['rate_limited', 'Trop de tentatives'],
    ['server', 'Le serveur est temporairement indisponible'],
  ] as const) {
    test(`a ${failure} answer to the code request shows its own banner and stays on the address step`, async ({
      page,
      backend,
    }) => {
      await backend.mock.scenario({ otp: { requestFailure: failure } })
      await openLogin(page)
      await submitEmail(page, EMAIL)
      await expect(page.locator(SEL.loginError)).toContainText(message)
      await expect(page.locator('#auth-code')).toHaveCount(0)

      // Once the incident is over the same form works.
      await backend.mock.scenario({ otp: { requestFailure: null } })
      await page.locator(SEL.loginSubmit).click()
      await expect(page.locator('#auth-code')).toBeVisible()
    })
  }

  test('a throttled verify and a failing resend are reported, not swallowed', async ({
    page,
    backend,
  }) => {
    await page.clock.install()
    await openLogin(page)
    await requestCode(page, EMAIL)

    await backend.mock.scenario({ otp: { verifyFailure: 'rate_limited' } })
    await submitCode(page, '123456')
    await expect(page.locator(SEL.loginError)).toContainText('Trop de tentatives')

    await backend.mock.scenario({ otp: { verifyFailure: 'server', resendFailure: 'server' } })
    await submitCode(page, '123456')
    await expect(page.locator(SEL.loginError)).toContainText('temporairement indisponible')

    await page.clock.runFor(21_000)
    await page.getByRole('button', { name: 'Renvoyer le code' }).click()
    await expect(page.locator(SEL.loginError)).toContainText('temporairement indisponible')
    expect(await sessionEntries(page)).toHaveLength(0)
  })
})

test.describe('where the sign-in leads', () => {
  test.beforeEach(({ backend }) => {
    test.skip(!backend.isMock, 'needs the mock sign-in endpoints')
  })

  test('a protected page sends an anonymous visitor to login and back to that page afterwards', async ({
    page,
  }) => {
    await page.goto('/fr/me/orders?followOrder=x')
    await page.waitForURL(/\/fr\/auth\/login\?authRequest=/u)
    await page.locator('#auth-email').waitFor()
    await page.waitForLoadState('networkidle')
    await requestCode(page, EMAIL)
    await submitCode(page, '123456')

    await page.waitForURL(/\/fr\/me\/orders\?followOrder=x/u)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Toutes mes commandes')
  })

  test('with items in the cart the sign-in lands on the checkout', async ({ page }) => {
    await page.goto('/fr/menu')
    await waitForNuxtHydration(page)
    await page
      .locator(`${SEL.simpleProduct} ${SEL.productAddToCart}:not([disabled])`)
      .first()
      .click()
    await expect(page.locator(SEL.cartItem).first()).toBeVisible()

    await page.goto('/fr/auth/login')
    await page.waitForURL(/authRequest=/u)
    await page.locator('#auth-email').waitFor()
    await page.waitForLoadState('networkidle')
    await requestCode(page, EMAIL)
    await submitCode(page, '123456')
    await page.waitForURL(/\/fr\/checkout/u)
  })

  test('a Dutch visitor keeps Dutch through the whole round trip', async ({
    page,
    context,
    baseURL,
    backend,
  }) => {
    await chooseLocale(context, baseURL ?? '', 'nl')
    await page.goto('/nl/me')
    await page.waitForURL(/\/nl\/auth\/login\?authRequest=/u)
    await page.locator('#auth-email').waitFor()
    await page.waitForLoadState('networkidle')
    await requestCode(page, EMAIL)
    await submitCode(page, '123456')
    await page.waitForURL(/\/nl\/me/u)
    const [request] = await backend.mock.restCalls('/auth/session/otp/request')
    expect(request?.body.lang).toBe('nl')
  })
})
