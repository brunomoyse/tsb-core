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

    /*
     * "None" is the unchecked state of the #add-sauce checkbox; pills
     * (sweet / salty / both) only render when sauce is enabled. Ensure the
     * checkbox is on, then verify pill swap via aria-pressed.
     */
    const addSauceCheckbox = page.locator('#add-sauce')
    if (!(await addSauceCheckbox.isChecked())) {
      await addSauceCheckbox.check()
    }

    const sweetBtn = page.locator('[data-testid="sauce-option-sweet"]')
    const bothBtn = page.locator('[data-testid="sauce-option-both"]')

    // Enabling the checkbox defaults the selection to "both"
    await expect(bothBtn).toHaveAttribute('aria-pressed', 'true')

    await sweetBtn.click()
    await expect(sweetBtn).toHaveAttribute('aria-pressed', 'true')
    await expect(bothBtn).toHaveAttribute('aria-pressed', 'false')
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

  test('Cash payment without acknowledgement is rejected by validation', async ({ authenticatedPage: page }) => {
    await addProductsAndGoToCheckout(page)

    /*
     * Race the closed banner — if the kitchen is shut the place-order button
     * never renders and the validation we want to test doesn't fire.
     */
    await page.locator(`${SEL.checkoutRestaurantClosed}, ${SEL.checkoutPlaceOrder}`).first().waitFor({ timeout: 10_000 })
    if (await page.locator(SEL.checkoutRestaurantClosed).isVisible()) {
      test.skip(true, 'Restaurant is currently closed')
      return
    }

    /*
     * The place-order button stays clickable for both online and cash; cash
     * validation runs on click and short-circuits with a notification when
     * the acknowledgement checkbox is unticked. Verify we stay on /checkout
     * and the cash-acknowledge row is still visible (no navigation happened).
     */
    await page.locator(SEL.paymentCash).click()
    await expect(page.locator(SEL.cashAcknowledge)).not.toBeChecked()

    await page.locator(SEL.checkoutPlaceOrder).first().click()
    /* Polls for ~1.5s; succeeds because the URL never matches order-completed. */
    await expect(page).not.toHaveURL(/\/order-completed\//u, { timeout: 1_500 })
    await expect(page).toHaveURL(/\/checkout(?:[/?#]|$)/u)
  })

  test('Delivery mode shows address prompt, pickup hides it', async ({ authenticatedPage: page }) => {
    await addProductsAndGoToCheckout(page)

    /*
     * Test the structural invariant rather than the inner copy: the
     * #checkout-delivery-address container shows under DELIVERY and is
     * removed under PICKUP. The inner button text varies ("Add Address"
     * vs "Edit Address") depending on whether the test user already has
     * a saved profile address — the seeded e2e user does.
     */
    const addressSection = page.locator('#checkout-delivery-address')

    await page.locator(SEL.checkoutOptionDelivery).click()
    await expect(addressSection).toBeVisible({ timeout: 3_000 })

    await page.locator(SEL.checkoutOptionPickup).click()
    await expect(addressSection).not.toBeVisible()
  })
})
