import { expect, test } from './support/test'
import type { Page } from '@playwright/test'
import {
  loginWithCode,
  openLogin,
  requestCode,
  seedSession,
  sessionEntries,
  submitCode,
} from './support/login'
import { SEL } from './support/selectors'
import { waitForNuxtHydration } from './support/hydration'

/*
 * What happens to the session after (and instead of) a sign-in, against the mock's fake Zitadel: a callback that cannot be
 * honoured, logout, a token that expired or that the server refuses, and the pages that need an account. French UI.
 */

test.beforeEach(({ backend }) => {
  test.skip(!backend.isMock, 'needs the mock Zitadel')
})

/** One simple product in the cart, set to pickup (a guest otherwise meets the delivery-zone gate before the sign-in). */
const addFirstSimpleProduct = async (page: Page) => {
  await page.goto('/fr/menu')
  await waitForNuxtHydration(page)
  await page.locator(`${SEL.simpleProduct} ${SEL.productAddToCart}:not([disabled])`).first().click()
  await expect(page.locator(SEL.cartItem).first()).toBeVisible()
  const pickup = page.locator(SEL.cartOptionPickup)
  if (await pickup.isVisible()) await pickup.click()
}

/** The home page, where logout ends (Zitadel's end_session sends the browser back to the site root). */
const HOME = /localhost:\d+\/fr\/?$/u

/** The signed-in user the app caches in localStorage ('auth', pinia): null once logged out (the key itself may remain). */
const cachedProfile = (page: Page) =>
  page.evaluate(() => {
    const raw = localStorage.getItem('auth')
    return raw ? ((JSON.parse(raw) as { user: unknown }).user ?? null) : null
  })

test.describe('OIDC callback', () => {
  test('a callback whose state the browser never issued is an error page, not a session', async ({
    page,
  }) => {
    await page.goto('/fr/auth/callback?code=forged&state=not-ours')
    await expect(page.getByText("L'authentification a échoué")).toBeVisible()
    expect(await sessionEntries(page)).toHaveLength(0)
    await page.getByRole('link', { name: 'Réessayer' }).click()
    await page.waitForURL(/\/fr\/auth\/login/u)
  })

  test('an error answer from Zitadel (access_denied) is an error page', async ({ page }) => {
    await page.goto('/fr/auth/callback?error=access_denied&state=whatever')
    await expect(page.getByText("L'authentification a échoué")).toBeVisible()
    expect(await sessionEntries(page)).toHaveLength(0)
  })

  test('replaying the callback URL of a finished sign-in does not sign anyone in twice', async ({
    page,
    context,
  }) => {
    let callbackUrl = ''
    page.on('request', (request) => {
      if (request.isNavigationRequest() && request.url().includes('/auth/callback?code='))
        callbackUrl = request.url()
    })
    await loginWithCode(page, 'eva@example.test', '123456')
    await page.waitForURL(/\/fr\/menu/u)
    expect(callbackUrl).not.toBe('')

    // A second window with no session: the code was single use and the state was consumed with it.
    const other = await context.browser()?.newContext({ baseURL: page.url() })
    const replay = await other?.newPage()
    await replay?.goto(callbackUrl)
    await expect(
      replay?.getByText("L'authentification a échoué") ?? page.locator('x'),
    ).toBeVisible()
    await other?.close()
  })

  test('the login page of a signed-in visitor goes straight to the menu', async ({
    authenticatedPage: page,
  }) => {
    await page.goto('/fr/auth/login')
    await page.waitForURL(/\/fr\/menu/u)
  })
})

test.describe('logout', () => {
  test('clears the session and the cached profile, and the account is protected again', async ({
    authenticatedPage: page,
  }) => {
    await page.goto('/fr/me')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Bonjour, Eva')
    // The profile is cached in localStorage ('auth', pinia) next to the OIDC tokens.
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('auth')))
      .toContain('e2e@example.test')

    await page.getByRole('button', { name: 'Déconnexion' }).click()
    await page.waitForURL(HOME)
    expect(await sessionEntries(page)).toHaveLength(0)
    await expect.poll(() => cachedProfile(page)).toBeNull()

    await page.goto('/fr/me')
    await page.waitForURL(/\/fr\/auth\/login\?authRequest=/u)
  })

  test('the /auth/logout page signs out the same way (the navbar link)', async ({
    authenticatedPage: page,
  }) => {
    await page.goto('/fr/menu')
    await waitForNuxtHydration(page)
    await page.goto('/fr/auth/logout')
    await page.waitForURL(HOME)
    expect(await sessionEntries(page)).toHaveLength(0)
    await expect.poll(() => cachedProfile(page)).toBeNull()
  })

  test('keeps the cart: only the account is forgotten', async ({ authenticatedPage: page }) => {
    await addFirstSimpleProduct(page)
    await page.goto('/fr/auth/logout')
    await page.waitForURL(HOME)
    const lines = await page.evaluate(
      () => (JSON.parse(localStorage.getItem('cart') ?? '{}') as { products?: unknown[] }).products,
    )
    expect(lines).toHaveLength(1)
  })
})

