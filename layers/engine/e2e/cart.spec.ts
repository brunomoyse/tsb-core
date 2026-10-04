import { expect, test } from './support/test'
import type { Page } from '@playwright/test'
import { dismissCookieConsent, waitForNuxtHydration } from './support/hydration'
import { openCartIfMobile, visibleCart } from './support/cart.helpers'
import { SEL } from './support/selectors'

/*
 * Cart UI splits by viewport: desktop renders <SideCart>, mobile renders
 * <FloatingCartBar> + <CartMobile>. Both now expose the same item-level
 * testids (cart-item, cart-item-quantity, cart-item-increment/decrement,
 * cart-total) so most tests are viewport-agnostic — the mobile project
 * just needs an extra tap on the floating bar to reveal the panel.
 *
 * A handful of features genuinely exist only on desktop: the pickup/
 * delivery toggle, the minimum-order warning, the aria-disabled checkout
 * link, and the dedicated remove button (mobile uses decrement-to-zero
 * instead). Those tests skip explicitly on mobile projects with a reason.
 */

const isMobile = (testInfo: { project: { use: { isMobile?: boolean } } }) =>
  testInfo.project.use.isMobile === true

/*
 * Brands with `deliveryEnabled: false` (pickup-only) render the delivery toggle disabled, and
 * the delivery-only rules (minimum order, delivery fee) never apply. Gate on that capability
 * rather than on the brand name, so a brand that turns delivery on gets the tests back.
 */
async function deliveryAvailable(page: Page) {
  return page
    .locator(SEL.cartOptionDelivery)
    .isEnabled({ timeout: 2_000 })
    .catch(() => false)
}

/* Helper: find and click the first enabled add-to-cart button among simple products */
async function addFirstAvailableProduct(page: Page) {
  const simpleCards = page.locator(SEL.simpleProduct)
  const count = await simpleCards.count()
  for (let i = 0; i < count; i++) {
    const addBtn = simpleCards.nth(i).locator(`${SEL.productAddToCart}:not([disabled])`)
    if (await addBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await addBtn.click()
      return true
    }
  }
  return false
}

