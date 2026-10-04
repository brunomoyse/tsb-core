// useCartTotals: the reactive cart totals. Real Pinia stores, real ordering policy / quote maths; only the analytics
// beacon (window.umami) is a spy. Expected amounts are worked out by hand from the default ordering policy
// (delivery minimum 25 EUR, fee 1 EUR per km band from 3 km, pickup 10 % from 20 EUR, online fee 0.30, step 0.10).
// Run: `vp test run layers/engine/composables/useCartTotals.nuxt.test.ts`.
import { createPinia, setActivePinia } from 'pinia'
import { useState } from '#imports'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { useCartTotals } from '#engine/composables/useCartTotals'
import { useAuthStore } from '#engine/stores/auth'
import { useCartStore } from '#engine/stores/cart'
import { useQuoteStore } from '#engine/stores/quote'
import { buildQuoteInput } from '#engine/utils/orderPayload'
import { quoteRequestKey } from '#engine/utils/orderQuote'
import type { Address, User } from '#engine/types'
import { makeChoice, makeProduct } from '../../../test/fixtures/catalog'
import { makeQuote, makeQuoteLine } from '../../../test/fixtures/quote'

const track = vi.fn()

const address = (overrides: Partial<Address> = {}): Address => ({
  id: 'place-1',
  postcode: '4000',
  municipalityName: 'Liège',
  streetName: 'Rue de la Cathédrale',
  houseNumber: '59',
  distance: 3500,
  ...overrides,
})

function setup() {
  setActivePinia(createPinia())
  const cart = useCartStore()
  const quoteStore = useQuoteStore()
  const auth = useAuthStore()
  return { cart, quoteStore, auth, totals: useCartTotals() }
}

/** The server answered the cart as it is right now. */
function answerCurrentCart(
  { cart, quoteStore, auth }: ReturnType<typeof setup>,
  quote: ReturnType<typeof makeQuote>,
) {
  const key = quoteRequestKey(buildQuoteInput(cart), Boolean(auth.user))
  quoteStore.want(key)
  quoteStore.resolve(key, ['line-0'], quote)
}

beforeEach(() => {
  track.mockReset()
  vi.stubGlobal('umami', { track })
  useState('restaurant-config').value = null
})

