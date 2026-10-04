import { type Page } from '@playwright/test'
import {
  chooseCollection,
  choosePayment,
  fillCart,
  gotoCheckout,
  payAmount,
  payButton,
  pickDeliveryAddress,
  summaryRow,
  waitForQuote,
} from './support/order-flow'
import { expect, test } from './support/test'

/*
 * Delivery on the phone checkout (Tokyo Sushi: YGF is takeaway-only, its last test says so): the address chosen through
 * the autocomplete, the fee of each distance tier, an address out of the zone or in an excluded postcode, the delivery
 * minimum, the pickup discount, and switching between the two collection modes. Every total on screen is checked against
 * the quote the app sent to the mock and against the order the mock created.
 *
 * The cart is Ramen 14,50 + Maki 6,50 + Nigiri 5,90 = 26,90 (above the 25,00 delivery minimum, discountable).
 */

test.skip(({ mock }) => !mock, 'needs the mock tsb-service (addresses, quote, created orders)')
test.skip(({ isMobile }) => !isMobile, 'phone layout')

const CART = ['Ramen tonkotsu', 'Maki saumon', 'Nigiri thon']
const PHONE = '+32470123456'

test.describe('Delivery checkout (Tokyo Sushi)', () => {
  test.beforeEach(async ({ brand, backend }) => {
    test.skip(brand !== 'tokyosushi', 'takeaway-only brand')
    await backend.mock.user({ phoneNumber: PHONE })
  })

  /* Distances: place-home 1,8 km, place-mid 3,5 km, place-far 8,2 km (fee tiers of the mock policy). */
  const tiers = [
    { place: 'place-home', query: 'Saint-Gilles 12', fee: 'Gratuit', total: 27.2, km: '1.8' },
    { place: 'place-mid', query: 'Blonden 33', fee: '1,00', total: 28.2, km: '3.5' },
    { place: 'place-far', query: 'Rue de Herve 150', fee: '6,00', total: 33.2, km: '8.2' },
  ]
  for (const tier of tiers) {
    test(`the address ${tier.place} (${tier.km} km) is charged ${tier.fee} and the total follows`, async ({
      authenticatedPage: page,
      backend,
    }) => {
      await fillCart(page, CART)
      await gotoCheckout(page)
      await chooseCollection(page, 'delivery')
      await expect(summaryRow(page, 'Frais de livraison')).toContainText('à déterminer', {
        ignoreCase: true,
      })

      await pickDeliveryAddress(page, tier.query)
      await waitForQuote(page)
      await expect(page.locator('#checkout-delivery-address')).toContainText(`${tier.km} km`)
      await expect(summaryRow(page, 'Frais de livraison')).toContainText(tier.fee, {
        ignoreCase: true,
      })
      // 26,90 goods + fee + 0,30 online payment fee, rounded to 0,10.
      expect(await payAmount(page)).toBe(tier.total)
      await expect(summaryRow(page, 'Total')).toContainText(tier.total.toFixed(2).replace('.', ','))

      // What the server was asked is what the customer sees priced.
      const quote = (await backend.mock.operations('quoteOrder')).at(-1)
      expect(quote?.args.input).toMatchObject({
        orderType: 'DELIVERY',
        addressPlaceId: tier.place,
      })
    })
  }

  test('an address beyond the delivery radius blocks the order and offers pickup instead', async ({
    authenticatedPage: page,
    backend,
  }) => {
    await fillCart(page, CART)
    await gotoCheckout(page)
    await chooseCollection(page, 'delivery')
    await pickDeliveryAddress(page, 'Rue de la Station 7')
    await waitForQuote(page)

    await expect(page.locator('#checkout-delivery-address')).toContainText(
      'Trop loin pour la livraison (max 9 km)',
    )
    await expect(summaryRow(page, 'Frais de livraison')).toContainText('Trop loin')
    // The server quote says so too, and the pay button is off.
    await expect(page.getByTestId('checkout-quote-issues')).toBeVisible()
    await expect(payButton(page)).toBeDisabled()
    expect(await backend.mock.operations('createOrder')).toHaveLength(0)

    // The way out: pick up instead; the order can be paid again, with the pickup discount.
    await page.getByTestId('cart-out-of-zone-switch-to-pickup').click()
    await expect(page.getByTestId('checkout-option-pickup')).toHaveAttribute('aria-checked', 'true')
    await expect(page.getByTestId('checkout-quote-issues')).toHaveCount(0)
    await expect(payButton(page)).toBeEnabled()
    await waitForQuote(page)
    await expect(summaryRow(page, /Remise/u)).toContainText('2,70')
  })

  test('an address in an excluded postcode is refused with its own reason', async ({
    authenticatedPage: page,
  }) => {
    await fillCart(page, CART)
    await gotoCheckout(page)
    await chooseCollection(page, 'delivery')
    await pickDeliveryAddress(page, 'Grétry 9')
    await waitForQuote(page)

    await expect(page.locator('#checkout-delivery-address')).toContainText(
      'Nous ne livrons pas dans votre zone.',
    )
    await expect(summaryRow(page, 'Frais de livraison')).toContainText(
      'Nous ne livrons pas dans votre zone.',
    )
    await expect(page.getByTestId('checkout-quote-issues')).toBeVisible()
    await expect(payButton(page)).toBeDisabled()
  })

  test('below the delivery minimum the order is blocked until the basket grows or pickup is chosen', async ({
    authenticatedPage: page,
    backend,
  }) => {
    await backend.mock.user({ address: 'place-home' })
    await fillCart(page, ['Edamame']) // 4,50
    await gotoCheckout(page)
    await chooseCollection(page, 'delivery')
    await waitForQuote(page)

    const banner = page.locator('#checkout-minimum-order-banner')
    await expect(banner).toContainText('Livraison minimum de 25')
    await expect(payButton(page)).toBeDisabled()

    // More Edamame: 6 x 4,50 = 27,00, the banner goes and Pay comes back.
    const more = page.getByRole('button', { name: 'Augmenter la quantité de Edamame' })
    for (let i = 0; i < 5; i += 1) await more.click()
    await expect(banner).toHaveCount(0)
    await waitForQuote(page)
    await expect(payButton(page)).toBeEnabled()
    // 27,00 goods + free delivery (1,8 km) + 0,30 online fee.
    expect(await payAmount(page)).toBe(27.3)

    // Back under the minimum, then pickup lifts the block (there is no minimum for pickup).
    const fewer = page.getByRole('button', { name: 'Diminuer la quantité de Edamame' })
    for (let i = 0; i < 5; i += 1) await fewer.click()
    await expect(banner).toBeVisible()
    await chooseCollection(page, 'pickup')
    await expect(banner).toHaveCount(0)
    await waitForQuote(page)
    await expect(payButton(page)).toBeEnabled()
  })

  test('switching between pickup and delivery updates the breakdown, the total and the quote', async ({
    authenticatedPage: page,
    backend,
  }) => {
    await backend.mock.user({ address: 'place-mid' })
    await fillCart(page, CART)
    await gotoCheckout(page)

    await chooseCollection(page, 'pickup')
    await waitForQuote(page)
    // Pickup: 10 % off the goods (2,69 snapped to 0,10: -2,70), no delivery row, online fee: 24,50 + 0,30 = 24,50 after rounding.
    await expect(summaryRow(page, /Remise/u)).toContainText('2,70')
    await expect(page.locator('#checkout-delivery-address')).toHaveCount(0)
    expect(await payAmount(page)).toBe(24.5)

    await chooseCollection(page, 'delivery')
    await waitForQuote(page)
    // Delivery to the saved address (3,5 km: 1,00): no discount, 26,90 + 1,00 + 0,30 = 28,20.
    await expect(page.locator('#checkout-delivery-address')).toContainText('3.5 km')
    await expect(summaryRow(page, /Remise/u)).toHaveCount(0)
    await expect(summaryRow(page, 'Frais de livraison')).toContainText('1,00')
    expect(await payAmount(page)).toBe(28.2)

    await chooseCollection(page, 'pickup')
    await waitForQuote(page)
    expect(await payAmount(page)).toBe(24.5)

    const kinds = (await backend.mock.operations('quoteOrder')).map(
      (entry) => (entry.args.input as { orderType: string }).orderType,
    )
    expect(kinds).toContain('PICKUP')
    expect(kinds).toContain('DELIVERY')
    expect(kinds.at(-1)).toBe('PICKUP')
  })

  test('a delivery order is created for the chosen address with the fee the customer saw', async ({
    authenticatedPage: page,
    backend,
  }) => {
    await fillCart(page, CART)
    await gotoCheckout(page)
    await chooseCollection(page, 'delivery')
    await pickDeliveryAddress(page, 'Blonden 33')
    await choosePayment(page, 'cash')
    await page.getByTestId('cash-acknowledge').check()
    await waitForQuote(page)
    await page.locator('#addressExtra').fill('2e étage, sonnez deux fois')
    // Cash: no online fee: 26,90 + 1,00 = 27,90.
    expect(await payAmount(page)).toBe(27.9)
    await payButton(page).click()
    await page.waitForURL('**/fr/order-completed/**')

    const [order] = await backend.mock.createdOrders()
    expect(order?.type).toBe('DELIVERY')
    expect(order?.total).toBe('27.90')
    expect(order?.input).toMatchObject({
      orderType: 'DELIVERY',
      addressPlaceId: 'place-mid',
      addressExtra: '2e étage, sonnez deux fois',
      isOnlinePayment: false,
    })
    await expect(page.getByTestId('receipt-delivery')).toContainText('1,00')
    await expect(page.getByTestId('receipt-destination')).toContainText('Avenue Blonden 33')
  })
})

