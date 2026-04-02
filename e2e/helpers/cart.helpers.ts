import { type Page, expect, test } from '@playwright/test'
import { SEL } from './selectors'
import { waitForNuxtHydration } from '../fixtures/cookie-consent.fixture'

/**
 * Adds simple products to the cart and navigates to checkout.
 * Assumes the page is already on /fr/menu with cookie consent dismissed.
 * Only clicks enabled (not disabled) add-to-cart buttons.
 * Skips the test if no products can be added (e.g. restaurant is closed).
 * Waits for Nuxt hydration before interacting.
 */
export async function addProductsAndGoToCheckout(page: Page, count = 5) {
  await waitForNuxtHydration(page)
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