describe('client totals (no server quote)', () => {
  it('an empty delivery cart: nothing to pay but the online fee, minimum not reached', () => {
    const { totals } = setup()
    expect(totals.subtotalCents.value).toBe(0)
    expect(totals.deliveryFeeCents.value).toBe(0)
    expect(totals.onlineFeeCents.value).toBe(30)
    expect(totals.payableCents.value).toBe(30)
    expect(totals.hasBreakdown.value).toBe(true)
    expect(totals.isMinimumReached.value).toBe(false)
    expect(totals.amountToDeliveryMinimumCents.value).toBe(2500)
    expect(totals.isQuoted.value).toBe(false)
    expect(totals.isQuotePending.value).toBe(false)
    expect(totals.isOrderBlocked.value).toBe(false)
  })

  it('delivery in the 3-4 km band adds a 1 EUR fee; online payment adds 0.30', () => {
    const { cart, totals } = setup()
    cart.addProduct(makeProduct({ price: '10.00' }), 3)
    cart.address = address({ distance: 3500 })
    expect(totals.subtotalCents.value).toBe(3000)
    expect(totals.deliveryFeeCents.value).toBe(100)
    expect(totals.pickupDiscountCents.value).toBe(0)
    expect(totals.onlineFeeCents.value).toBe(30)
    expect(totals.payableCents.value).toBe(3130)
    expect(totals.isMinimumReached.value).toBe(true)
    expect(totals.amountToDeliveryMinimumCents.value).toBe(0)
  })

  it('paying cash drops the online fee', () => {
    const { cart, totals } = setup()
    cart.addProduct(makeProduct({ price: '10.00' }), 3)
    cart.address = address({ distance: 3500 })
    cart.paymentOption = 'CASH'
    expect(totals.onlineFeeCents.value).toBe(0)
    expect(totals.payableCents.value).toBe(3100)
  })

  it('a delivery under the minimum reports how much is missing', () => {
    const { cart, totals } = setup()
    cart.addProduct(makeProduct({ price: '10.00' }), 2)
    cart.address = address({ distance: 1000 })
    expect(totals.deliveryFeeCents.value).toBe(0)
    expect(totals.isMinimumReached.value).toBe(false)
    expect(totals.amountToDeliveryMinimumCents.value).toBe(500)
  })

  it('an address out of the radius is OUT_OF_ZONE (-1) and charges no fee in the payable', () => {
    const { cart, totals } = setup()
    cart.addProduct(makeProduct({ price: '10.00' }), 3)
    cart.address = address({ distance: 9500 })
    expect(totals.deliveryFeeCents.value).toBe(-1)
    expect(totals.payableCents.value).toBe(3030)
    expect(totals.deliveryUnavailableKey.value).toBe('checkout.tooFar')
  })

  it('an excluded postcode is OUT_OF_ZONE whatever the distance, with its own wording', () => {
    const { cart, totals } = setup()
    cart.addProduct(makeProduct({ price: '10.00' }), 3)
    cart.address = address({ postcode: '4610', distance: 1000 })
    expect(totals.deliveryFeeCents.value).toBe(-1)
    expect(totals.deliveryUnavailableKey.value).toBe('checkout.notDeliverableArea')
  })

  it('pickup takes 10 % off the discountable products from a 20 EUR basket, and has no delivery fee', () => {
    const { cart, totals } = setup()
    cart.collectionOption = 'PICKUP'
    cart.address = address({ distance: 3500 })
    cart.addProduct(makeProduct({ price: '10.00' }), 3)
    expect(totals.pickupDiscountCents.value).toBe(300)
    expect(totals.deliveryFeeCents.value).toBe(0)
    expect(totals.payableCents.value).toBe(2730)
    expect(totals.isMinimumReached.value).toBe(true)
    expect(totals.amountToDeliveryMinimumCents.value).toBe(0)
  })

  it('pickup discount ignores non-discountable products and baskets under the threshold', () => {
    const { cart, totals } = setup()
    cart.collectionOption = 'PICKUP'
    cart.addProduct(makeProduct({ id: 'drink', price: '10.00', isDiscountable: false }), 1)
    cart.addProduct(makeProduct({ id: 'food', price: '15.00' }), 1)
    // 25 EUR basket, only the 15 EUR product is discountable: 1.50.
    expect(totals.pickupDiscountCents.value).toBe(150)
    cart.removeFromCart(makeProduct({ id: 'food' }))
    // 10 EUR left: under the 20 EUR threshold.
    expect(totals.pickupDiscountCents.value).toBe(0)
  })

  it('a coupon is taken off the payable, a negative one is ignored', () => {
    const { cart, totals } = setup()
    cart.addProduct(makeProduct({ price: '10.00' }), 3)
    cart.address = address({ distance: 3500 })
    cart.couponCode = 'WELCOME'
    cart.couponDiscountCents = 500
    expect(totals.couponDiscountCents.value).toBe(500)
    expect(totals.payableCents.value).toBe(2630)
    cart.couponDiscountCents = -200
    expect(totals.couponDiscountCents.value).toBe(0)
    expect(totals.payableCents.value).toBe(3130)
  })

  it('follows the cart reactively', () => {
    const { cart, totals } = setup()
    const product = makeProduct({ price: '10.00' })
    cart.collectionOption = 'PICKUP'
    cart.addProduct(product, 1)
    expect(totals.payableCents.value).toBe(1030)
    cart.incrementQuantity(product)
    expect(totals.subtotalCents.value).toBe(2000)
    expect(totals.payableCents.value).toBe(1830)
  })

  it('uses the backend ordering policy once the restaurant config is loaded', () => {
    const { cart, totals } = setup()
    useState('restaurant-config').value = {
      restaurantConfig: {
        policy: { deliveryMinimum: '10.00', onlinePaymentFee: '0.00' },
      },
    }
    cart.addProduct(makeProduct({ price: '10.00' }), 1)
    cart.address = address({ distance: 1000 })
    expect(totals.isMinimumReached.value).toBe(true)
    expect(totals.onlineFeeCents.value).toBe(0)
    expect(totals.payableCents.value).toBe(1000)
  })

  it('prices a line with its choices (surcharge counted once, line-wide)', () => {
    const { cart, totals } = setup()
    const ramen = makeProduct({
      id: 'ramen',
      price: '12.00',
      choices: [makeChoice({ id: 'broth', choiceGroupId: 'g', priceModifier: '1.50' })],
    })
    cart.addProduct(ramen, 2, { selections: [{ groupId: 'g', choiceId: 'broth', quantity: 2 }] })
    const [line] = cart.products
    expect(totals.getItemLineTotalCents(line!)).toBe(2 * 1200 + 2 * 150)
    expect(totals.getItemExactUnitCents(line!)).toBe(1350)
    expect(totals.subtotalCents.value).toBe(2700)
  })

  it('has no exact unit price when the line total does not divide by the quantity', () => {
    const { cart, totals } = setup()
    const bowl = makeProduct({
      id: 'bowl',
      price: '10.00',
      choices: [makeChoice({ id: 'topping', choiceGroupId: 'g', priceModifier: '0.50' })],
    })
    // 3 bowls, one topping in total: 30.50 for 3 units, which does not divide.
    cart.addProduct(bowl, 3, { selections: [{ groupId: 'g', choiceId: 'topping', quantity: 1 }] })
    expect(totals.getItemLineTotalCents(cart.products[0]!)).toBe(3050)
    expect(totals.getItemExactUnitCents(cart.products[0]!)).toBeNull()
  })
})

