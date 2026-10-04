import { type Page } from '@playwright/test'
import {
  cartLines,
  chooseCollection,
  choosePayment,
  fillCart,
  gotoCheckout,
  noHorizontalScroll,
  payAmount,
  payButton,
  waitForQuote,
} from './support/order-flow'
import { expect, test } from './support/test'

/*
 * Paying, end to end, on a phone, both brands, through the mock's fake Mollie page: every way the hosted payment can end
 * (paid, failed, cancelled, expired, left before the webhook), the retry that follows a failure, the Back button, and
 * the cash variants (change due, an amount that is too low). Each outcome is checked on screen, in the stored cart and
 * in what the mock received (`createdOrders()`).
 *
 * Basket: one gyoza, picked up. Online: TS 6,90 + 0,30 fee = 7,20, YGF 5,50 + 0,30 = 5,80. Cash: no fee.
 */

test.skip(({ mock }) => !mock, 'needs the mock tsb-service (fake Mollie, created orders)')
test.skip(({ isMobile }) => !isMobile, 'phone layout')

const GYOZA = /Gyoza/u
const ONLINE = { tokyosushi: 7.2, ygfliege: 5.8 } as const
const GOODS = { tokyosushi: 6.9, ygfliege: 5.5 } as const

test.beforeEach(async ({ authenticatedPage: page, backend }) => {
  await backend.mock.user({ phoneNumber: '+32470123456' })
  await fillCart(page, [GYOZA])
  await gotoCheckout(page)
  await chooseCollection(page, 'pickup')
  await waitForQuote(page)
})

/** Taps "Go to payment" and lands on the fake Mollie page. */
async function goToMollie(page: Page): Promise<void> {
  await payButton(page).click()
  await expect(page.getByTestId('mollie-page')).toBeVisible()
}

const returnedProblem = (page: Page) => page.getByTestId('order-completed-payment-problem')

