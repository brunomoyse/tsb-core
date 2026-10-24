import { chooseCollection, fillCart, gotoCheckout, gotoMenu, openCart } from './support/order-flow'
import { expect, test } from './support/test'
import { expectAccessible } from './support/a11y'
import { waitForNuxtHydration } from './support/hydration'

/*
 * The phone twin of a11y.spec.ts: the same pages in the phone layout (floating cart bar and sheet, bottom pay bar,
 * the menu behind the burger), serious and critical axe-core violations fail.
 */

test.skip(({ mock }) => !mock, 'needs the mock tsb-service (catalog, session)')

test('the menu has no serious accessibility violation (phone)', async ({ page }) => {
  await gotoMenu(page)
  await expectAccessible(page, 'menu (phone)')
})

test('the cart sheet has no serious accessibility violation (phone)', async ({ page, brand }) => {
  await fillCart(page, [brand === 'tokyosushi' ? 'Edamame' : 'Mochi'])
  const cart = await openCart(page)
  await expect(cart).toBeVisible()
  await expectAccessible(page, 'cart sheet (phone)')
})

test('the checkout has no serious accessibility violation (phone)', async ({
  authenticatedPage: page,
  brand,
}) => {
  await fillCart(page, [brand === 'tokyosushi' ? 'Edamame' : 'Mochi'])
  await gotoCheckout(page)
  await chooseCollection(page, 'pickup')
  await expectAccessible(page, 'checkout (phone)')
})

test('the login page has no serious accessibility violation (phone)', async ({ page }) => {
  await page.goto('/fr/auth/login')
  await waitForNuxtHydration(page)
  await expectAccessible(page, 'login (phone)')
})

for (const [name, path] of [
  ['the faq', '/fr/faq'],
  ['the terms', '/fr/terms'],
  ['the empty cart page', '/fr/cart'],
] as const) {
  test(`${name} has no serious accessibility violation (phone)`, async ({ page }) => {
    await page.goto(path)
    await waitForNuxtHydration(page)
    await expectAccessible(page, `${name} (phone)`)
  })
}

test('the account page has no serious accessibility violation (phone)', async ({
  authenticatedPage: page,
}) => {
  await page.goto('/fr/me')
  await expect(page).toHaveURL(/\/fr\/me(?:[/?#]|$)/u)
  await waitForNuxtHydration(page)
  await expectAccessible(page, 'account (phone)')
})
