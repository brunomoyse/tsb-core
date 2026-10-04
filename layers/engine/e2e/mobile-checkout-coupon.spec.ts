import { type Page } from '@playwright/test'
import {
  cartState,
  chooseCollection,
  choosePayment,
  fillCart,
  gotoCheckout,
  payAmount,
  payButton,
  summaryRow,
  waitForQuote,
} from './support/order-flow'
import { expect, test } from './support/test'

/*
 * Promo codes on the phone checkout, both brands: what the customer sees when a code applies (amount and percent), is
 * refused (unknown, refused by the server, minimum not met, rate limited, check failed), is removed, or stops applying
 * because the basket changed. Every total is also checked against the quote and the order the mock received.
 *
 * Basket: four gyoza, picked up and paid online. TS 4 x 6,90 = 27,60; YGF 4 x 5,50 = 22,00. Both are above the 20,00
 * pickup-discount threshold (10 %), and the online fee is 0,30, rounded to 0,10.
 */

test.skip(({ mock }) => !mock, 'needs the mock tsb-service (coupons, quote, created orders)')
test.skip(({ isMobile }) => !isMobile, 'phone layout')

const BASKET = {
  tokyosushi: { goods: 27.6, base: 25.1, fiveOff: 20.1, welcome10: 22.4, welcomeAmount: '2,76' },
  ygfliege: { goods: 22.0, base: 20.1, fiveOff: 15.1, welcome10: 17.9, welcomeAmount: '2,20' },
} as const

const input = (page: Page) => page.getByTestId('coupon-input')
const apply = async (page: Page, code: string) => {
  await input(page).fill(code)
  await page.getByTestId('coupon-apply').click()
}

