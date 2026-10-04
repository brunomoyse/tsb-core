import { type Page, type Route } from '@playwright/test'
import { dismissCookieConsent, waitForNuxtHydration } from './support/hydration'
import { expect, test } from './support/test'
import { SEL } from './support/selectors'
import { addProductsAndGoToCheckout } from './support/cart.helpers'
import type { OrderStatus } from './mock/types'

/*
 * Audit PR 2.8: phone entry (M22), a quantity-2 product with choices in the product modal (M23) and the
 * values of the confirmation receipt (M24). The cash amount (M25) and the profile double submit are
 * covered by the node tests of the pure logic (cashPayment / orderReceipt) and by the smoke run in the PR.
 */

/** "Ajouter · 21,50 €" -> 2150 (cents). */
const centsIn = (text: string): number => {
  const match = /(?<euros>\d+),(?<cents>\d{2})/u.exec(text)
  return match?.groups ? Number(match.groups.euros) * 100 + Number(match.groups.cents) : 0
}

test.describe('Checkout phone capture', () => {
  test('is validated on blur, never while typing, and saves only on Enter or Save', async ({
    authenticatedPage: page,
  }) => {
    await addProductsAndGoToCheckout(page)

    const capture = page.locator('#checkout-phone-capture')
    await expect(capture).toBeVisible()
    const input = capture.locator('[data-testid="checkout-phone-input"]')
    // A customer who already has a number sees it collapsed: open the editor (the button has its own accessible name).
    if (!(await input.isVisible().catch(() => false))) {
      await capture.getByRole('button', { name: 'Modifier le numéro de téléphone' }).click()
    }
    await expect(input).toBeVisible()

    // A Belgian number typed slowly: no error and no save while the customer is still typing.
    await input.fill('')
    await input.pressSequentially('0470', { delay: 200 })
    await page.waitForTimeout(1_000)
    await expect(page.locator('#checkout-phone-error')).toHaveCount(0)
    await expect(input).toBeVisible()

    // Leaving the field: "incomplete", wired to the input for screen readers.
    await input.blur()
    const error = page.locator('#checkout-phone-error')
    await expect(error).toBeVisible()
    await expect(error).toHaveAttribute('role', 'alert')
    await expect(error).toContainText(/incomplet/iu)
    await expect(error).not.toContainText(/indicatif/iu)
    await expect(input).toHaveAttribute('aria-invalid', 'true')
    await expect(input).toHaveAttribute('aria-describedby', 'checkout-phone-error')

    // Typing clears the error; a complete number is still not saved or collapsed by typing alone.
    await input.pressSequentially(' 12 34 56', { delay: 50 })
    await expect(error).toHaveCount(0)
    await page.waitForTimeout(1_000)
    await expect(input).toBeVisible()
    await expect(capture.locator('[data-testid="checkout-phone-save"]')).toBeVisible()

    // Do not change the test account: close the editor without saving when there was a saved number.
    const cancel = capture.locator('[data-testid="checkout-phone-cancel"]')
    if (await cancel.isVisible().catch(() => false)) await cancel.click()
  })
})

/*
 * Pay with a number that was typed but not saved (audit PR 2.8 review). The GraphQL calls that would change
 * the test account or create an order are answered by the test: `updateMe` echoes the number, `createOrder`
 * fails on purpose, so nothing real is written. Everything else (quote, config) goes to the API.
 */
interface PhoneOrderCalls {
  updateMe: string[]
  createOrder: number
  log: string[]
}

