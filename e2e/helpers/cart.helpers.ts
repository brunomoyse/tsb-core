import { type Page, expect, test } from '@playwright/test'
import { SEL } from './selectors'
import { waitForNuxtHydration } from '../fixtures/cookie-consent.fixture'

/*
 * When the SideCart is hidden (viewport < lg), tap the FloatingCartBar to
 * reveal CartMobile so the shared cart-item / cart-total / qty-control
 * testids are queryable. No-op on desktop. Safe to call when the cart is
 * already open: the floating bar disappears once the panel is visible.
 */
export async function openCartIfMobile(page: Page): Promise<void> {
  const sideCartVisible = await page.locator(SEL.sideCart).isVisible({ timeout: 500 }).catch(() => false)
  if (sideCartVisible) return
  const bar = page.locator(SEL.floatingCartBar)
  if (await bar.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await bar.click()
  }
  await page.locator(SEL.cartMobile).waitFor({ state: 'visible', timeout: 5_000 })
}

/*
 * Returns a Locator scoped to whichever cart container is visible — the
 * desktop SideCart or the mobile CartMobile panel. Both expose the same
 * cart-item / cart-total / qty-control testids, so callers can run the
 * same assertions against either viewport without picking the wrong (and
 * potentially hidden) parent.
 */
export function visibleCart(page: Page) {
  return page.locator(`${SEL.sideCart}:visible, ${SEL.cartMobile}:visible`).first()
}

/**
 * Adds simple products to the cart and navigates to checkout.
 * Navigates to /fr/menu first if not already there (the authenticatedPage
 * fixture only injects auth state — it does not navigate).
 * Only clicks enabled (not disabled) add-to-cart buttons.
 * Skips the test if no products can be added (e.g. restaurant is closed).
 */
export async function addProductsAndGoToCheckout(page: Page, count = 5) {
  if (!/\/fr\/menu(?:[/?#]|$)/u.test(page.url())) {
    await page.goto('/fr/menu')
  }
  await waitForNuxtHydration(page)
  await page.locator(SEL.productCard).first().waitFor({ state: 'visible', timeout: 15_000 })
  const simpleCards = page.locator(SEL.simpleProduct)
  const available = await simpleCards.count()
  let addedCount = 0

  for (let i = 0; i < available && addedCount < count; i++) {
    const addBtn = simpleCards.nth(i).locator(`${SEL.productAddToCart}:not([disabled])`)
    if (await addBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await addBtn.click()
      await expect(page.locator(SEL.cartItem).nth(addedCount)).toBeVisible()
      addedCount++
    }
  }

  if (addedCount === 0) {
    test.skip(true, 'No products can be added — restaurant may be closed')
    return
  }

  // Set pickup to avoid needing an address
  await page.locator(SEL.cartOptionPickup).click()

  // Ensure minimum order is met
  const warning = page.locator(SEL.cartMinimumWarning)
  if (await warning.isVisible()) {
    for (let i = 0; i < available; i++) {
      const addBtn = simpleCards.nth(i).locator(`${SEL.productAddToCart}:not([disabled])`)
      if (await addBtn.isVisible({ timeout: 500 }).catch(() => false)) {
        await addBtn.click()
        await expect(page.locator(SEL.cartItem).last()).toBeVisible()
      }
      if (!(await warning.isVisible())) break
    }
  }

  await page.locator(SEL.cartCheckoutLink).click()
  await page.waitForURL('**/fr/checkout')
}
