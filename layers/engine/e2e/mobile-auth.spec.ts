import { addSimpleProductToCart, guestCheckoutSignIn, openMobileMenu } from './support/nav'
import { expect, test } from './support/test'
import { openLogin, requestCode, sessionEntries, submitCode, submitEmail } from './support/login'
import { SEL } from './support/selectors'
import { message } from './support/i18n'
import { waitForNuxtHydration } from './support/hydration'

/*
 * Signing in and out on a phone (Pixel 5, 393 px), both brands, against the mock's fake Zitadel: the entries of the phone
 * menu, the fields that bring up the right keyboard and the one-time-code autofill, errors that land on screen, and the
 * round trips from a protected page and from the checkout. The failure paths of the flow itself are in auth-otp.spec.ts.
 */

const EMAIL = 'eva@example.test'

test.beforeEach(({ backend }) => {
  test.skip(!backend.isMock, 'needs the mock sign-in endpoints')
})

test('the phone menu offers "Connexion" to a visitor and "Mon compte" + "Déconnexion" once signed in', async ({
  page,
  brand,
}) => {
  await page.goto('/fr/menu')
  await waitForNuxtHydration(page)
  await openMobileMenu(page)
  const menu = page.locator('#mobile-menu')
  await expect(
    menu.getByRole('link', { name: message(brand, 'fr', 'nav.login'), exact: true }),
  ).toBeVisible()
  await expect(menu.getByRole('link', { name: message(brand, 'fr', 'nav.myAccount') })).toHaveCount(
    0,
  )

  await menu.getByRole('link', { name: message(brand, 'fr', 'nav.login'), exact: true }).click()
  await page.waitForURL(/\/fr\/auth\/login\?authRequest=/u)
  await page.locator('#auth-email').waitFor()
  await page.waitForLoadState('networkidle')
  await requestCode(page, EMAIL)
  await submitCode(page, '123456')
  await page.waitForURL(/\/fr\/menu/u)

  await waitForNuxtHydration(page)
  await openMobileMenu(page)
  await expect(
    page.locator('#mobile-menu').getByRole('link', { name: message(brand, 'fr', 'nav.myAccount') }),
  ).toBeVisible()
  await expect(
    page
      .locator('#mobile-menu')
      .getByRole('link', { name: message(brand, 'fr', 'nav.login'), exact: true }),
  ).toHaveCount(0)
})

test('the fields bring up the right keyboard, and the code field offers the autofilled SMS/e-mail code', async ({
  page,
}) => {
  await openLogin(page)
  const email = page.locator('#auth-email')
  await expect(email).toHaveAttribute('type', 'email')
  await expect(email).toHaveAttribute('autocomplete', 'email')
  // 16 px or more: iOS zooms the page into a smaller field on focus.
  expect(
    await email.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
  ).toBeGreaterThanOrEqual(16)

  await requestCode(page, EMAIL)
  const code = page.locator('#auth-code')
  await expect(code).toHaveAttribute('inputmode', 'numeric')
  await expect(code).toHaveAttribute('autocomplete', 'one-time-code')
  await expect(code).toHaveAttribute('maxlength', '6')
  // The cursor is already in it: the keyboard stays up between the two steps.
  await expect(code).toBeFocused()
  expect(
    await code.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
  ).toBeGreaterThanOrEqual(16)
})

test('a wrong code puts its message on screen, next to the field', async ({ page }) => {
  await openLogin(page)
  await requestCode(page, EMAIL)
  await submitCode(page, '000000')
  await expect(page.locator(SEL.loginError)).toBeInViewport({ ratio: 1 })
  await expect(page.locator('#auth-code')).toBeInViewport({ ratio: 1 })
})

test('an address that cannot be reached is flagged on the field, in view', async ({
  page,
  backend,
}) => {
  await backend.mock.scenario({ otp: { requestFailure: 'invalid_email' } })
  await openLogin(page)
  await submitEmail(page, 'typo@hotmail.coma')
  await expect(page.locator('#auth-email-error')).toBeInViewport({ ratio: 1 })
  await expect(page.locator('#auth-email')).toBeFocused()
})

