import {
  type SeededOrderStatus,
  deleteOrder,
  findUserIdByEmail,
  seedOrder,
  settleOrder,
} from './support/db'
import { expect, test } from './support/test'
import { type Page } from '@playwright/test'
import { SEL } from './support/selectors'

/*
 * Coming back from Mollie is ALWAYS a full page load of /<locale>/order-completed/<id>
 * (tsb-service builds the redirect URL), and the order query is client-only, so
 * the order is still null when the page's setup runs. These specs reproduce that
 * with `page.goto` and a pre-seeded cart in localStorage, against orders created
 * directly in the DB in the state the Mollie webhook would have left them in.
 *
 * Contract (useOrderCompleted):
 *   cancelled / failed / expired payment -> retry screen, cart untouched
 *   open payment on a CANCELLED order    -> retry screen, cart untouched
 *   open / pending payment               -> "verifying" (never a verdict), cart untouched; if still pending after the
 *                                           verify window: neutral "awaiting confirmation" (no retry), cart untouched
 *   paid online order or cash order      -> confirmation, cart cleared, but only the cart that
 *                                           was checked out for THAT order (cart.pendingOrderId)
 */

const CART_KEY = 'cart'

/* `pendingOrderId` is what the checkout stores on submit; null = a cart that was not checked out for this order. */
const seededCart = (pendingOrderId: string | null) =>
  JSON.stringify({
    products: [
      {
        product: {
          id: '00000000-0000-4000-8000-0000000000e2',
          categoryId: '00000000-0000-4000-8000-0000000000c1',
          code: 'E2E1',
          slug: 'e2e-seeded-product',
          name: 'E2E seeded product',
          description: null,
          price: '12.50',
          pieceCount: null,
          choices: [],
          isAvailable: true,
          isDiscountable: true,
          isHalal: false,
          isLunchOnly: false,
          isSpicy: false,
          isVegetarian: false,
          isVisible: true,
          category: {
            id: '00000000-0000-4000-8000-0000000000c1',
            name: 'E2E',
            order: 1,
            slug: 'e2e',
            products: [],
          },
        },
        quantity: 2,
        selectedChoices: [],
        selectedChoice: null,
      },
    ],
    collectionOption: 'PICKUP',
    couponCode: null,
    couponDiscountCents: 0,
    paymentOption: 'ONLINE',
    cashPaymentAmount: null,
    address: null,
    addressExtra: null,
    orderExtra: [],
    orderNote: null,
    preferredReadyTime: null,
    pendingOrderId,
  })

/*
 * Seed once per tab: addInitScript re-runs on every navigation, and a second
 * run would resurrect a cart the page legitimately cleared.
 */
async function seedCart(page: Page, pendingOrderId: string | null) {
  await page.addInitScript(
    (seed: { key: string; value: string }) => {
      if (sessionStorage.getItem('e2e_cart_seeded')) return
      sessionStorage.setItem('e2e_cart_seeded', '1')
      localStorage.setItem(seed.key, seed.value)
    },
    { key: CART_KEY, value: seededCart(pendingOrderId) },
  )
}

const cartLineCount = (page: Page): Promise<number> =>
  page.evaluate((key) => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? (JSON.parse(raw).products?.length ?? 0) : 0
    } catch {
      return -1
    }
  }, CART_KEY)

function userId(): string {
  const email = process.env.E2E_USER_EMAIL
  if (!email) throw new Error('E2E_USER_EMAIL must be set')
  return findUserIdByEmail(email)
}