test.describe('a session that is old or refused', () => {
  test('an expired token is renewed with the refresh token and the page opens', async ({
    page,
    context,
    mock,
    backend,
  }) => {
    await seedSession(context, mock!, { expiresInSeconds: -60 })
    await page.goto('/fr/me')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Bonjour, Eva')
    expect(page.url()).toContain('/fr/me')
    const grants = (await backend.mock.restCalls('/zitadel')).map((call) => call.body.grant_type)
    expect(grants).toContain('refresh_token')
  })

  test('an expired token whose refresh is refused sends the visitor to login, and back to the page after signing in', async ({
    page,
    context,
    mock,
    backend,
  }) => {
    await seedSession(context, mock!, { expiresInSeconds: -60 })
    await backend.mock.scenario({ rejectSession: true })
    await page.goto('/fr/me/orders')
    await page.waitForURL(/\/fr\/auth\/login\?authRequest=/u)
    expect(await sessionEntries(page)).toHaveLength(0)

    await backend.mock.scenario({ rejectSession: false })
    await page.locator('#auth-email').waitFor()
    await page.waitForLoadState('networkidle')
    await requestCode(page, 'eva@example.test')
    await submitCode(page, '123456')
    await page.waitForURL(/\/fr\/me\/orders/u)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Toutes mes commandes')
    expect(await sessionEntries(page)).toHaveLength(1)
  })

  /*
   * BUG (found by this spec, not fixed: product decision): the server refuses a token the browser still believes in
   * (revoked, user deleted, clock skew). gqlFetch's attemptRefresh sends the customer to `/auth/login?session=expired` only
   * when silentRenew() THROWS, but useOidc.silentRenew never throws: it wipes the session and returns null. So the
   * customer stays on an error page ("Impossible de charger vos commandes", Retry that cannot work, no token any more)
   * and is never asked to sign in again. Expected: the login page with the session-expired notice.
   * Not a one-line fix: an anonymous visitor's UNAUTHENTICATED answers (checkout) go through the same path and must
   * not be thrown at the login page.
   */
  test.fail(
    'a token the server refuses mid-session sends the customer to login with the expired notice',
    async ({ authenticatedPage: page, backend }) => {
      await page.goto('/fr/me')
      await expect(page.getByRole('heading', { level: 1 })).toContainText('Bonjour, Eva')
      await backend.mock.scenario({ rejectSession: true })
      await page.getByRole('link', { name: /Tout voir/u }).click()
      await page.waitForURL(/\/auth\/login/u, { timeout: 5_000 })
      await expect(page.getByText('Votre session a expiré')).toBeVisible()
    },
  )

  test('what a refused token does today: the orders page shows its load error and the session is dropped', async ({
    authenticatedPage: page,
    backend,
  }) => {
    await page.goto('/fr/me')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Bonjour, Eva')
    await backend.mock.scenario({ rejectSession: true })
    await page.getByRole('link', { name: /Tout voir/u }).click()
    await expect(page.getByTestId('orders-load-error')).toBeVisible()
    expect(await sessionEntries(page)).toHaveLength(0)
  })
})

test.describe('pages that need an account', () => {
  for (const path of ['/fr/me', '/fr/me/orders']) {
    test(`${path} sends an anonymous visitor to the login page and remembers where to return`, async ({
      page,
    }) => {
      await page.goto(path)
      await page.waitForURL(/\/fr\/auth\/login\?authRequest=/u)
      await expect(page.locator('#auth-email')).toBeVisible()
      expect(await page.evaluate(() => sessionStorage.getItem('oidc_return_to'))).toBe(path)
    })
  }

  test('the checkout is open to a guest but asks for the sign-in in place, cart intact', async ({
    page,
    backend,
  }) => {
    await addFirstSimpleProduct(page)
    await page.goto('/fr/checkout')
    await expect(page.getByText("Plus qu'une étape, connectez-vous")).toBeVisible()
    await expect(page.getByText('Votre panier est sauvegardé')).toBeVisible()
    await expect(page.locator(SEL.checkoutPlaceOrder)).toHaveCount(0)
    expect(await page.evaluate(() => location.pathname)).toBe('/fr/checkout')
    expect(await backend.mock.createdOrders()).toHaveLength(0)
  })

  test('signing in from the checkout brings the customer back to it with the same cart', async ({
    page,
  }) => {
    await addFirstSimpleProduct(page)
    const before = await page.evaluate(() => localStorage.getItem('cart'))
    await page.goto('/fr/checkout')
    await page.locator('#auth-email').waitFor()
    await page.waitForLoadState('networkidle')
    await requestCode(page, 'eva@example.test')
    await submitCode(page, '123456')

    await page.waitForURL(/\/fr\/checkout/u)
    await expect(page.locator(`${SEL.checkoutPlaceOrder}:visible`).first()).toBeVisible()
    expect(await page.evaluate(() => localStorage.getItem('cart'))).toBe(before)
    expect(await sessionEntries(page)).toHaveLength(1)
  })
})

test.describe('sign in again after a logout', () => {
  test('a full cycle: sign in, sign out, sign in as someone else', async ({ page, backend }) => {
    await loginWithCode(page, 'first@example.test', '123456')
    await page.waitForURL(/\/fr\/menu/u)
    await page.goto('/fr/auth/logout')
    await page.waitForURL(HOME)
    expect(await sessionEntries(page)).toHaveLength(0)

    await openLogin(page)
    await requestCode(page, 'second@example.test')
    await submitCode(page, '123456')
    await page.waitForURL(/\/fr\/menu/u)
    expect(await sessionEntries(page)).toHaveLength(1)
    const requests = await backend.mock.restCalls('/auth/session/otp/request')
    expect(requests.map((call) => call.body.loginName)).toEqual([
      'first@example.test',
      'second@example.test',
    ])
  })
})
