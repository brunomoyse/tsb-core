import { expect, test } from './fixtures/auth.fixture'
import { SEL } from './helpers/selectors'
import { addProductsAndGoToCheckout } from './helpers/cart.helpers'

test.describe('Checkout options', () => {
  test('Extras checkboxes toggle on and off', async ({ authenticatedPage: page }) => {
    await addProductsAndGoToCheckout(page)

    // Check chopsticks
    const chopsticks = page.locator('#chopsticks')
    await chopsticks.check()
    await expect(chopsticks).toBeChecked()

    // Check wasabi
    const wasabi = page.locator('#wasabi')
    await wasabi.check()
    await expect(wasabi).toBeChecked()

    // Check ginger
    const ginger = page.locator('#ginger')
    await ginger.check()
    await expect(ginger).toBeChecked()

    // Uncheck chopsticks
    await chopsticks.uncheck()
    await expect(chopsticks).not.toBeChecked()
  })

  test('Soy sauce pill selection', async ({ authenticatedPage: page }) => {
    await addProductsAndGoToCheckout(page)

    // Use aria-pressed attribute on pill buttons
    const sauce1Buttons = page.locator('button[aria-pressed]')

    // Click the second button in the first sauce group (sweet)
    // Sauce buttons come in two groups of 3 (none/sweet/salty × 2)
    const sweetBtn = sauce1Buttons.nth(1) // "sweet" for sauce 1
    await sweetBtn.click()
    await expect(sweetBtn).toHaveAttribute('aria-pressed', 'true')
  })

  test('Order comment textarea accepts text', async ({ authenticatedPage: page }) => {
    await addProductsAndGoToCheckout(page)

    const textarea = page.locator('[aria-labelledby="order-comment-label"]')
    await textarea.fill('No spicy please')
    await expect(textarea).toHaveValue('No spicy please')
  })

  test('Payment method toggle switches between online and cash', async ({ authenticatedPage: page }) => {
    await addProductsAndGoToCheckout(page)

    const online = page.locator(SEL.paymentOnline)
    const cash = page.locator(SEL.paymentCash)

    // Default is online
    await expect(online).toHaveAttribute('aria-checked', 'true')
    await expect(cash).toHaveAttribute('aria-checked', 'false')

    // Switch to cash
    await cash.click()
    await expect(cash).toHaveAttribute('aria-checked', 'true')
    await expect(online).toHaveAttribute('aria-checked', 'false')

    // Switch back to online
    await online.click()
    await expect(online).toHaveAttribute('aria-checked', 'true')
  })

  test('Preferred time dropdown is visible', async ({ authenticatedPage: page }) => {
    await addProductsAndGoToCheckout(page)

    const timeSelect = page.locator(SEL.checkoutPreferredTime)
    await expect(timeSelect).toBeVisible()

    // Should have at least one option
    const optionCount = await timeSelect.locator('option').count()
    expect(optionCount).toBeGreaterThanOrEqual(1)
  })

  test('Delivery mode shows address prompt, pickup hides it', async ({ authenticatedPage: page }) => {
    await addProductsAndGoToCheckout(page)

    // Currently in pickup mode (set by helper). Switch to delivery.
    await page.locator(SEL.checkoutOptionDelivery).click()

    // Address prompt should appear (the "Add Address" button)
    const addressPrompt = page.locator('text=Add Address').or(page.locator('text=Ajouter une adresse'))
    await expect(addressPrompt.first()).toBeVisible({ timeout: 3_000 })

    // Switch back to pickup — address section should disappear
    await page.locator(SEL.checkoutOptionPickup).click()
    await expect(addressPrompt.first()).not.toBeVisible()
  })
})