test.describe('Before signing in', () => {
  /** The address field of the zone gate (no dialog: the picker is the page). */
  async function pickGateAddress(page: Page, query: string) {
    const input = page.getByRole('combobox')
    await input.fill(query)
    const suggestion = page.getByRole('option').first()
    await expect(suggestion).toBeVisible()
    await suggestion.dispatchEvent('mousedown')
  }
  const gate = (page: Page) => page.getByRole('heading', { name: 'Avant de continuer' })
  const authStep = (page: Page) =>
    page.getByRole('heading', { name: /Plus qu.une étape, connectez-vous/u })

  test.beforeEach(({ brand }) => {
    test.skip(brand !== 'tokyosushi', 'takeaway-only brand: no zone to check')
  })

  test('a delivery customer who is not signed in must give a deliverable address before being asked to log in', async ({
    page,
    backend,
  }) => {
    await fillCart(page, CART)
    await page.goto('/fr/checkout')
    await page
      .getByRole('radio', { name: /Livraison/u })
      .first()
      .click()
    await expect(gate(page)).toBeVisible()
    await expect(authStep(page)).toHaveCount(0)

    // Out of the zone: told why, offered pickup, still no login step.
    await pickGateAddress(page, 'Rue de la Station 7')
    await expect(
      page.getByRole('status').filter({ hasText: 'hors de notre zone de 9 km' }),
    ).toBeVisible()
    await expect(gate(page)).toBeVisible()
    await expect(authStep(page)).toHaveCount(0)

    // A deliverable one: the gate opens onto the sign-in step, and the cart is safe.
    await page.getByRole('button', { name: 'Modifier', exact: true }).click()
    await pickGateAddress(page, 'Saint-Gilles 12')
    await expect(authStep(page)).toBeVisible()
    await expect(gate(page)).toHaveCount(0)
    await expect(page.getByText('Votre panier est sauvegardé')).toContainText('3 articles')
    expect(await backend.mock.operations('createOrder')).toHaveLength(0)
  })

  test('choosing pickup from the gate goes straight to the sign-in step', async ({ page }) => {
    await fillCart(page, CART)
    await page.goto('/fr/checkout')
    await page
      .getByRole('radio', { name: /Livraison/u })
      .first()
      .click()
    await expect(gate(page)).toBeVisible()
    await page
      .getByRole('radio', { name: /À emporter/u })
      .first()
      .click()
    await expect(authStep(page)).toBeVisible()
    await expect(gate(page)).toHaveCount(0)
  })
})