test.describe('Promo codes at checkout', () => {
  test.beforeEach(async ({ authenticatedPage: page, backend }) => {
    await backend.mock.user({ phoneNumber: '+32470123456' })
    await fillCart(page, [/Gyoza/u])
    await gotoCheckout(page)
    const more = page.getByRole('button', { name: /Augmenter la quantité de Gyoza/u })
    for (let i = 0; i < 3; i += 1) await more.click()
    await chooseCollection(page, 'pickup')
    await waitForQuote(page)
  })

  test('a fixed-amount code lowers the total by its amount and shows on the breakdown', async ({
    authenticatedPage: page,
    backend,
    brand,
  }) => {
    const basket = BASKET[brand]
    expect(await payAmount(page)).toBe(basket.base)

    await apply(page, 'fiveoff') // The code is not case sensitive
    await expect(page.getByTestId('coupon-applied')).toContainText('-5,00')
    await expect(page.getByTestId('coupon-error')).toHaveCount(0)
    // The code is shown as the customer typed it.
    await expect(summaryRow(page, /Réduction code promo/u)).toContainText('fiveoff')
    await expect(summaryRow(page, /Réduction code promo/u)).toContainText('-5,00')
    await waitForQuote(page)
    expect(await payAmount(page)).toBe(basket.fiveOff)

    // The code was checked against the goods, then travels with every later quote.
    const [check] = await backend.mock.operations('validateCoupon')
    expect(check?.args).toMatchObject({ code: 'fiveoff', orderAmount: basket.goods.toFixed(2) })
    const quote = (await backend.mock.operations('quoteOrder')).at(-1)
    expect(quote?.args.input).toMatchObject({ couponCode: 'fiveoff' })
  })

  test('a percentage code takes its share of the goods', async ({
    authenticatedPage: page,
    brand,
  }) => {
    const basket = BASKET[brand]
    await apply(page, 'WELCOME10')
    await expect(page.getByTestId('coupon-applied')).toContainText(`-${basket.welcomeAmount}`)
    await waitForQuote(page)
    await expect(summaryRow(page, /Réduction code promo/u)).toContainText(
      `-${basket.welcomeAmount}`,
    )
    expect(await payAmount(page)).toBe(basket.welcome10)
  })

  test('removing the code brings the total back and clears it from the quote', async ({
    authenticatedPage: page,
    backend,
    brand,
  }) => {
    const basket = BASKET[brand]
    await apply(page, 'FIVEOFF')
    await expect(page.getByTestId('coupon-applied')).toBeVisible()
    await waitForQuote(page)
    expect(await payAmount(page)).toBe(basket.fiveOff)

    await page.getByTestId('coupon-remove').click()
    await expect(page.getByTestId('coupon-applied')).toHaveCount(0)
    await expect(input(page)).toBeVisible()
    await expect(input(page)).toBeFocused()
    await waitForQuote(page)
    expect(await payAmount(page)).toBe(basket.base)
    await expect(summaryRow(page, /Réduction code promo/u)).toHaveCount(0)
    expect((await cartState(page)).couponCode).toBeNull()
    const quote = (await backend.mock.operations('quoteOrder')).at(-1)
    expect(quote?.args.input).toMatchObject({ couponCode: null })
  })

  test('an unknown or refused code is explained, changes nothing and can be corrected', async ({
    authenticatedPage: page,
    backend,
    brand,
  }) => {
    const basket = BASKET[brand]
    for (const code of ['NOPE123', 'EXPIRED']) {
      await apply(page, code)
      await expect(page.getByTestId('coupon-error')).toHaveText('Code promo invalide')
      await expect(page.getByTestId('coupon-applied')).toHaveCount(0)
      // The field stays, focused, ready for the next try.
      await expect(input(page)).toBeFocused()
    }
    expect(await payAmount(page)).toBe(basket.base)
    expect((await cartState(page)).couponCode).toBeNull()

    await apply(page, 'FIVEOFF')
    await expect(page.getByTestId('coupon-applied')).toBeVisible()
    await expect(page.getByTestId('coupon-error')).toHaveCount(0)
    expect(await backend.mock.operations('validateCoupon')).toHaveLength(3)
  })

  test('a code whose minimum order is not met says so', async ({ authenticatedPage: page }) => {
    await apply(page, 'BIGSPENDER') // Needs 200,00 of goods
    await expect(page.getByTestId('coupon-error')).toHaveText(
      'Ce code promo demande un montant de commande plus élevé.',
    )
    await expect(page.getByTestId('coupon-applied')).toHaveCount(0)
  })

  test('a rate-limited code asks to wait instead of calling the code invalid', async ({
    authenticatedPage: page,
    backend,
  }) => {
    await backend.mock.coupon('SPAMMY', { kind: 'fixed', value: 1, refusal: 'COUPON_RATE_LIMITED' })
    await apply(page, 'SPAMMY')
    await expect(page.getByTestId('coupon-error')).toContainText('Trop de tentatives')
  })

  test('when the code cannot be checked the message is a retry hint, not "invalid code"', async ({
    authenticatedPage: page,
    backend,
    brand,
  }) => {
    await backend.mock.failOperation('validateCoupon', { code: 'INTERNAL' })
    await apply(page, 'FIVEOFF')
    const error = page.getByTestId('coupon-error')
    await expect(error).toBeVisible()
    await expect(error).not.toHaveText('Code promo invalide')
    await expect(page.getByTestId('coupon-applied')).toHaveCount(0)

    // Repaired: the same code now applies.
    await backend.mock.failOperation('validateCoupon', null)
    await apply(page, 'FIVEOFF')
    await expect(page.getByTestId('coupon-applied')).toBeVisible()
    await waitForQuote(page)
    expect(await payAmount(page)).toBe(BASKET[brand].fiveOff)
  })

  test('a code that stops applying when the basket shrinks is removed with a message', async ({
    authenticatedPage: page,
    brand,
  }) => {
    await apply(page, 'WELCOME10') // Minimum 15,00 of goods
    await expect(page.getByTestId('coupon-applied')).toBeVisible()
    await waitForQuote(page)

    // Down to two gyoza: TS 13,80 / YGF 11,00, under the minimum.
    const fewer = page.getByRole('button', { name: /Diminuer la quantité de Gyoza/u })
    await fewer.click()
    await fewer.click()
    await expect(page.getByTestId('coupon-applied')).toHaveCount(0, { timeout: 15_000 })
    await expect(page.getByText(/Le code promo WELCOME10 a été retiré/u).first()).toBeVisible()
    await waitForQuote(page)
    await expect(summaryRow(page, /Réduction code promo/u)).toHaveCount(0)
    expect((await cartState(page)).couponCode).toBeNull()
    expect(await payAmount(page)).toBeLessThan(BASKET[brand].base)
  })

  test('the code survives a reload and reaches the created order', async ({
    authenticatedPage: page,
    backend,
    brand,
  }) => {
    await apply(page, 'FIVEOFF')
    await expect(page.getByTestId('coupon-applied')).toBeVisible()
    await page.reload()
    await expect(payButton(page)).toBeVisible()
    await expect(page.getByTestId('coupon-applied')).toBeVisible()
    await chooseCollection(page, 'pickup')
    await choosePayment(page, 'cash')
    await page.getByTestId('cash-acknowledge').check()
    await waitForQuote(page)
    // Cash: no online fee. TS 27,60 - 2,76 - 5,00 = 19,84 -> 19,80; YGF 22,00 - 2,20 - 5,00 = 14,80.
    const expected = brand === 'tokyosushi' ? 19.8 : 14.8
    expect(await payAmount(page)).toBe(expected)
    await payButton(page).click()
    await page.waitForURL('**/fr/order-completed/**')

    const [order] = await backend.mock.createdOrders()
    expect(order?.input).toMatchObject({ couponCode: 'FIVEOFF', orderType: 'PICKUP' })
    expect(order?.total).toBe(expected.toFixed(2))
    await expect(page.getByTestId('receipt-discount')).toContainText(
      brand === 'tokyosushi' ? '7,76' : '7,20',
    )
  })
})