test.describe('Online payment through the hosted page', () => {
  test('paid: the order is confirmed, the receipt shows the online payment and the cart is emptied', async ({
    authenticatedPage: page,
    backend,
    brand,
  }) => {
    expect(await payAmount(page)).toBe(ONLINE[brand])
    await payButton(page).click()
    // The customer sees the payment is being opened, then the hosted page with the amount.
    await expect(page.getByTestId('mollie-page')).toBeVisible()
    await expect(page.getByText(`Montant ${ONLINE[brand].toFixed(2)} EUR`)).toBeVisible()
    const [pending] = await backend.mock.createdOrders()
    expect(pending?.input).toMatchObject({ isOnlinePayment: true, orderType: 'PICKUP' })
    expect(pending?.paymentStatus).toBe('open')

    await page.getByTestId('mollie-paid').click()
    await page.waitForURL('**/fr/order-completed/**')
    await expect(page.getByTestId('order-completed-title')).toBeVisible()
    await expect(page.getByTestId('order-completed-payment-problem')).toHaveCount(0)
    await expect(page.getByTestId('receipt-payment')).toContainText('Payé en ligne')
    await expect(page.getByTestId('receipt-online-fee')).toContainText('0,30')
    await expect(page.getByTestId('receipt-total')).toContainText(
      ONLINE[brand].toFixed(2).replace('.', ','),
    )
    await expect(page.getByTestId('receipt-subtotal')).toContainText(
      GOODS[brand].toFixed(2).replace('.', ','),
    )
    // The webhook confirmed it: the timeline is past "received".
    await expect(page.getByRole('list', { name: 'Suivi de la commande' })).toContainText(
      'Confirmée par le restaurant',
    )
    await expect.poll(async () => (await cartLines(page)).length).toBe(0)
    await expect(page.getByTestId('floating-cart-bar')).toHaveCount(0)
    await noHorizontalScroll(page, 'order-completed')
    const [order] = await backend.mock.createdOrders()
    expect(order?.status).toBe('CONFIRMED')
    expect(order?.paymentStatus).toBe('paid')
  })

  const unpaid = [
    { button: 'mollie-failed', title: 'Paiement échoué', status: 'FAILED', payment: 'failed' },
    {
      button: 'mollie-canceled',
      title: 'Paiement annulé',
      status: 'CANCELLED',
      payment: 'canceled',
    },
    { button: 'mollie-expired', title: 'Paiement expiré', status: 'CANCELLED', payment: 'expired' },
  ] as const
  for (const outcome of unpaid) {
    test(`${outcome.payment}: "${outcome.title}", the cart is kept and the customer can try again`, async ({
      authenticatedPage: page,
      backend,
    }) => {
      await goToMollie(page)
      await page.getByTestId(outcome.button).click()
      await page.waitForURL('**/fr/order-completed/**')

      const problem = returnedProblem(page)
      await expect(problem).toBeVisible()
      await expect(problem).toContainText(outcome.title)
      await expect(page.getByTestId('order-completed-title')).toHaveCount(0)
      await expect(problem.getByRole('link', { name: 'Retour au menu' })).toBeVisible()
      await noHorizontalScroll(page, 'payment problem')
      expect(await cartLines(page)).toHaveLength(1)
      const [order] = await backend.mock.createdOrders()
      expect(order).toMatchObject({ status: outcome.status, paymentStatus: outcome.payment })

      // "Réessayer" goes back to the checkout with the cart intact.
      await problem.getByRole('link', { name: 'Réessayer' }).click()
      await page.waitForURL('**/fr/checkout')
      await expect(payButton(page)).toBeVisible()
      expect(await cartLines(page)).toHaveLength(1)
    })
  }

  test('a failed payment followed by a successful retry ends in one confirmed order', async ({
    authenticatedPage: page,
    backend,
  }) => {
    await goToMollie(page)
    await page.getByTestId('mollie-failed').click()
    await page.waitForURL('**/fr/order-completed/**')
    await returnedProblem(page).getByRole('link', { name: 'Réessayer' }).click()
    await page.waitForURL('**/fr/checkout')
    await chooseCollection(page, 'pickup')
    await waitForQuote(page)

    await goToMollie(page)
    await page.getByTestId('mollie-paid').click()
    await page.waitForURL('**/fr/order-completed/**')
    await expect(page.getByTestId('order-completed-title')).toBeVisible()
    await expect.poll(async () => (await cartLines(page)).length).toBe(0)

    const orders = await backend.mock.createdOrders()
    expect(orders.map((order) => order.paymentStatus)).toEqual(['failed', 'paid'])
    // The confirmation is the retry's order, not the failed one.
    expect(page.url()).toContain(orders[1]?.id)
  })

  test('back from the payment page without paying leaves a usable checkout', async ({
    authenticatedPage: page,
    backend,
  }) => {
    await goToMollie(page)
    await page.goBack()
    await page.waitForURL('**/fr/checkout')
    await expect(payButton(page)).toBeVisible()
    await expect(page.getByText('Ouverture du paiement sécurisé')).toHaveCount(0)
    expect(await cartLines(page)).toHaveLength(1)
    // The order that was opened stays unpaid on the server; nothing else was created.
    const orders = await backend.mock.createdOrders()
    expect(orders).toHaveLength(1)
    expect(orders[0]?.paymentStatus).toBe('open')
  })

  test('returning before the webhook shows "verifying", then the confirmation once it lands', async ({
    authenticatedPage: page,
    backend,
  }) => {
    await goToMollie(page)
    await page.getByTestId('mollie-open').click()
    await page.waitForURL('**/fr/order-completed/**')
    // Never "payment failed" while the answer is simply late; the cart is untouched.
    await expect(page.getByTestId('order-completed-verifying')).toBeVisible()
    await expect(returnedProblem(page)).toHaveCount(0)
    expect(await cartLines(page)).toHaveLength(1)

    const [order] = await backend.mock.createdOrders()
    await backend.mock.settleOrder(order?.id ?? '', 'CONFIRMED', 'paid')
    await expect(page.getByTestId('order-completed-title')).toBeVisible()
    await expect(page.getByTestId('order-completed-verifying')).toHaveCount(0)
    await expect.poll(async () => (await cartLines(page)).length).toBe(0)
  })

  test('with a Mollie that answers at once (no buttons) the customer goes straight to the result', async ({
    authenticatedPage: page,
    backend,
  }) => {
    await backend.mock.scenario({ mollie: 'canceled' })
    await payButton(page).click()
    await page.waitForURL('**/fr/order-completed/**')
    await expect(returnedProblem(page)).toContainText('Paiement annulé')
  })
})