describe('server quote', () => {
  const deliveryQuote = () =>
    makeQuote({
      subtotal: '30.00',
      deliveryFee: '2.00',
      onlineFee: '0.30',
      total: '32.30',
      lines: [makeQuoteLine({ lineTotal: '30.00' })],
    })

  it("shows the quote's numbers instead of the client's maths when it answers the current cart", () => {
    const ctx = setup()
    const { cart, totals } = ctx
    cart.addProduct(makeProduct({ price: '10.00' }), 3)
    cart.address = address({ distance: 3500 }) // The client would say 1.00 delivery
    answerCurrentCart(ctx, deliveryQuote())
    expect(totals.isQuoted.value).toBe(true)
    expect(totals.deliveryFeeCents.value).toBe(200)
    expect(totals.onlineFeeCents.value).toBe(30)
    expect(totals.payableCents.value).toBe(3230)
    expect(totals.subtotalCents.value).toBe(3000)
    expect(totals.isMinimumReached.value).toBe(true)
  })

  it('falls back to the client maths as soon as the cart moves on from what the quote answered', () => {
    const ctx = setup()
    const { cart, totals } = ctx
    cart.addProduct(makeProduct({ price: '10.00' }), 3)
    cart.address = address({ distance: 3500 })
    answerCurrentCart(ctx, deliveryQuote())
    cart.incrementQuantity(makeProduct({ price: '10.00' }))
    expect(totals.isQuoted.value).toBe(false)
    expect(totals.deliveryFeeCents.value).toBe(100)
    expect(totals.subtotalCents.value).toBe(4000)
  })

  it('ignores a quote of an empty cart', () => {
    const ctx = setup()
    answerCurrentCart(ctx, deliveryQuote())
    expect(ctx.totals.isQuoted.value).toBe(false)
    expect(ctx.totals.subtotalCents.value).toBe(0)
  })

  it('a quote asked while signed out does not answer the signed-in cart', () => {
    const ctx = setup()
    ctx.cart.addProduct(makeProduct({ price: '10.00' }), 3)
    answerCurrentCart(ctx, deliveryQuote())
    expect(ctx.totals.isQuoted.value).toBe(true)
    ctx.auth.setUser({ id: 'user-1' } as User)
    expect(ctx.totals.isQuoted.value).toBe(false)
  })

  it('does not use a quote that could not evaluate the coupon (signed out), nor an unresolvable address', () => {
    const ctx = setup()
    ctx.cart.addProduct(makeProduct({ price: '10.00' }), 3)
    ctx.cart.couponCode = 'WELCOME'
    ctx.cart.couponDiscountCents = 500
    answerCurrentCart(
      ctx,
      makeQuote({ coupon: { code: 'WELCOME', valid: false, errorCode: 'UNAUTHENTICATED' } }),
    )
    expect(ctx.totals.isQuoted.value).toBe(false)
    expect(ctx.totals.couponDiscountCents.value).toBe(500)

    answerCurrentCart(ctx, makeQuote({ issues: [{ code: 'ADDRESS_UNRESOLVABLE', minimum: null }] }))
    expect(ctx.totals.isQuoted.value).toBe(false)
  })

  it('a quote that reports an out-of-zone address shows the OUT_OF_ZONE sentinel and the server reason', () => {
    const ctx = setup()
    ctx.cart.addProduct(makeProduct({ price: '10.00' }), 3)
    // The client thinks the address is fine; the server's verdict wins.
    ctx.cart.address = address({ distance: 1000, postcode: '4000' })
    answerCurrentCart(
      ctx,
      makeQuote({ issues: [{ code: 'DELIVERY_AREA_EXCLUDED', minimum: null }] }),
    )
    expect(ctx.totals.deliveryFeeCents.value).toBe(-1)
    expect(ctx.totals.deliveryUnavailableKey.value).toBe('checkout.notDeliverableArea')
    answerCurrentCart(ctx, makeQuote({ issues: [{ code: 'DELIVERY_OUT_OF_ZONE', minimum: null }] }))
    expect(ctx.totals.deliveryUnavailableKey.value).toBe('checkout.tooFar')
  })

  it("takes the delivery minimum from the quote's issue", () => {
    const ctx = setup()
    ctx.cart.addProduct(makeProduct({ price: '10.00' }), 1)
    answerCurrentCart(
      ctx,
      makeQuote({
        subtotal: '10.00',
        total: '10.30',
        issues: [{ code: 'DELIVERY_MINIMUM_NOT_MET', minimum: '30.00' }],
      }),
    )
    expect(ctx.totals.isMinimumReached.value).toBe(false)
    expect(ctx.totals.amountToDeliveryMinimumCents.value).toBe(2000)
  })

  describe('isOrderBlocked / isQuotePending', () => {
    it('is blocked while a quote of the current inputs is on its way', () => {
      const ctx = setup()
      ctx.cart.addProduct(makeProduct(), 1)
      ctx.quoteStore.want('something-new')
      expect(ctx.totals.isQuotePending.value).toBe(true)
      expect(ctx.totals.isOrderBlocked.value).toBe(true)
    })

    it('is blocked by a line issue or a blocking order issue of the fresh quote', () => {
      const ctx = setup()
      ctx.cart.addProduct(makeProduct(), 1)
      answerCurrentCart(
        ctx,
        makeQuote({
          lines: [makeQuoteLine({ issues: [{ code: 'PRODUCT_UNAVAILABLE', currentPrice: null }] })],
        }),
      )
      expect(ctx.totals.isQuotePending.value).toBe(false)
      expect(ctx.totals.isOrderBlocked.value).toBe(true)

      answerCurrentCart(ctx, makeQuote({ issues: [{ code: 'RESTAURANT_CLOSED', minimum: null }] }))
      expect(ctx.totals.isOrderBlocked.value).toBe(true)
    })

    it('is not blocked by an issue the checkout page explains itself (ADDRESS_REQUIRED), nor by a clean quote', () => {
      const ctx = setup()
      ctx.cart.addProduct(makeProduct(), 1)
      answerCurrentCart(ctx, makeQuote({ issues: [{ code: 'ADDRESS_REQUIRED', minimum: null }] }))
      expect(ctx.totals.isOrderBlocked.value).toBe(false)
      answerCurrentCart(ctx, makeQuote())
      expect(ctx.totals.isOrderBlocked.value).toBe(false)
    })

    it('ignores the issues of a stale quote', () => {
      const ctx = setup()
      ctx.cart.addProduct(makeProduct(), 1)
      answerCurrentCart(ctx, makeQuote({ issues: [{ code: 'RESTAURANT_CLOSED', minimum: null }] }))
      ctx.cart.incrementQuantity(makeProduct())
      // The quote answers the old cart: no verdict on the new one (and nothing asked yet, so nothing pending).
      expect(ctx.totals.isOrderBlocked.value).toBe(false)
    })
  })
})

describe('switchToPickup', () => {
  it('switches a delivery order to pickup and tells analytics', () => {
    const { cart, totals } = setup()
    totals.switchToPickup()
    expect(cart.collectionOption).toBe('PICKUP')
    expect(track).toHaveBeenCalledExactlyOnceWith('cart_collection_option_changed', {
      from: 'DELIVERY',
      to: 'PICKUP',
    })
  })

  it('does nothing (and tracks nothing) when the order is already pickup', () => {
    const { cart, totals } = setup()
    cart.collectionOption = 'PICKUP'
    totals.switchToPickup()
    expect(cart.collectionOption).toBe('PICKUP')
    expect(track).not.toHaveBeenCalled()
  })
})
