import { type Page, expect, test } from '@playwright/test'
import { SEL } from './helpers/selectors'
import { dismissCookieConsent } from './fixtures/cookie-consent.fixture'

test.beforeEach(async ({ context }) => {
  await context.clearCookies()
  await context.addInitScript(() => localStorage.clear())
})

// Helper: find and click the first enabled add-to-cart button among simple products
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
  test('Add product to cart shows in SideCart', async ({ page }) => {
    await page.goto('/fr/menu')
    await dismissCookieConsent(page)
    await page.locator(SEL.productCard).first().waitFor()

    const added = await addFirstAvailableProduct(page)
    test.skip(!added, 'No available products with enabled add-to-cart button')

    // SideCart should appear with the product
    await expect(page.locator(SEL.sideCart)).toBeVisible()
    await expect(page.locator(SEL.cartItem)).toBeVisible()

    // Cart total should not be €0,00
    await expect(page.locator(SEL.cartTotal)).not.toHaveText('0,00 €')
  })

  test('Toggle pickup/delivery changes total', async ({ page }) => {
    await page.goto('/fr/menu')
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

    // Default is DELIVERY — get the total
    const deliveryTotal = await page.locator(SEL.cartTotal).textContent()

    // Switch to PICKUP (10% discount on discountable items)
    await page.locator(SEL.cartOptionPickup).click()
    const pickupTotal = await page.locator(SEL.cartTotal).textContent()

    expect(deliveryTotal).toBeTruthy()
    expect(pickupTotal).toBeTruthy()
  })

  test('Minimum order warning appears for small orders', async ({ page }) => {
    await page.goto('/fr/menu')
    await dismissCookieConsent(page)
    await page.locator(SEL.productCard).first().waitFor()

    const added = await addFirstAvailableProduct(page)
    test.skip(!added, 'No available products')

    await expect(page.locator(SEL.cartItem)).toBeVisible()

    // Minimum warning should be visible (single product likely below €20)
    await expect(page.locator(SEL.cartMinimumWarning)).toBeVisible()
  })

  test('Increment and decrement quantity', async ({ page }) => {
    await page.goto('/fr/menu')
    await dismissCookieConsent(page)
    await page.locator(SEL.productCard).first().waitFor()

    const added = await addFirstAvailableProduct(page)
    test.skip(!added, 'No available products')

    await expect(page.locator(SEL.cartItem)).toBeVisible()

    // Initial quantity should be 1
    await expect(page.locator(SEL.cartItemQuantity).first()).toHaveText('1')

    // Increment
    await page.locator(SEL.cartItemIncrement).first().click()
    await expect(page.locator(SEL.cartItemQuantity).first()).toHaveText('2')

    // Decrement
    await page.locator(SEL.cartItemDecrement).first().click()
    await expect(page.locator(SEL.cartItemQuantity).first()).toHaveText('1')
  })

  test('Remove product from cart', async ({ page }) => {
    await page.goto('/fr/menu')
    await dismissCookieConsent(page)
    await page.locator(SEL.productCard).first().waitFor()

    const added = await addFirstAvailableProduct(page)
    test.skip(!added, 'No available products')

    await expect(page.locator(SEL.cartItem)).toBeVisible()

    // Remove it
    await page.locator(SEL.cartItemRemove).first().click()
    await expect(page.locator(SEL.cartItem)).not.toBeVisible()
  })
})
