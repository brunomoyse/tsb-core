import { type Page } from '@playwright/test'
import {
  addPlain,
  cartLines,
  chooseCollection,
  choosePayment,
  eurosOf,
  fillCart,
  gotoMenu,
  openCart,
  openProductModal,
  payAmount,
  payButton,
  pickChoice,
  pickDeliveryAddress,
  waitForQuote,
} from './support/order-flow'
import { expect, test } from './support/test'

/*
 * What differs on a desktop (1440 px), both brands: the side cart with its own pickup/delivery switch and totals, the
 * checkout in columns with its pay button in the card (the phone's bottom bar is hidden), and the same payment and
 * delivery journeys end to end. The phone twins of these journeys are the mobile-*.spec.ts files.
 */

test.skip(({ mock }) => !mock, 'needs the mock tsb-service (catalog, fake Mollie, created orders)')
test.skip(({ isMobile }) => Boolean(isMobile), 'desktop layout')

const PHONE = '+32470123456'
const GYOZA = /Gyoza/u

const sideCart = (page: Page) => page.getByTestId('side-cart')

test.describe('Side cart', () => {
  test('the delivery / pickup switch changes the breakdown and the total (Tokyo Sushi)', async ({
    page,
    brand,
  }) => {
    test.skip(brand !== 'tokyosushi', 'takeaway-only brand: its switch is covered by the next test')
    await fillCart(page, ['Ramen tonkotsu', 'Maki saumon', 'Nigiri thon']) // 26,90
    const cart = sideCart(page)
    await cart.getByTestId('cart-option-delivery').click()
    await expect(cart.getByTestId('cart-option-delivery')).toHaveAttribute('aria-pressed', 'true')
    // Delivery without an address: the fee is "calculated at payment", no discount; 26,90 + 0,30 online fee.
    await expect(cart).toContainText('Frais de livraison calculés au paiement')
    await expect(cart).not.toContainText('Remise à emporter')
    await expect
      .poll(async () => eurosOf(await cart.getByTestId('cart-total').innerText()))
      .toBe(27.2)

    await cart.getByTestId('cart-option-pickup').click()
    await expect(cart.getByTestId('cart-option-pickup')).toHaveAttribute('aria-pressed', 'true')
    await expect(cart).toContainText('Remise à emporter')
    await expect(cart).toContainText('-2,70') // 10 % of 26,90, snapped to 0,10
    await expect
      .poll(async () => eurosOf(await cart.getByTestId('cart-total').innerText()))
      .toBe(24.5)
  })

  test('below the delivery minimum the checkout link is blocked until the basket grows or pickup is chosen (Tokyo Sushi)', async ({
    page,
    brand,
  }) => {
    test.skip(brand !== 'tokyosushi', 'only a delivery brand has a minimum')
    await fillCart(page, ['Edamame']) // 4,50
    const cart = sideCart(page)
    await cart.getByTestId('cart-option-delivery').click()
    await expect(cart.getByTestId('cart-minimum-warning')).toContainText('Encore 20,50')
    await expect(cart.getByTestId('cart-checkout-link')).toHaveAttribute('aria-disabled', 'true')

    await cart.getByTestId('cart-switch-to-pickup').click()
    await expect(cart.getByTestId('cart-minimum-warning')).toHaveCount(0)
    await expect(cart.getByTestId('cart-checkout-link')).not.toHaveAttribute(
      'aria-disabled',
      'true',
    )
    await expect(cart.getByTestId('cart-option-pickup')).toHaveAttribute('aria-pressed', 'true')
  })

  test('a takeaway-only brand offers delivery as "soon" and starts on pickup (YGF)', async ({
    page,
    brand,
  }) => {
    test.skip(brand !== 'ygfliege', 'delivery brand')
    await fillCart(page, [GYOZA])
    const cart = sideCart(page)
    await expect(cart.getByTestId('cart-option-delivery')).toBeDisabled()
    await expect(cart.getByTestId('cart-option-delivery')).toHaveAccessibleName(
      /Bientôt disponible/u,
    )
    await expect(cart.getByTestId('cart-option-pickup')).toHaveAttribute('aria-pressed', 'true')
    await expect(cart.getByTestId('cart-checkout-link')).not.toHaveAttribute(
      'aria-disabled',
      'true',
    )
  })

  test('a customised line is edited from the side cart and replaced (Tokyo Sushi); a plain line is removed with Undo', async ({
    page,
    brand,
  }) => {
    test.skip(brand !== 'tokyosushi', 'the YGF edit is covered by mobile-cart.spec.ts')
    await gotoMenu(page)
    const modal = await openProductModal(page, 'Poulet teriyaki')
    await pickChoice(page, modal, 'product-modal', 'Piquante')
    await modal.getByTestId('product-modal-add-to-cart').click()
    await expect(modal).toBeHidden()
    await addPlain(page, 'Edamame')

    const cart = await openCart(page)
    await cart
      .getByTestId('cart-item')
      .filter({ hasText: 'Poulet teriyaki' })
      .getByTestId('cart-item-edit')
      .click()
    await expect(modal).toBeVisible()
    await expect(modal.getByTestId('product-modal-add-to-cart')).toContainText('Mettre à jour')
    await modal.getByTestId('product-modal-choice-dec-ch-piquante').click()
    await modal.getByTestId('product-modal-choice-inc-ch-aigre').click()
    await modal.getByTestId('product-modal-add-to-cart').click()
    await expect(modal).toBeHidden()
    await expect(cart.getByTestId('cart-item')).toHaveCount(2)
    await expect(
      cart.getByTestId('cart-item').filter({ hasText: 'Poulet teriyaki' }),
    ).toContainText('Aigre-douce')

    await cart
      .getByTestId('cart-item')
      .filter({ hasText: 'Edamame' })
      .getByTestId('cart-item-remove')
      .click()
    await expect(cart.getByTestId('cart-item')).toHaveCount(1)
    await page.getByRole('button', { name: 'Annuler' }).first().click()
    await expect(cart.getByTestId('cart-item')).toHaveCount(2)
    expect((await cartLines(page)).map((line) => line.productId).sort()).toEqual([
      'p-edamame',
      'p-teriyaki',
    ])
  })

  test('a closed restaurant blocks the side cart’s checkout link, a pre-order shows its time', async ({
    page,
    backend,
    brand,
  }) => {
    await fillCart(page, [GYOZA])
    const cart = sideCart(page)
    if (brand === 'tokyosushi') await cart.getByTestId('cart-option-pickup').click()
    await backend.mock.restaurant('closed')
    await expect(cart).toContainText('Commandes indisponibles')
    await expect(cart.getByTestId('cart-checkout-link')).toHaveAttribute('aria-disabled', 'true')

    await backend.mock.restaurant('scheduled-only')
    await expect(cart.getByTestId('cart-preorder-hint')).toContainText(
      'Nous sommes fermés pour le moment',
    )
    await expect(cart.getByTestId('cart-checkout-link')).not.toHaveAttribute(
      'aria-disabled',
      'true',
    )
  })
})