test.describe('Mollie return (full page load)', () => {
  let orderId: string | null = null

  test.afterEach(() => {
    if (orderId) deleteOrder(orderId)
    orderId = null
  })

  const problemCases: { payment: string; status: SeededOrderStatus }[] = [
    { payment: 'canceled', status: 'CANCELLED' },
    { payment: 'failed', status: 'FAILED' },
    { payment: 'expired', status: 'CANCELLED' },
    // The order was already cancelled: the open payment is dead, so a retry is safe.
    { payment: 'open', status: 'CANCELLED' },
  ]

  problemCases.forEach(({ payment, status }) => {
    test(`${payment} payment keeps the cart and offers a retry`, async ({
      authenticatedPage: page,
    }) => {
      orderId = seedOrder({ userId: userId(), status, online: true, paymentStatus: payment })
      await seedCart(page, orderId)

      await page.goto(`/fr/order-completed/${orderId}`)

      const problem = page.locator(SEL.orderCompletedPaymentProblem)
      await expect(problem).toBeVisible({ timeout: 20_000 })
      // No celebratory hero for an unpaid order.
      await expect(page.locator(SEL.orderCompletedTitle)).toHaveCount(0)
      // The regression: the cart used to be wiped before the order had loaded.
      expect(await cartLineCount(page)).toBe(1)

      await problem.locator('a[href$="/checkout"]').click()
      await page.waitForURL('**/fr/checkout')
      expect(await cartLineCount(page)).toBe(1)
    })
  })

  test('a late webhook shows "verifying", never "payment failed", and clears the cart once paid', async ({
    authenticatedPage: page,
  }) => {
    orderId = seedOrder({
      userId: userId(),
      status: 'PENDING',
      online: true,
      paymentStatus: 'open',
    })
    await seedCart(page, orderId)

    await page.goto(`/fr/order-completed/${orderId}`)

    await expect(page.locator(SEL.orderCompletedVerifying)).toBeVisible({ timeout: 20_000 })
    await expect(page.locator(SEL.orderCompletedPaymentProblem)).toHaveCount(0)
    await expect(page.locator(SEL.orderCompletedTitle)).toHaveCount(0)
    expect(await cartLineCount(page)).toBe(1)

    // The webhook lands while the page is verifying (the verify loop polls for ~17 s).
    settleOrder(orderId, 'CONFIRMED', 'paid')

    await expect(page.locator(SEL.orderCompletedTitle)).toBeVisible({ timeout: 20_000 })
    await expect(page.locator(SEL.orderCompletedPaymentProblem)).toHaveCount(0)
    await expect.poll(() => cartLineCount(page)).toBe(0)
  })

  test('still pending after the verify window: neutral "awaiting confirmation", no retry, cart kept', async ({
    authenticatedPage: page,
  }) => {
    test.setTimeout(120_000) // ~17 s verify window + the webhook step
    orderId = seedOrder({
      userId: userId(),
      status: 'PENDING',
      online: true,
      paymentStatus: 'open',
    })
    await seedCart(page, orderId)

    await page.goto(`/fr/order-completed/${orderId}`)

    // The verify loop gives up after ~17 s; the page must NOT then invite a second payment.
    const waiting = page.locator(SEL.orderCompletedAwaitingConfirmation)
    await expect(waiting).toBeVisible({ timeout: 40_000 })
    await expect(page.locator(SEL.orderCompletedPaymentProblem)).toHaveCount(0)
    await expect(waiting.locator('a[href$="/checkout"]')).toHaveCount(0)
    await expect(waiting.locator('a[href^="tel:"]')).toHaveCount(1)
    expect(await cartLineCount(page)).toBe(1)

    // The late webhook finally lands: the page updates by itself and the cart is committed.
    settleOrder(orderId, 'CONFIRMED', 'paid')
    await expect(page.locator(SEL.orderCompletedTitle)).toBeVisible({ timeout: 30_000 })
    await expect.poll(() => cartLineCount(page)).toBe(0)
  })

  test('a paid online order clears the cart', async ({ authenticatedPage: page }) => {
    orderId = seedOrder({
      userId: userId(),
      status: 'CONFIRMED',
      online: true,
      paymentStatus: 'paid',
    })
    await seedCart(page, orderId)

    await page.goto(`/fr/order-completed/${orderId}`)

    await expect(page.locator(SEL.orderCompletedTitle)).toBeVisible({ timeout: 20_000 })
    await expect(page.locator(SEL.orderCompletedPaymentProblem)).toHaveCount(0)
    await expect.poll(() => cartLineCount(page)).toBe(0)
  })

  test('a cash order clears the cart', async ({ authenticatedPage: page }) => {
    orderId = seedOrder({ userId: userId(), status: 'CONFIRMED', online: false })
    await seedCart(page, orderId)

    await page.goto(`/fr/order-completed/${orderId}`)

    await expect(page.locator(SEL.orderCompletedTitle)).toBeVisible({ timeout: 20_000 })
    await expect.poll(() => cartLineCount(page)).toBe(0)
  })

  /* Transitional, delete after 2026-11-15 together with the fallback in useOrderCompleted:
     a checkout that ran on the previous bundle left no pendingOrderId behind. */
  test('transitional: a cart without pendingOrderId is cleared for an order created minutes ago', async ({
    authenticatedPage: page,
  }) => {
    orderId = seedOrder({
      userId: userId(),
      status: 'CONFIRMED',
      online: true,
      paymentStatus: 'paid',
    })
    await seedCart(page, null)

    await page.goto(`/fr/order-completed/${orderId}`)

    await expect(page.locator(SEL.orderCompletedTitle)).toBeVisible({ timeout: 20_000 })
    await expect.poll(() => cartLineCount(page)).toBe(0)
  })

  test('revisiting a paid order later does not clear a newer cart', async ({
    authenticatedPage: page,
  }) => {
    // Older than the transitional 30-minute window, and the cart is not the one checked out for it.
    orderId = seedOrder({
      userId: userId(),
      status: 'CONFIRMED',
      online: true,
      paymentStatus: 'paid',
      createdMinutesAgo: 45,
    })
    // The customer already started a new order: the cart is not the one checked out for `orderId`.
    await seedCart(page, null)

    await page.goto(`/fr/order-completed/${orderId}`)

    await expect(page.locator(SEL.orderCompletedTitle)).toBeVisible({ timeout: 20_000 })
    expect(await cartLineCount(page)).toBe(1)
  })
})