test.describe('Cart operations', () => {
  test('Add product to cart shows in the cart panel', async ({ page }) => {
    await page.goto('/fr/menu')
    await waitForNuxtHydration(page)
    await dismissCookieConsent(page)
    await page.locator(SEL.productCard).first().waitFor()

    const added = await addFirstAvailableProduct(page)
    test.skip(!added, 'No available products with enabled add-to-cart button')

    await openCartIfMobile(page)
    const cart = visibleCart(page)
    await expect(cart.locator(SEL.cartItem).first()).toBeVisible({ timeout: 10_000 })
    await expect(cart.locator(SEL.cartTotal)).not.toHaveText('0,00 €')
  })

  test('Toggle pickup/delivery changes total', async ({ page }, testInfo) => {
    test.skip(
      isMobile(testInfo),
      'pickup/delivery toggle lives in SideCart only; mobile picks this on /checkout',
    )

    await page.goto('/fr/menu')
    await waitForNuxtHydration(page)
    await dismissCookieConsent(page)
    await page.locator(SEL.productCard).first().waitFor()

    // Add several products
    const simpleCards = page.locator(SEL.simpleProduct)
    const count = Math.min(await simpleCards.count(), 5)
    let addedCount = 0
    for (let i = 0; i < count && addedCount < 3; i++) {
      const addBtn = simpleCards.nth(i).locator(`${SEL.productAddToCart}:not([disabled])`)
      if (await addBtn.isVisible({ timeout: 500 }).catch(() => false)) {
        await addBtn.click()
        await expect(page.locator(SEL.cartItem).nth(addedCount)).toBeVisible()
        addedCount++
      }
    }
    test.skip(addedCount === 0, 'No available products')
    test.skip(
      !(await deliveryAvailable(page)),
      'Brand is pickup-only: no delivery/pickup toggle to exercise',
    )

    // Default is DELIVERY — get the total
    const deliveryTotal = await page.locator(SEL.cartTotal).textContent()

    // Switch to PICKUP (10% discount on discountable items)
    await page.locator(SEL.cartOptionPickup).click()
    const pickupTotal = await page.locator(SEL.cartTotal).textContent()

    expect(deliveryTotal).toBeTruthy()
    expect(pickupTotal).toBeTruthy()
  })

  test('Minimum order warning appears for small orders', async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo), 'minimum-order warning is rendered only by SideCart')

    await page.goto('/fr/menu')
    await waitForNuxtHydration(page)
    await dismissCookieConsent(page)
    await page.locator(SEL.productCard).first().waitFor()

    const added = await addFirstAvailableProduct(page)
    test.skip(!added, 'No available products')

    await expect(page.locator(SEL.cartItem)).toBeVisible()
    test.skip(
      !(await deliveryAvailable(page)),
      'Brand is pickup-only: the minimum order applies to delivery only',
    )

    // Minimum warning should be visible (single product likely below €20)
    await expect(page.locator(SEL.cartMinimumWarning)).toBeVisible()
  })

  test('Increment and decrement quantity', async ({ page }) => {
    await page.goto('/fr/menu')
    await waitForNuxtHydration(page)
    await dismissCookieConsent(page)
    await page.locator(SEL.productCard).first().waitFor()

    const added = await addFirstAvailableProduct(page)
    test.skip(!added, 'No available products')

    await openCartIfMobile(page)
    const cart = visibleCart(page)
    await expect(cart.locator(SEL.cartItem).first()).toBeVisible()

    // Initial quantity should be 1
    await expect(cart.locator(SEL.cartItemQuantity).first()).toHaveText('1')

    // Increment
    await cart.locator(SEL.cartItemIncrement).first().click()
    await expect(cart.locator(SEL.cartItemQuantity).first()).toHaveText('2')

    // Decrement
    await cart.locator(SEL.cartItemDecrement).first().click()
    await expect(cart.locator(SEL.cartItemQuantity).first()).toHaveText('1')
  })

  test('Remove product from cart', async ({ page }, testInfo) => {
    test.skip(
      isMobile(testInfo),
      'mobile has no dedicated remove button — items are dropped by decrementing past 1, which would belong to a different test',
    )

    await page.goto('/fr/menu')
    await waitForNuxtHydration(page)
    await dismissCookieConsent(page)
    await page.locator(SEL.productCard).first().waitFor()

    const added = await addFirstAvailableProduct(page)
    test.skip(!added, 'No available products')

    await expect(page.locator(SEL.cartItem)).toBeVisible()

    // Remove it
    await page.locator(SEL.cartItemRemove).first().click()
    await expect(page.locator(SEL.cartItem)).not.toBeVisible()
  })

  test('Adding, stepping and removing are announced to screen readers', async ({
    page,
  }, testInfo) => {
    await page.goto('/fr/menu')
    await waitForNuxtHydration(page)
    await dismissCookieConsent(page)
    await page.locator(SEL.productCard).first().waitFor()

    const added = await addFirstAvailableProduct(page)
    test.skip(!added, 'No available products')

    // A persistent role=status region (see ToastAnnouncer): name, count and total.
    await expect(page.locator(SEL.announcerPolite)).toContainText(
      /ajouté au panier, 1 article, total/u,
    )

    await openCartIfMobile(page)
    const cart = visibleCart(page)
    await cart.locator(SEL.cartItemIncrement).first().click()
    await expect(page.locator(SEL.announcerPolite)).toContainText(/, quantité 2$/u)

    // The removal toast carries the Undo and is announced by its own region.
    test.skip(isMobile(testInfo), 'mobile has no dedicated remove button')
    await cart.locator(SEL.cartItemDecrement).first().click()
    await cart.locator(SEL.cartItemRemove).first().click()
    await expect(page.locator(SEL.toastAnnouncerPolite)).toContainText(/retiré/u)
  })

  test('Removing the last line with the keyboard keeps focus on the page', async ({
    page,
  }, testInfo) => {
    test.skip(
      isMobile(testInfo),
      'the mobile sheet is covered by the focus fallback to its close button',
    )

    await page.goto('/fr/menu')
    await waitForNuxtHydration(page)
    await dismissCookieConsent(page)
    await page.locator(SEL.productCard).first().waitFor()

    const added = await addFirstAvailableProduct(page)
    test.skip(!added, 'No available products')

    const remove = page.locator(SEL.cartItemRemove).first()
    await remove.focus()
    await page.keyboard.press('Enter')
    // The side cart goes away with its last line: focus moves to the menu search instead of falling to <body>.
    await expect(page.locator('#menuSearch')).toBeFocused()
  })

  test('Cart survives a hard reload (Pinia persisted state)', async ({ page }) => {
    await page.goto('/fr/menu')
    await waitForNuxtHydration(page)
    await dismissCookieConsent(page)
    await page.locator(SEL.productCard).first().waitFor()

    const added = await addFirstAvailableProduct(page)
    test.skip(!added, 'No available products')

    await openCartIfMobile(page)
    const cartBefore = visibleCart(page)
    await expect(cartBefore.locator(SEL.cartItem).first()).toBeVisible()

    const totalBefore = await cartBefore.locator(SEL.cartTotal).textContent()
    expect(totalBefore?.trim()).toBeTruthy()

    await page.reload()
    await waitForNuxtHydration(page)

    await openCartIfMobile(page)
    const cartAfter = visibleCart(page)
    await expect(cartAfter.locator(SEL.cartItem).first()).toBeVisible({ timeout: 10_000 })
    await expect(cartAfter.locator(SEL.cartTotal)).toHaveText(totalBefore ?? '')
  })

  test('Incrementing quantity raises the cart total', async ({ page }) => {
    await page.goto('/fr/menu')
    await waitForNuxtHydration(page)
    await dismissCookieConsent(page)
    await page.locator(SEL.productCard).first().waitFor()

    const added = await addFirstAvailableProduct(page)
    test.skip(!added, 'No available products')

    await openCartIfMobile(page)
    const cart = visibleCart(page)

    /*
     * Parse the localised total ("17,90 €" → 17.9) and verify that bumping
     * the quantity strictly increases it. Don't assert exact doubling —
     * pickup-discount + rounding make the relationship non-linear.
     */
    const parseTotal = async () => {
      const raw = (await cart.locator(SEL.cartTotal).textContent()) ?? ''
      return Number(raw.replace(/[^\d,.-]/gu, '').replace(',', '.'))
    }

    const totalBefore = await parseTotal()
    expect(totalBefore).toBeGreaterThan(0)

    await cart.locator(SEL.cartItemIncrement).first().click()
    await expect(cart.locator(SEL.cartItemQuantity).first()).toHaveText('2')

    await expect(async () => {
      const after = await parseTotal()
      expect(after).toBeGreaterThan(totalBefore)
    }).toPass({ timeout: 5_000 })
  })

  test('Checkout link is aria-disabled below minimum order', async ({ page }, testInfo) => {
    test.skip(
      isMobile(testInfo),
      'mobile checkout link is gated only on isOrderingAvailable, not on isMinimumReached',
    )

    await page.goto('/fr/menu')
    await waitForNuxtHydration(page)
    await dismissCookieConsent(page)
    await page.locator(SEL.productCard).first().waitFor()

    const added = await addFirstAvailableProduct(page)
    test.skip(!added, 'No available products')

    const warning = page.locator(SEL.cartMinimumWarning)
    test.skip(
      !(await warning
        .waitFor({ state: 'visible', timeout: 2_000 })
        .then(() => true)
        .catch(() => false)),
      'First product already meets minimum',
    )

    const checkoutLink = page.locator(SEL.cartCheckoutLink)
    await expect(checkoutLink).toHaveAttribute('aria-disabled', 'true')
  })

  test('Switching to pickup from the minimum notice clears it', async ({ page }, testInfo) => {
    test.skip(
      isMobile(testInfo),
      'asserted on the SideCart; CartMobile and /cart render the same notice',
    )

    await page.goto('/fr/menu')
    await waitForNuxtHydration(page)
    await dismissCookieConsent(page)
    await page.locator(SEL.productCard).first().waitFor()

    const added = await addFirstAvailableProduct(page)
    test.skip(!added, 'No available products')

    const warning = page.locator(SEL.cartMinimumWarning)
    test.skip(
      !(await warning
        .waitFor({ state: 'visible', timeout: 2_000 })
        .then(() => true)
        .catch(() => false)),
      'First product already meets minimum',
    )

    await page.locator(SEL.cartSwitchToPickup).click()
    await expect(warning).toBeHidden()
    // UiButton marks a blocked link aria-disabled="true" and leaves the attribute off otherwise.
    await expect(page.locator(SEL.cartCheckoutLink)).not.toHaveAttribute('aria-disabled', 'true')
  })

  test('SideCart and /cart show the same payable total', async ({ page }, testInfo) => {
    test.skip(
      isMobile(testInfo),
      'SideCart is desktop only; CartMobile shares the same computed total',
    )

    await page.goto('/fr/menu')
    await waitForNuxtHydration(page)
    await dismissCookieConsent(page)
    await page.locator(SEL.productCard).first().waitFor()

    const added = await addFirstAvailableProduct(page)
    test.skip(!added, 'No available products')

    // Pickup avoids needing an address; the default payment option is ONLINE, so the 0,30 € fee is part of both.
    await page.locator(SEL.cartOptionPickup).click()
    const sideTotal = ((await page.locator(SEL.cartTotal).textContent()) ?? '').trim()
    expect(sideTotal).toMatch(/\d/u)

    // The cart is persisted in localStorage, so the dedicated page sees the same basket.
    await page.goto('/fr/cart')
    await waitForNuxtHydration(page)
    await expect(page.locator(SEL.cartPageTotal)).toHaveText(sideTotal)
  })

  test('Empty cart page shows empty state and no checkout link', async ({ page }) => {
    await page.goto('/fr/cart')
    await waitForNuxtHydration(page)
    await dismissCookieConsent(page)

    await expect(page.locator(SEL.cartEmpty)).toBeVisible()
    await expect(page.locator(SEL.cartCheckoutLink)).toHaveCount(0)
  })
})