async function stubPhoneAndOrderMutations(page: Page): Promise<PhoneOrderCalls> {
  const calls: PhoneOrderCalls = { updateMe: [], createOrder: 0, log: [] }
  await page.route('**/graphql', async (route: Route) => {
    const body = route.request().postData() ?? ''
    if (route.request().method() === 'POST' && body.includes('updateMe(')) {
      const input = (JSON.parse(body) as { variables?: { input?: { phoneNumber?: string } } })
        .variables?.input
      calls.updateMe.push(input?.phoneNumber ?? '')
      calls.log.push('updateMe')
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          data: { updateMe: { id: 'e2e', phoneNumber: input?.phoneNumber ?? null } },
        }),
      })
      return
    }
    if (route.request().method() === 'POST' && body.includes('createOrder(')) {
      calls.createOrder++
      calls.log.push('createOrder')
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ data: null, errors: [{ message: 'e2e: order not created' }] }),
      })
      return
    }
    await route.fallback()
  })
  return calls
}

async function openCashCheckout(page: Page): Promise<void> {
  await addProductsAndGoToCheckout(page)
  await page
    .locator('[data-testid="checkout-restaurant-closed"], [data-testid="checkout-place-order"]')
    .first()
    .waitFor({ timeout: 10_000 })
  if (await page.locator('[data-testid="checkout-restaurant-closed"]').isVisible()) {
    test.skip(true, 'Restaurant is currently closed')
    return
  }
  await page.locator('[data-testid="payment-cash"]').click()
  await page.locator('[data-testid="cash-acknowledge"]').check()
}

/** Opens the phone editor when the account already has a number (collapsed card). */
async function openPhoneEditor(page: Page) {
  const capture = page.locator('#checkout-phone-capture')
  const input = capture.locator('[data-testid="checkout-phone-input"]')
  if (!(await input.isVisible().catch(() => false))) {
    await capture.getByRole('button', { name: 'Modifier le numéro de téléphone' }).click()
  }
  await expect(input).toBeVisible()
  return { capture, input }
}

test.describe('Pay with an unsaved phone number', () => {
  test('a valid number typed but not saved is saved first and the order goes on with it', async ({
    authenticatedPage: page,
  }) => {
    const calls = await stubPhoneAndOrderMutations(page)
    await openCashCheckout(page)
    const { capture, input } = await openPhoneEditor(page)

    // A French number: valid with its country code, and not one of the Belgian numbers the hard-coded-phone lint hunts for.
    await input.fill('+33 6 12 34 56 78')
    await page.locator('[data-testid="checkout-place-order"]').first().click()

    // The number is saved (as E.164) before the order is sent; the customer is not told to "add" a number.
    await expect.poll(() => calls.createOrder, { timeout: 15_000 }).toBeGreaterThan(0)
    expect(calls.updateMe).toEqual(['+33612345678'])
    expect(calls.log.indexOf('updateMe')).toBeLessThan(calls.log.indexOf('createOrder'))
    // The saved number is shown as the API returned it (E.164) or formatted: either way all its digits.
    await expect(capture).toContainText(/\+33\s?6\s?12\s?34\s?56\s?78/u)
    await expect(capture.locator('[data-testid="checkout-phone-input"]')).toHaveCount(0)
  })

  test('an incomplete number blocks the order and the field says why', async ({
    authenticatedPage: page,
  }) => {
    const calls = await stubPhoneAndOrderMutations(page)
    await openCashCheckout(page)
    const { input } = await openPhoneEditor(page)

    await input.fill('0470')
    await page.locator('[data-testid="checkout-place-order"]').first().click()

    await expect(page.locator('#checkout-phone-error')).toContainText(/incomplet/iu)
    await expect(page.locator('#checkout-phone-capture')).toBeVisible()
    await expect(page.getByText(/Enregistrez ou corrigez votre numéro/u).first()).toBeVisible()
    await page.waitForTimeout(1_000)
    expect(calls.updateMe).toEqual([])
    expect(calls.createOrder).toBe(0)
  })
})

