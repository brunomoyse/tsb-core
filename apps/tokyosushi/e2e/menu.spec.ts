import { dismissCookieConsent, waitForNuxtHydration } from './fixtures/cookie-consent.fixture'
import { expect, test } from '@playwright/test'
import { SEL } from './helpers/selectors'

test.beforeEach(async ({ context }) => {
  await context.clearCookies()
  await context.addInitScript(() => localStorage.clear())
})

test.describe('Menu browsing', () => {
  test('Products render with category tabs', async ({ page }) => {
    await page.goto('/fr/menu')
    await waitForNuxtHydration(page)
    await dismissCookieConsent(page)

    // Products should be visible
    await expect(page.locator(SEL.productCard).first()).toBeVisible()
    // Category tabs should be visible
    await expect(page.locator(SEL.categoryCard).first()).toBeVisible()
    // Should have multiple categories
    const categoryCount = await page.locator(SEL.categoryCard).count()
    expect(categoryCount).toBeGreaterThan(1)
  })

  test('Search filters products', async ({ page }) => {
    await page.goto('/fr/menu')
    await waitForNuxtHydration(page)
    await dismissCookieConsent(page)
    await page.locator(SEL.productCard).first().waitFor()

    const initialCategoryCount = await page.locator(SEL.categoryCard).count()

    // Click the search bar area to expand the input, then type
    await page.locator('#menuSearch').focus()
    await page.keyboard.type('gyoza', { delay: 50 })

    // Wait for debounced search (300ms) to take effect — category tab count should decrease
    await expect(async () => {
      const filteredCategoryCount = await page.locator(SEL.categoryCard).count()
      expect(filteredCategoryCount).toBeLessThan(initialCategoryCount)
    }).toPass({ timeout: 5_000 })
  })

  test('Product with choices opens modal', async ({ page }) => {
    await page.goto('/fr/menu')
    await waitForNuxtHydration(page)
    await dismissCookieConsent(page)
    await page.locator(SEL.productCard).first().waitFor()

    const choiceProduct = page.locator(SEL.choiceProduct).first()
    if (await choiceProduct.isVisible().catch(() => false)) {
      // Click the product image area — event bubbles to parent div with @click handler
      await choiceProduct.locator('img').first().click()

      // Wait for the router.push({ query: { product: id } }) to take effect
      await page.waitForURL('**product=**', { timeout: 5_000 })

      // Modal fetches product data via GraphQL — wait with generous timeout
      await expect(page.locator(SEL.productModal)).toBeVisible({ timeout: 15_000 })

      // Modal should have an add-to-cart button
      await expect(page.locator(SEL.productModalAddToCart)).toBeVisible()

      // Close modal with Escape
      await page.keyboard.press('Escape')
      await expect(page.locator(SEL.productModal)).not.toBeVisible()
    } else {
      test.skip(true, 'No products with choices available')
    }
  })

  test('Choice product gates add-to-cart on selections', async ({ page }) => {
    await page.goto('/fr/menu')
    await waitForNuxtHydration(page)
    await dismissCookieConsent(page)
    await page.locator(SEL.productCard).first().waitFor()

    const choiceProduct = page.locator(SEL.choiceProduct).first()
    if (!(await choiceProduct.isVisible().catch(() => false))) {
      test.skip(true, 'No products with choices available')
      return
    }
    await choiceProduct.locator('img').first().click()
    await page.waitForURL('**product=**', { timeout: 5_000 })
    await expect(page.locator(SEL.productModal)).toBeVisible({ timeout: 15_000 })

    /*
     * At 0 selections the button must be disabled — this is the real gating
     * invariant. We previously also asserted "still disabled after clicking
     * the first +", but that only holds for products with min > 1 in the
     * group; for the most common 1/1 group the click satisfies the only
     * requirement and the button correctly becomes enabled.
     */
    await expect(page.locator(SEL.productModalAddToCart)).toBeDisabled()

    await page.keyboard.press('Escape')
  })
})