test.describe('Cash payment', () => {
  test('a cash order with an amount shows the change due, sends the amount and confirms on the receipt', async ({
    authenticatedPage: page,
    backend,
    brand,
  }) => {
    await choosePayment(page, 'cash')
    await page.getByTestId('cash-acknowledge').check()
    await waitForQuote(page)
    expect(await payAmount(page)).toBe(GOODS[brand])
    const amount = page.getByTestId('cash-payment-amount')
    await amount.fill('20,00') // A comma is accepted
    await expect(page.getByTestId('cash-amount-change')).toContainText(
      (20 - GOODS[brand]).toFixed(2).replace('.', ','),
    )
    await payButton(page).click()
    await page.waitForURL('**/fr/order-completed/**')

    const [order] = await backend.mock.createdOrders()
    expect(order?.input).toMatchObject({ isOnlinePayment: false })
    // The decimal comma typed by the customer travels as a decimal point.
    expect(order?.input?.cashPaymentAmount).toBe('20.00')
    const payment = page.getByTestId('receipt-payment')
    await expect(payment).toContainText('Espèces au retrait')
    await expect(payment).toContainText('Vous paierez avec 20,00')
    await expect(payment).toContainText(
      `monnaie à rendre : ${(20 - GOODS[brand]).toFixed(2).replace('.', ',')}`,
    )
    // A cash order is confirmed straight away: no payment screen, the cart is gone.
    await expect(page.getByTestId('order-completed-title')).toBeVisible()
    await expect.poll(async () => (await cartLines(page)).length).toBe(0)
  })

  test('an amount below the total is flagged and blocks the order until it is fixed or emptied', async ({
    authenticatedPage: page,
    backend,
  }) => {
    await choosePayment(page, 'cash')
    await page.getByTestId('cash-acknowledge').check()
    await waitForQuote(page)
    const amount = page.getByTestId('cash-payment-amount')
    await amount.fill('2')
    await payButton(page).click()

    await expect(page.getByTestId('cash-amount-short')).toBeVisible()
    await expect(page.getByTestId('cash-amount-short')).toContainText('inférieur au total')
    expect(await backend.mock.operations('createOrder')).toHaveLength(0)
    await expect(page).toHaveURL(/\/fr\/checkout/u)

    // Emptying the field is valid: the amount is optional.
    await amount.fill('')
    await expect(page.getByTestId('cash-amount-short')).toHaveCount(0)
    await payButton(page).click()
    await page.waitForURL('**/fr/order-completed/**')
    const [order] = await backend.mock.createdOrders()
    expect(order?.input?.cashPaymentAmount ?? null).toBeNull()
  })

  test('without the cash acknowledgement the order is refused with a pointer to the box', async ({
    authenticatedPage: page,
    backend,
  }) => {
    await choosePayment(page, 'cash')
    await waitForQuote(page)
    await payButton(page).click()
    await expect(
      page.getByRole('alert').filter({ hasText: 'À compléter avant de commander' }),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Merci de confirmer le paiement en espèces' }),
    ).toBeVisible()
    expect(await backend.mock.operations('createOrder')).toHaveLength(0)

    await page.getByTestId('cash-acknowledge').check()
    await expect(
      page.getByRole('alert').filter({ hasText: 'À compléter avant de commander' }),
    ).toHaveCount(0)
    await payButton(page).click()
    await page.waitForURL('**/fr/order-completed/**')
  })
})
