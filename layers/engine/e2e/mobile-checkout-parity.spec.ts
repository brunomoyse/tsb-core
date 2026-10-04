import { type Page } from '@playwright/test'
import {
  checkoutSummary,
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
 * The totals the app computes by itself (what it shows while a quote is on its way or when the quote failed) must be the
 * ones the server charges: for the same basket, the breakdown and the amount to pay are identical with and without the
 * server quote. Both brands, on a phone, over baskets that mix discountable goods and drinks (which get no pickup
 * discount), straddle the 20,00 threshold, add a promo code and, for Tokyo Sushi, deliver at a tier.
 *
 * "Without the quote" is the mock's `quoteFailure` scenario: the page falls back to its own maths.
 */

test.skip(({ mock }) => !mock, 'needs the mock tsb-service (quote and quote failures)')
test.skip(({ isMobile }) => !isMobile, 'phone layout')

interface Basket {
  name: string
  /** Product names, with how many of each. */
  lines: [name: string | RegExp, quantity: number][]
}

const BASKETS: Record<'tokyosushi' | 'ygfliege', Basket[]> = {
  tokyosushi: [
    // 14,50 ramen + 2,50 cola + 3,00 tea = 20,00: at the threshold, only the ramen is discountable.
    {
      name: 'goods at the discount threshold, with drinks',
      lines: [
        ['Ramen tonkotsu', 1],
        ['Coca-Cola', 1],
        [/Thé vert/u, 1],
      ],
    },
    // 3 x 5,90 = 17,70: under the threshold.
    { name: 'goods under the discount threshold', lines: [['Nigiri thon', 3]] },
    // 3 x 6,50 + 2 x 2,50 = 24,50
    {
      name: 'a basket with several quantities',
      lines: [
        ['Maki saumon', 3],
        ['Coca-Cola', 2],
      ],
    },
  ],
  ygfliege: [
    // 2 x 5,50 + 3 x 3,20 = 20,60: only the gyoza are discountable.
    {
      name: 'goods over the threshold, with drinks',
      lines: [
        [/Gyoza/u, 2],
        [/Thé glacé/u, 3],
      ],
    },
    // 3,90 + 5,50 = 9,40
    {
      name: 'goods under the discount threshold',
      lines: [
        ['Mochi', 1],
        [/Gyoza/u, 1],
      ],
    },
    { name: 'a basket of drinks only (no discountable goods)', lines: [[/Thé glacé/u, 7]] },
  ],
}

/** Adds the lines (one from the menu, the rest with the checkout stepper). */
async function buildBasket(page: Page, basket: Basket) {
  await fillCart(
    page,
    basket.lines.map(([name]) => name),
  )
  await gotoCheckout(page)
  for (const [name, quantity] of basket.lines) {
    const label =
      typeof name === 'string'
        ? new RegExp(`Augmenter la quantité de ${name}`, 'u')
        : new RegExp(`Augmenter la quantité de ${name.source}`, 'u')
    for (let i = 1; i < quantity; i += 1) await page.getByRole('button', { name: label }).click()
  }
}

/** The rows of the breakdown, label and amount, as text. */
async function breakdown(page: Page): Promise<string[]> {
  const rows = checkoutSummary(page).locator('div.justify-between')
  return (await rows.allInnerTexts()).map((text) => text.replace(/\s+/gu, ' ').trim())
}

test.describe('Client maths and server quote agree', () => {
  test.beforeEach(async ({ authenticatedPage: page, backend }) => {
    await backend.mock.user({ phoneNumber: '+32470123456', address: 'place-mid' })
    await page.goto('/fr/menu')
  })

  for (const variation of [
    { name: 'pickup, paid online', collection: 'pickup', payment: 'online', coupon: null },
    { name: 'pickup, paid in cash', collection: 'pickup', payment: 'cash', coupon: null },
    {
      name: 'pickup, online, with a fixed promo code',
      collection: 'pickup',
      payment: 'online',
      coupon: 'FIVEOFF',
    },
    {
      name: 'delivery to 3,5 km, online (Tokyo Sushi)',
      collection: 'delivery',
      payment: 'online',
      coupon: null,
    },
  ] as const) {
    test(`${variation.name}: same breakdown and same amount to pay`, async ({
      authenticatedPage: page,
      backend,
      brand,
    }) => {
      test.skip(
        variation.collection === 'delivery' && brand !== 'tokyosushi',
        'takeaway-only brand',
      )
      const baskets = BASKETS[brand].filter(
        // A delivery order must reach the 25,00 minimum: only the biggest basket does, and the checkout says so otherwise.
        (basket) => variation.collection === 'pickup' || basket.name.includes('several quantities'),
      )
      for (const basket of baskets) {
        await test.step(basket.name, async () => {
          await page.evaluate(() => {
            localStorage.removeItem('cart')
          })
          await buildBasket(page, basket)
          await chooseCollection(page, variation.collection)
          await choosePayment(page, variation.payment)
          if (variation.coupon) {
            await page.getByTestId('coupon-input').fill(variation.coupon)
            await page.getByTestId('coupon-apply').click()
            await expect(page.getByTestId('coupon-applied')).toBeVisible()
          }
          await waitForQuote(page)
          const withQuote = { rows: await breakdown(page), pay: await payAmount(page) }

          // The same basket again, the server refusing to quote: the page prices it by itself.
          const asked = (await backend.mock.operations('quoteOrder')).length
          await backend.mock.scenario({ quoteFailure: { code: 'INTERNAL' } })
          await page.reload()
          await expect(payButton(page)).toBeVisible()
          // The quote of the reloaded page was asked for and refused: what is on screen is the page's own maths.
          await backend.mock.waitFor(
            (state) => state.operations.filter((entry) => entry.op === 'quoteOrder').length > asked,
            { message: 'the reloaded checkout never asked for a quote' },
          )
          await waitForQuote(page)
          const alone = { rows: await breakdown(page), pay: await payAmount(page) }
          await backend.mock.scenario({ quoteFailure: null })

          expect(alone.rows, `breakdown differs for "${basket.name}"`).toEqual(withQuote.rows)
          expect(alone.pay, `amount differs for "${basket.name}"`).toBe(withQuote.pay)
        })
      }
    })
  }
})
