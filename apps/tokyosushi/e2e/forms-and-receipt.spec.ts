import { type SeededOrderStatus, deleteOrder, findUserIdByEmail, seedOrder } from './helpers/db'
import { dismissCookieConsent, waitForNuxtHydration } from './fixtures/cookie-consent.fixture'
import { expect, test } from './fixtures/auth.fixture'
import { SEL } from './helpers/selectors'
import { addProductsAndGoToCheckout } from './helpers/cart.helpers'

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
  test('is validated on blur, never while typing, and saves only on Enter or Save', async ({ authenticatedPage: page }) => {
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

test.describe('Product modal with choices', () => {
  test('a quantity of 2 keeps the choices valid and the button shows the line total', async ({ page }) => {
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
    const counters = await modal.locator('span.text-xs.font-semibold.whitespace-nowrap').allInnerTexts()
    if (counters.some((counter) => !/\/1$/u.test(counter.trim()))) {
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

  test.afterEach(() => {
    if (orderId) deleteOrder(orderId)
    orderId = null
  })

  const userId = (): string => {
    const email = process.env.E2E_USER_EMAIL
    if (!email) throw new Error('E2E_USER_EMAIL must be set')
    return findUserIdByEmail(email)
  }

  const cases: { label: string; online: boolean; status: SeededOrderStatus; payment: RegExp }[] = [
    { label: 'cash pickup', online: false, status: 'CONFIRMED', payment: /Espèces au retrait/u },
    { label: 'paid online', online: true, status: 'CONFIRMED', payment: /Payé en ligne/u },
  ]

  cases.forEach(({ label, online, status, payment }) => {
    test(`${label}: total, payment method and pickup point`, async ({ authenticatedPage: page }) => {
      // The seeded order is a 25,00 € pickup order (see helpers/db.ts seedOrder).
      orderId = seedOrder({ userId: userId(), status, online, paymentStatus: online ? 'paid' : undefined })
      await page.goto(`/fr/order-completed/${orderId}`)

      const receipt = page.locator('[data-testid="order-receipt"]')
      await expect(receipt).toBeVisible({ timeout: 20_000 })
      await expect(receipt.locator('[data-testid="receipt-total"]')).toContainText(/25,00/u)
      await expect(receipt.locator('[data-testid="receipt-payment"]')).toContainText(payment)
      // No delivery row on a pickup order; the pickup point is the restaurant.
      await expect(receipt.locator('[data-testid="receipt-delivery"]')).toHaveCount(0)
      await expect(receipt.locator('[data-testid="receipt-destination"]')).toContainText(/Rue de la Cathédrale 59/u)
      if (online) await expect(receipt.locator('[data-testid="receipt-online-fee"]')).toContainText(/0,30/u)
    })
  })
})
