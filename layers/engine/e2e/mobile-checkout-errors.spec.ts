import {
  cartLines,
  chooseCollection,
  choosePayment,
  fillCart,
  gotoCheckout,
  payAmount,
  payButton,
  waitForQuote,
} from './support/order-flow'
import { expect, test } from './support/test'

/*
 * When the API is slow, refuses the quote, or refuses the order, on a phone, both brands: the pay button is held back
 * while a quote is on its way, a hung quote never blocks it for good, a failed quote falls back to the app's own maths,
 * a price that moved between the quote and the tap stops the order, and a refused createOrder says why, keeps the cart
 * and can be retried.
 *
 * Basket: one gyoza, picked up (TS 6,90 + 0,30 online fee = 7,20; YGF 5,50 + 0,30 = 5,80).
 */

test.skip(({ mock }) => !mock, 'needs the mock tsb-service (scenarios, created orders)')
test.skip(({ isMobile }) => !isMobile, 'phone layout')

const GYOZA = /Gyoza/u
const BASE = { tokyosushi: 7.2, ygfliege: 5.8 } as const
const GYOZA_ID = 'p-gyoza'

test.beforeEach(async ({ authenticatedPage: page, backend }) => {
  await backend.mock.user({ phoneNumber: '+32470123456' })
  await fillCart(page, [GYOZA])
  await gotoCheckout(page)
  await chooseCollection(page, 'pickup')
  await waitForQuote(page)
})

/** Cash, acknowledged: the shortest way to a payable order. */
async function readyToPayInCash(page: Parameters<typeof choosePayment>[0]) {
  await choosePayment(page, 'cash')
  await page.getByTestId('cash-acknowledge').check()
  await waitForQuote(page)
}

test.describe('Slow or failing quote', () => {
  test('while a quote is on its way Pay is held back and says prices are updating', async ({
    authenticatedPage: page,
    backend,
    brand,
  }) => {
    expect(await payAmount(page)).toBe(BASE[brand])
    await backend.mock.scenario({ quoteDelayMs: 2_500 })
    await choosePayment(page, 'cash') // The online fee goes away: a new quote is needed

    const hint = page.locator('[data-testid="checkout-quote-updating"]:visible').first()
    await expect(hint).toBeVisible()
    await expect(hint).toContainText('Mise à jour des prix')
    await expect(payButton(page)).toBeDisabled()

    await backend.mock.scenario({ quoteDelayMs: 0 })
    await waitForQuote(page)
    await page.getByTestId('cash-acknowledge').check()
    await expect(payButton(page)).toBeEnabled()
    expect(await payAmount(page)).toBe(BASE[brand] - 0.3)
  })

  test('a quote that never answers is given up on after a while: Pay comes back with the app’s own total', async ({
    authenticatedPage: page,
    backend,
    brand,
  }) => {
    test.setTimeout(90_000)
    await backend.mock.scenario({ quoteDelayMs: 30_000 }) // The app gives up after 8 s
    await choosePayment(page, 'cash')
    await page.getByTestId('cash-acknowledge').check()
    await expect(payButton(page)).toBeDisabled()
    await waitForQuote(page)
    await expect(payButton(page)).toBeEnabled({ timeout: 15_000 })
    expect(await payAmount(page)).toBe(BASE[brand] - 0.3)
    await backend.mock.scenario({ quoteDelayMs: 0 })
  })

  test('a failing quote falls back to the app’s own maths and the order still goes through', async ({
    authenticatedPage: page,
    backend,
    brand,
  }) => {
    await backend.mock.scenario({ quoteFailure: { code: 'INTERNAL' } })
    await choosePayment(page, 'cash')
    await page.getByTestId('cash-acknowledge').check()
    await waitForQuote(page)
    // No error screen and no blocking issue: the customer pays the amount the app computed.
    await expect(page.getByTestId('checkout-quote-issues')).toHaveCount(0)
    await expect(payButton(page)).toBeEnabled()
    expect(await payAmount(page)).toBe(BASE[brand] - 0.3)

    await payButton(page).click()
    await page.waitForURL('**/fr/order-completed/**')
    const [order] = await backend.mock.createdOrders()
    expect(order?.total).toBe((BASE[brand] - 0.3).toFixed(2))
  })

  test('a price that moved after the last quote stops the order, shows the new price and charges it once accepted', async ({
    authenticatedPage: page,
    backend,
    brand,
  }) => {
    await readyToPayInCash(page)
    const oldPrice = brand === 'tokyosushi' ? 6.9 : 5.5
    // The kitchen raises the price while the customer is reading the page (the page has not re-quoted yet).
    await backend.mock.product(GYOZA_ID, { price: '8.00' })
    await payButton(page).click()

    // The check right before createOrder sees it: warning, nothing ordered, the new price is on the line.
    await expect(page.getByText('Les prix ou la disponibilité ont changé').first()).toBeVisible()
    expect(await backend.mock.operations('createOrder')).toHaveLength(0)
    const issue = page.getByTestId('cart-line-issue-PRICE_CHANGED')
    await expect(issue).toContainText(`${oldPrice.toFixed(2).replace('.', ',')} € → 8,00 €`)
    await expect(payButton(page)).toBeDisabled()

    await issue.getByTestId('cart-line-issue-action-accept-price').click()
    await expect(issue).toHaveCount(0)
    await waitForQuote(page)
    await expect(payButton(page)).toBeEnabled()
    expect(await payAmount(page)).toBe(8)
    await payButton(page).click()
    await page.waitForURL('**/fr/order-completed/**')
    const [order] = await backend.mock.createdOrders()
    expect(order?.total).toBe('8.00')
  })
})

