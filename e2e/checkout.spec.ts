import { expect, test } from './fixtures/auth.fixture'
import { SEL } from './helpers/selectors'
import { addProductsAndGoToCheckout } from './helpers/cart.helpers'

test.describe('Checkout flows', () => {
  test('Cash order happy path lands on /order-completed and appears in /me/orders', async ({ authenticatedPage: page }) => {
    await addProductsAndGoToCheckout(page)

    /*
     * Whether the restaurant is currently open varies by time-of-day. The
     * checkout page renders either the closed banner or the place-order
     * button; race them and skip if the kitchen is shut.
     */
    await page.locator(`${SEL.checkoutRestaurantClosed}, ${SEL.checkoutPlaceOrder}`).first().waitFor({ timeout: 10_000 })
    if (await page.locator(SEL.checkoutRestaurantClosed).isVisible()) {
      test.skip(true, 'Restaurant is currently closed')
      return
    }

    await test.step('Select cash payment + place order', async () => {
      await page.locator(SEL.paymentCash).click()
      /*
       * Cash requires the customer to tick "I confirm I'll pay cash"; the
       * place-order button stays disabled otherwise.
       */
      await page.locator(SEL.cashAcknowledge).check()
      await page.locator(SEL.checkoutPlaceOrder).first().click()
      await page.waitForURL('**/fr/order-completed/**', { timeout: 15_000 })
    })

    const orderId = page.url().match(/order-completed\/([^/?#]+)/u)?.[1] ?? ''
    expect(orderId).toMatch(/^[0-9a-f-]{36}$/u)

    await test.step('Order-completed page shows confirmation + items', async () => {
      await expect(page.locator(SEL.orderCompletedTitle)).toBeVisible()
      await expect(page.locator('[data-testid="order-completed-items"]')).toBeVisible()
    })

    await test.step('Order appears in /me/orders', async () => {
      await page.goto('/fr/me/orders')
      /*
       * Each order card wraps an accordion panel with id `order-panel-<uuid>`,
       * which is the most stable hook we have until the list gets explicit
       * data-testid coverage. Matching by id avoids the rendered card text
       * (status/date/total) which varies and isn't unique.
       */
      const panel = page.locator(`#order-panel-${orderId}`)
      await expect(panel).toHaveCount(1, { timeout: 15_000 })
    })
  })
})