test.describe('Checkout in columns', () => {
  test.beforeEach(async ({ authenticatedPage: page, backend }) => {
    await backend.mock.user({ phoneNumber: PHONE })
    await fillCart(page, [GYOZA])
  })

  test('the pay button is the one in the card, and an online payment ends in a confirmed order', async ({
    authenticatedPage: page,
    backend,
    brand,
  }) => {
    // From the side cart to the checkout, as a customer would.
    const cart = sideCart(page)
    if (brand === 'tokyosushi') await cart.getByTestId('cart-option-pickup').click()
    await cart.getByTestId('cart-checkout-link').click()
    await page.waitForURL('**/fr/checkout')
    await expect(payButton(page)).toBeVisible()
    // Desktop: the button sits in the "Options et paiement" card; the phone's fixed bar is not rendered visible.
    await expect(
      page.locator('#checkout-payment-extras').getByTestId('checkout-place-order'),
    ).toBeVisible()
    await expect(page.locator('div.fixed [data-testid="checkout-place-order"]')).toBeHidden()
    await chooseCollection(page, 'pickup')
    await waitForQuote(page)
    expect(await payAmount(page)).toBe(brand === 'tokyosushi' ? 7.2 : 5.8)

    await payButton(page).click()
    await expect(page.getByTestId('mollie-page')).toBeVisible()
    await page.getByTestId('mollie-paid').click()
    await page.waitForURL('**/fr/order-completed/**')
    await expect(page.getByTestId('order-completed-title')).toBeVisible()
    await expect(page.getByTestId('receipt-payment')).toContainText('Payé en ligne')
    await expect.poll(async () => (await cartLines(page)).length).toBe(0)
    const [order] = await backend.mock.createdOrders()
    expect(order).toMatchObject({ status: 'CONFIRMED', paymentStatus: 'paid' })
    expect(order?.input).toMatchObject({ isOnlinePayment: true, orderType: 'PICKUP' })
  })

  test('a failed online payment returns to a retry screen with the cart kept', async ({
    authenticatedPage: page,
  }) => {
    await page.goto('/fr/checkout')
    await chooseCollection(page, 'pickup')
    await waitForQuote(page)
    await payButton(page).click()
    await page.getByTestId('mollie-failed').click()
    await page.waitForURL('**/fr/order-completed/**')
    const problem = page.getByTestId('order-completed-payment-problem')
    await expect(problem).toContainText('Paiement échoué')
    expect(await cartLines(page)).toHaveLength(1)
    await problem.getByRole('link', { name: 'Réessayer' }).click()
    await page.waitForURL('**/fr/checkout')
    await expect(payButton(page)).toBeVisible()
  })

  test('a delivery order to a chosen address, paid in cash (Tokyo Sushi)', async ({
    authenticatedPage: page,
    backend,
    brand,
  }) => {
    test.skip(brand !== 'tokyosushi', 'takeaway-only brand')
    await fillCart(page, ['Ramen tonkotsu', 'Maki saumon']) // + the gyoza of the setup: 28,40
    await page.goto('/fr/checkout')
    await chooseCollection(page, 'delivery')
    await pickDeliveryAddress(page, 'Blonden 33')
    await choosePayment(page, 'cash')
    await page.getByTestId('cash-acknowledge').check()
    await waitForQuote(page)
    // 6,90 + 14,50 + 6,50 = 27,90 goods + 1,00 delivery (3,5 km) = 28,90, cash: no fee.
    expect(await payAmount(page)).toBe(28.9)
    await payButton(page).click()
    await page.waitForURL('**/fr/order-completed/**')
    const [order] = await backend.mock.createdOrders()
    expect(order?.type).toBe('DELIVERY')
    expect(order?.total).toBe('28.90')
    expect(order?.input).toMatchObject({ addressPlaceId: 'place-mid', isOnlinePayment: false })
    await expect(page.getByTestId('receipt-destination')).toContainText('Avenue Blonden 33')
  })
})
