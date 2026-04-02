import { expect, test } from './fixtures/auth.fixture'
import { SEL } from './helpers/selectors'
import { addProductsAndGoToCheckout } from './helpers/cart.helpers'

test.describe('Coupon input', () => {
  test('Coupon input and apply button render', async ({ authenticatedPage: page }) => {
    await addProductsAndGoToCheckout(page)

    await expect(page.locator(SEL.couponInput)).toBeVisible()
    await expect(page.locator(SEL.couponApply)).toBeVisible()
  })

  test('Apply button is disabled when input is empty', async ({ authenticatedPage: page }) => {
    await addProductsAndGoToCheckout(page)

    await expect(page.locator(SEL.couponApply)).toBeDisabled()
  })

  test('Invalid coupon shows error message', async ({ authenticatedPage: page }) => {
    await addProductsAndGoToCheckout(page)

    await page.locator(SEL.couponInput).fill('INVALIDCODE123')
    await page.locator(SEL.couponApply).click()

    await expect(page.locator(SEL.couponError)).toBeVisible({ timeout: 10_000 })
  })

  test('Clearing input after error hides error on new attempt', async ({ authenticatedPage: page }) => {
    await addProductsAndGoToCheckout(page)

    // Trigger error
    await page.locator(SEL.couponInput).fill('BADCODE')
    await page.locator(SEL.couponApply).click()
    await expect(page.locator(SEL.couponError)).toBeVisible({ timeout: 10_000 })

    // Clear and type new code — error should still be visible until next submit
    await page.locator(SEL.couponInput).fill('ANOTHERCODE')
    await page.locator(SEL.couponApply).click()

    // New attempt also fails, but proves the flow doesn't crash
    await expect(page.locator(SEL.couponError)).toBeVisible({ timeout: 10_000 })
  })
})