test("the whole sign-in works with the keyboard's Enter key on both steps", async ({ page }) => {
  await openLogin(page)
  await page.locator('#auth-email').fill(EMAIL)
  await page.locator('#auth-email').press('Enter')
  await page.locator('#auth-code').waitFor()
  await page.locator('#auth-code').fill('123456')
  await page.locator('#auth-code').press('Enter')
  await page.waitForURL(/\/fr\/menu/u)
  expect(await sessionEntries(page)).toHaveLength(1)
})

test('a protected link sent to a phone: sign in, and land on that page', async ({ page }) => {
  await page.goto('/fr/me/orders')
  await page.waitForURL(/\/fr\/auth\/login\?authRequest=/u)
  await page.locator('#auth-email').waitFor()
  await page.waitForLoadState('networkidle')
  await requestCode(page, EMAIL)
  await submitCode(page, '123456')
  await page.waitForURL(/\/fr\/me\/orders/u)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Toutes mes commandes')
})

test('the session survives a reload and the account is one tap away in the menu', async ({
  authenticatedPage: page,
  brand,
}) => {
  await page.goto('/fr/menu')
  await page.reload()
  await waitForNuxtHydration(page)
  await openMobileMenu(page)
  await page
    .locator('#mobile-menu')
    .getByRole('link', { name: message(brand, 'fr', 'nav.myAccount') })
    .click()
  await page.waitForURL(/\/fr\/me$/u)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Bonjour, Eva')
})

test('logging out from the phone menu clears the session and the menu offers "Connexion" again', async ({
  authenticatedPage: page,
  brand,
}) => {
  await page.goto('/fr/menu')
  await waitForNuxtHydration(page)
  await openMobileMenu(page)
  const logout = page
    .locator('#mobile-menu')
    .getByRole('link', { name: message(brand, 'fr', 'nav.logout') })
  // The YGF phone menu has no logout entry: the account page carries the button.
  test.skip((await logout.count()) === 0, 'this brand logs out from the account page only')
  await logout.click()
  await page.waitForURL(/localhost:\d+\/fr\/?$/u)
  expect(await sessionEntries(page)).toHaveLength(0)
  await waitForNuxtHydration(page)
  await openMobileMenu(page)
  await expect(
    page
      .locator('#mobile-menu')
      .getByRole('link', { name: message(brand, 'fr', 'nav.login'), exact: true }),
  ).toBeVisible()
})

test('logging out from the account page, the way the phone menu of every brand allows', async ({
  authenticatedPage: page,
  brand,
}) => {
  await page.goto('/fr/me')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Bonjour')
  await page.getByRole('button', { name: message(brand, 'fr', 'nav.logout') }).click()
  await page.waitForURL(/localhost:\d+\/fr\/?$/u)
  expect(await sessionEntries(page)).toHaveLength(0)
})

test('from the checkout, a guest signs in on the spot and keeps the cart', async ({
  page,
  brand,
}) => {
  await addSimpleProductToCart(page, '/fr/menu')
  const before = await page.evaluate(() => localStorage.getItem('cart'))
  await guestCheckoutSignIn(
    page,
    message(brand, 'fr', 'delivery.gate.title'),
    message(brand, 'fr', 'delivery.modal.pickupTab'),
  )
  await page.waitForLoadState('networkidle')
  await requestCode(page, EMAIL)
  await submitCode(page, '123456')
  await page.waitForURL(/\/fr\/checkout/u)
  await expect(page.locator(`${SEL.checkoutPlaceOrder}:visible`).first()).toBeVisible()
  expect(await sessionEntries(page)).toHaveLength(1)
  // Pickup was chosen at the gate: it is still what the checkout shows.
  const cart = JSON.parse((await page.evaluate(() => localStorage.getItem('cart'))) ?? '{}') as {
    products?: unknown[]
  }
  expect(cart.products).toHaveLength(
    (JSON.parse(before ?? '{}') as { products?: unknown[] }).products?.length ?? -1,
  )
})
