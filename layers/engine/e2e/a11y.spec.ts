import { chooseCollection, fillCart, gotoCheckout, gotoMenu, openCart } from './support/order-flow'
import { expect, test } from './support/test'
import { expectAccessible } from './support/a11y'
import { waitForNuxtHydration } from './support/hydration'

/*
 * Automated accessibility checks (axe-core, serious and critical violations fail) of the pages a customer orders
 * through, both brands, on a desktop (the phone twin is mobile-a11y.spec.ts). They run on the mock, with the data
 * of the mock catalog: the same pages, no secret.
 */

test.skip(({ mock }) => !mock, 'needs the mock tsb-service (catalog, session)')

test('the menu has no serious accessibility violation', async ({ page }) => {
  await gotoMenu(page)
  await expectAccessible(page, 'menu')
})

test('the cart has no serious accessibility violation', async ({ page, brand }) => {
  await fillCart(page, [brand === 'tokyosushi' ? 'Edamame' : 'Mochi'])
  const cart = await openCart(page)
  await expect(cart).toBeVisible()
  await expectAccessible(page, 'cart')
})

test('the checkout has no serious accessibility violation', async ({
  authenticatedPage: page,
  brand,
}) => {
  await fillCart(page, [brand === 'tokyosushi' ? 'Edamame' : 'Mochi'])
  await gotoCheckout(page)
  await chooseCollection(page, 'pickup')
  await expectAccessible(page, 'checkout')
})

test('the login page has no serious accessibility violation', async ({ page }) => {
  await page.goto('/fr/auth/login')
  await waitForNuxtHydration(page)
  await expectAccessible(page, 'login')
})

for (const [name, path] of [
  ['the faq', '/fr/faq'],
  ['the terms', '/fr/terms'],
  ['the empty cart page', '/fr/cart'],
] as const) {
  test(`${name} has no serious accessibility violation`, async ({ page }) => {
    await page.goto(path)
    await waitForNuxtHydration(page)
    await expectAccessible(page, name)
  })
}

test('the account page has no serious accessibility violation', async ({
  authenticatedPage: page,
}) => {
  await page.goto('/fr/me')
  await expect(page).toHaveURL(/\/fr\/me(?:[/?#]|$)/u)
  await waitForNuxtHydration(page)
  await expectAccessible(page, 'account')
})