test.describe('Server changes while the checkout stays open', () => {
  test('a price that changes on the server is picked up within a minute, without any tap', async ({
    authenticatedPage: page,
    backend,
    brand,
  }) => {
    // The page re-asks for the quote every minute while it is visible: let that minute pass at once.
    await page.clock.install()
    await page.goto('/fr/checkout')
    await expect(payButton(page)).toBeVisible()
    await chooseCollection(page, 'pickup')
    await waitForQuote(page)
    expect(await payAmount(page)).toBe(BASE[brand])
    await expect(page.getByTestId('cart-line-issue-PRICE_CHANGED')).toHaveCount(0)

    await backend.mock.product(GYOZA_ID, { price: '12.00' })
    await page.clock.fastForward('01:05')
    const issue = page.getByTestId('cart-line-issue-PRICE_CHANGED')
    await expect(issue).toBeVisible()
    await expect(issue).toContainText('€ → 12,00 €')
    await expect(payButton(page)).toBeDisabled()
    expect(await backend.mock.operations('createOrder')).toHaveLength(0)
  })
})

test.describe('createOrder refused', () => {
  const refusals = [
    {
      name: 'a server error',
      failure: { code: 'INTERNAL' },
      message: "Votre commande n'a pas pu être créée. Veuillez réessayer.",
    },
    {
      name: 'a product sold out in the meantime, named in the message',
      failure: { code: 'PRODUCT_UNAVAILABLE', productId: GYOZA_ID },
      message: /est épuisé pour le moment/u,
    },
    {
      name: 'the restaurant closing for the day',
      failure: { code: 'ORDERING_CLOSED_TODAY' },
      message: 'Les commandes sont fermées aujourd',
    },
  ] as const

  for (const refusal of refusals) {
    test(`${refusal.name}: the customer is told, the cart is kept and Pay can be tried again`, async ({
      authenticatedPage: page,
      backend,
    }) => {
      await readyToPayInCash(page)
      await backend.mock.scenario({ createOrderFailure: refusal.failure })
      await payButton(page).click()

      await expect(page.getByText(refusal.message).first()).toBeVisible()
      await expect(page).toHaveURL(/\/fr\/checkout/u)
      await expect(payButton(page)).toBeEnabled()
      expect(await cartLines(page)).toHaveLength(1)
      expect(await backend.mock.createdOrders()).toHaveLength(0)

      // The API recovers: the very same tap now creates the order and clears the cart on the confirmation.
      await backend.mock.scenario({ createOrderFailure: null })
      await payButton(page).click()
      await page.waitForURL('**/fr/order-completed/**')
      expect(await backend.mock.createdOrders()).toHaveLength(1)
      expect((await backend.mock.operations('createOrder')).length).toBe(2)
    })
  }

  test('while the order is being created Pay is locked and exactly one order is sent', async ({
    authenticatedPage: page,
    backend,
  }) => {
    await readyToPayInCash(page)
    await backend.mock.scenario({ createOrderDelayMs: 1_500 })
    await payButton(page).click()
    // The button shows the work in progress and cannot be pressed again.
    await expect(payButton(page)).toContainText('Traitement en cours')
    await expect(payButton(page)).toBeDisabled()
    await page.waitForURL('**/fr/order-completed/**')
    expect(await backend.mock.operations('createOrder')).toHaveLength(1)
    expect(await backend.mock.createdOrders()).toHaveLength(1)
  })

  test('an expired session at pay time does not create an order', async ({
    authenticatedPage: page,
    backend,
  }) => {
    await readyToPayInCash(page)
    await backend.mock.scenario({ rejectSession: true })
    await payButton(page).click()
    // The server refuses the token and the renewal is refused too: the customer is sent to sign in again (with the
    // expired notice); no order exists and the cart is intact.
    await page.waitForURL(/\/fr\/auth\/login\?authRequest=/u)
    await expect(
      page.locator('p[role="alert"]', { hasText: 'Votre session a expiré' }),
    ).toBeVisible()
    expect(await backend.mock.operations('createOrder')).toHaveLength(1)
    expect(await backend.mock.createdOrders()).toHaveLength(0)
    expect(await cartLines(page)).toHaveLength(1)
  })
})
