import { layoutShifts, totalShift, trackLayoutShifts } from './support/layout-shift'
import { settleNuxt, waitForNuxtHydration, watchHydrationMismatches } from './support/hydration'
import { addSimpleProductToCart } from './support/nav'
import { expect, test } from './support/test'

/*
 * A signed-in customer reloading their account page on a phone, both brands: the first client render is the server's page
 * (no user: the session and the persisted profile are in localStorage), so Vue has nothing to repair ("Hydration completed
 * but contains mismatches" = a second render of the whole page on every visit), and the profile that appears after mount
 * does not move anything (CLS < 0.01) at the narrowest widths real phones have.
 */

test.beforeEach(({ backend }) => {
  test.skip(!backend.isMock, 'needs the mock API')
})

for (const [width, height] of [
  [320, 568],
  [390, 844],
] as const)
  test(`reloading /me signed in hydrates cleanly and does not shift at ${width}x${height}`, async ({
    authenticatedPage: page,
    backend,
  }) => {
    await page.setViewportSize({ width, height })
    await backend.mock.user({ phoneNumber: '+32470123456', address: 'place-home' })
    const mismatches = watchHydrationMismatches(page)
    await trackLayoutShifts(page)
    // Any page first: the profile is persisted (localStorage "auth") once the app has loaded it.
    await page.goto('/fr/menu')
    await waitForNuxtHydration(page)
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('auth') ?? ''))
      .toContain('e2e@')
    await page.goto('/fr/me')
    await waitForNuxtHydration(page)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Bonjour')
    await expect(page.getByText('+32470123456')).toBeVisible()
    expect(mismatches()).toEqual([])
    const shifts = await layoutShifts(page)
    expect(totalShift(shifts), `/me moved: ${JSON.stringify(shifts)}`).toBeLessThan(0.01)
  })

// The pages that read the persisted profile or the cart (header account button, cart bar and badge, checkout's sign-in step).
test('every page of a signed-in customer with a cart hydrates without a mismatch on a phone', async ({
  authenticatedPage: page,
  backend,
}) => {
  test.setTimeout(120_000)
  await backend.mock.user({ phoneNumber: '+32470123456', address: 'place-home' })
  const mismatches = watchHydrationMismatches(page)
  await addSimpleProductToCart(page, '/fr/menu')
  await expect.poll(() => page.evaluate(() => localStorage.getItem('auth') ?? '')).toContain('e2e@')
  for (const path of [
    '/fr',
    '/fr/menu',
    '/fr/cart',
    '/fr/checkout',
    '/fr/me',
    '/fr/me/orders',
    '/fr/contact',
  ]) {
    await page.goto(path)
    await settleNuxt(page)
    await page.locator('main').first().waitFor()
  }
  expect(mismatches(), 'server and client rendered different DOM').toEqual([])
})
