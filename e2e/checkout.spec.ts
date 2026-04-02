import { expect, test } from './fixtures/auth.fixture'
import { SEL } from './helpers/selectors'

test.describe('Checkout flows', () => {
  test.fixme('Cash order happy path: login, add to cart, pickup, cash, place order', async ({ authenticatedPage: page }) => {
    await test.step('Browse menu', async () => {
      await page.locator(SEL.productCard).first().waitFor()
    })

    let addedCount = 0
    await test.step('Add products to cart', async () => {
      const simpleCards = page.locator(SEL.simpleProduct)
      const count = await simpleCards.count()

      for (let i = 0; i < count && addedCount < 5; i++) {
        const addBtn = simpleCards.nth(i).locator(`${SEL.productAddToCart}:not([disabled])`)
        if (await addBtn.isVisible({ timeout: 500 }).catch(() => false)) {
          await addBtn.click()
          await expect(page.locator(SEL.cartItem).nth(addedCount)).toBeVisible()
          addedCount++
        }
      }
    })

    if (addedCount === 0) {
      test.skip(true, 'No products can be added — restaurant may be closed')
      return
    }

    await test.step('Set pickup in SideCart', async () => {
      const sideCart = page.locator(SEL.sideCart)
      await sideCart.waitFor()
      await sideCart.locator(SEL.cartOptionPickup).click()
    })

    await test.step('Ensure minimum order is met', async () => {
      const warning = page.locator(SEL.cartMinimumWarning)
      if (await warning.isVisible()) {
        const simpleCards = page.locator(SEL.simpleProduct)
        const count = await simpleCards.count()
        for (let i = 0; i < count; i++) {
          const addBtn = simpleCards.nth(i).locator(`${SEL.productAddToCart}:not([disabled])`)
          if (await addBtn.isVisible({ timeout: 500 }).catch(() => false)) {
            await addBtn.click()
            await expect(page.locator(SEL.cartItem).last()).toBeVisible()
          }
          if (!(await warning.isVisible())) break
        }
      }
      await expect(warning).not.toBeVisible()
    })

    await test.step('Go to checkout', async () => {
      await page.locator(SEL.cartCheckoutLink).click()
      await page.waitForURL('**/fr/checkout')
    })

    // Wait for checkout to render, then skip if restaurant is closed
    await page.locator(`${SEL.checkoutRestaurantClosed}, ${SEL.checkoutPlaceOrder}`).first().waitFor({ timeout: 10_000 })
    const closedBanner = page.locator(SEL.checkoutRestaurantClosed)
    if (await closedBanner.isVisible()) {
      test.skip(true, 'Restaurant is currently closed')
      return
    }

    await test.step('Select cash payment', async () => {
      await page.locator(SEL.paymentCash).click()
    })

    await test.step('Place order', async () => {
      await page.locator(SEL.checkoutPlaceOrder).first().click()
      await page.waitForURL('**/fr/order-completed/**', { timeout: 15_000 })
    })

    await test.step('Verify order completion', async () => {
      await expect(page.locator(SEL.orderCompletedTitle)).toBeVisible()
    })
  })
})