test.describe('Takeaway-only brand (YGF)', () => {
  test('delivery is offered as "soon", pickup is selected and the pickup discount kicks in at 20,00', async ({
    authenticatedPage: page,
    backend,
    brand,
  }) => {
    test.skip(brand !== 'ygfliege', 'delivery brand')
    await backend.mock.user({ phoneNumber: PHONE })
    await fillCart(page, ['Gyoza de bœuf', 'Mochi']) // 5,50 + 3,90
    await gotoCheckout(page)

    const delivery = page.getByTestId('checkout-option-delivery')
    await expect(delivery).toBeDisabled()
    await expect(delivery).toContainText('Bientôt disponible')
    await expect(page.getByTestId('checkout-option-pickup')).toHaveAttribute('aria-checked', 'true')
    await expect(page.locator('#checkout-delivery-address')).toHaveCount(0)
    await waitForQuote(page)
    // 9,40 of goods is under the threshold: no discount, only the 0,30 online fee.
    await expect(summaryRow(page, /Remise/u)).toHaveCount(0)
    expect(await payAmount(page)).toBe(9.7)

    // Three gyoza: 16,50 + 3,90 = 20,40, so 10 % off (2,04, snapped to 2,00): 18,40 + 0,30 = 18,70.
    const more = page.getByRole('button', { name: 'Augmenter la quantité de Gyoza de bœuf' })
    await more.click()
    await more.click()
    await waitForQuote(page)
    await expect(summaryRow(page, /Remise/u)).toContainText('2,00')
    expect(await payAmount(page)).toBe(18.7)
    const quote = (await backend.mock.operations('quoteOrder')).at(-1)
    expect(quote?.args.input).toMatchObject({ orderType: 'PICKUP', addressPlaceId: null })
  })
})