test.describe('Product modal with choices', () => {
  test('a quantity of 2 keeps the choices valid and the button shows the line total', async ({
    page,
  }) => {
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
    await expect(page.locator(SEL.productModal)).toBeVisible({ timeout: 15_000 })

    const add = page.locator(SEL.productModalAddToCart)
    const modal = page.locator(SEL.productModal)

    // Satisfy every group at quantity 1 (one "+" per pick-one group is enough; stop when Add unlocks).
    const incs = modal.locator(SEL.productModalChoiceInc)
    for (let i = 0; i < 30 && (await add.isDisabled()); i++) {
      const enabled = modal.locator(`${SEL.productModalChoiceInc}:not([disabled])`).first()
      if (!(await enabled.isVisible().catch(() => false))) break
      await enabled.click()
    }
    if (await add.isDisabled()) {
      test.skip(true, 'The first choice product could not be satisfied generically')
      return
    }
    expect(await incs.count()).toBeGreaterThan(0)

    // Only products whose groups are all pick-one are scaled for the customer; others need their own picks.
    const counters = await modal
      .locator('span.text-xs.font-semibold.whitespace-nowrap')
      .allInnerTexts()
    if (counters.some((counter) => !counter.trim().endsWith('/1'))) {
      test.skip(true, 'The first choice product has a multi-select group')
      return
    }

    const unit = centsIn(await add.innerText())
    expect(unit).toBeGreaterThan(0)

    await modal.getByRole('button', { name: 'Augmenter la quantité' }).last().click()

    // The choices stay valid (Add is not locked) and the button shows the line total: twice the unit price.
    await expect(add).toBeEnabled()
    expect(centsIn(await add.innerText())).toBe(unit * 2)
  })
})

test.describe('Order confirmation receipt', () => {
  let orderId: string | null = null

  test.afterEach(async ({ backend }) => {
    if (orderId) await backend.deleteOrder(orderId)
    orderId = null
  })

  // Each brand's pickup point is its own restaurant (apps/<brand>/brand.ts address.street).
  const PICKUP_POINT = {
    tokyosushi: /Rue de la Cathédrale 59/u,
    ygfliege: /Rue de la Cathédrale 51/u,
  }

  const cases: {
    label: string
    online: boolean
    status: OrderStatus
    payment: RegExp
    total: RegExp
  }[] = [
    {
      label: 'cash pickup',
      online: false,
      status: 'CONFIRMED',
      payment: /Espèces au retrait/u,
      total: /25,00/u,
    },
    {
      label: 'paid online',
      online: true,
      status: 'CONFIRMED',
      payment: /Payé en ligne/u,
      total: /25,30/u,
    },
  ]

  cases.forEach(({ label, online, status, payment, total }) => {
    test(`${label}: rows add up to the total, payment method and pickup point`, async ({
      authenticatedPage: page,
      backend,
      brand,
    }) => {
      // The seeded order is a pickup order with one 25,00 € item (see backend.seedOrder, withItem): 25,00 € cash, 25,30 € online (0,30 € fee).
      orderId = await backend.seedOrder({
        status,
        online,
        paymentStatus: online ? 'paid' : undefined,
        withItem: true,
      })
      await page.goto(`/fr/order-completed/${orderId}`)

      const receipt = page.locator('[data-testid="order-receipt"]')
      await expect(receipt).toBeVisible({ timeout: 20_000 })
      // Subtotal is the items; nothing is rounded away, so there is no rounding line and the total is the sum of the rows.
      await expect(receipt.locator('[data-testid="receipt-subtotal"]')).toContainText(/25,00/u)
      await expect(receipt.locator('[data-testid="receipt-rounding"]')).toHaveCount(0)
      await expect(receipt.locator('[data-testid="receipt-total"]')).toContainText(total)
      await expect(receipt.locator('[data-testid="receipt-payment"]')).toContainText(payment)
      // No delivery row on a pickup order; the pickup point is the restaurant.
      await expect(receipt.locator('[data-testid="receipt-delivery"]')).toHaveCount(0)
      await expect(receipt.locator('[data-testid="receipt-destination"]')).toContainText(
        PICKUP_POINT[brand],
      )
      if (online)
        await expect(receipt.locator('[data-testid="receipt-online-fee"]')).toContainText(/0,30/u)
      else await expect(receipt.locator('[data-testid="receipt-online-fee"]')).toHaveCount(0)
    })
  })
})
