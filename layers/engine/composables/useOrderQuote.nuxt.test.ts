// useOrderQuote: keeps the server quote of the cart (`quoteOrder`) up to date for every surface that shows the cart.
// The real quote cycle (debounce, abort, stale answers: see utils/quoteCycle.test.mjs), real stores and ordering policy;
// the boundaries are the GraphQL transport ($gqlFetch), Sentry (reportError), i18n and the clock (fake timers).
// The composable keeps module-level state (the shared cycle), so every test loads a fresh copy of it.
// Run: `vp test run layers/engine/composables/useOrderQuote.nuxt.test.ts`.
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { createPinia, setActivePinia } from 'pinia'
import { type EffectScope, effectScope, nextTick, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { setFlags } from '../../../test/flags'
import { makeProduct } from '../../../test/fixtures/catalog'
import { makeQuote, makeQuoteLine } from '../../../test/fixtures/quote'
import { makeUser } from '../../../test/fixtures/order'
import type { OrderQuote } from '#engine/utils/orderQuote'

const gqlFetch = vi.hoisted(() => vi.fn())
const reportError = vi.hoisted(() => vi.fn())
mockNuxtImport('useNuxtApp', async (original) => {
  const { withGqlFetch } = await import('../../../test/helpers/gqlFetch')
  return () => withGqlFetch(original(), gqlFetch)
})
vi.mock('#engine/utils/reportError', () => ({ reportError }))
vi.mock('vue-i18n', async (importOriginal) => {
  const { fakeI18n } = await import('../../../test/helpers/i18n')
  return { ...(await importOriginal<typeof import('vue-i18n')>()), useI18n: fakeI18n }
})

const DEBOUNCE = 400
const ramen = makeProduct({ id: 'ramen', price: '14.00' })
const tea = makeProduct({ id: 'tea', price: '3.00' })

const scopes: EffectScope[] = []

async function load() {
  vi.resetModules()
  setActivePinia(createPinia())
  const mod = await import('#engine/composables/useOrderQuote')
  const { useCartStore } = await import('#engine/stores/cart')
  const { useQuoteStore } = await import('#engine/stores/quote')
  const { useAuthStore } = await import('#engine/stores/auth')
  const { useNotificationsStore } = await import('#engine/stores/notifications')
  const { QUOTE_ORDER_QUERY } = await import('#engine/utils/orderQuote')
  const { GqlError } = await import('#engine/utils/gqlError')
  /** A surface showing the cart: its own effect scope, like a component's. */
  const surface = (options?: Parameters<typeof mod.useOrderQuote>[0]) => {
    const scope = effectScope()
    scopes.push(scope)
    return { scope, quote: scope.run(() => mod.useOrderQuote(options))! }
  }
  return {
    ...mod,
    surface,
    cart: useCartStore(),
    quoteStore: useQuoteStore(),
    auth: useAuthStore(),
    notifications: useNotificationsStore(),
    QUOTE_ORDER_QUERY,
    GqlError,
  }
}

/** Lets the watchers run, then moves the clock. */
const settle = async (ms = 0) => {
  await nextTick()
  await vi.advanceTimersByTimeAsync(ms)
}

/** The server answers every quote with `quote`. */
const answerWith = (quote: OrderQuote) => gqlFetch.mockResolvedValue({ quoteOrder: quote })
const answerFor = (lines: number, overrides: Partial<OrderQuote> = {}) =>
  makeQuote({ lines: Array.from({ length: lines }, () => makeQuoteLine()), ...overrides })

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
  vi.setSystemTime(new Date('2026-10-04T12:00:00+02:00'))
  gqlFetch.mockReset()
  reportError.mockReset()
  answerWith(makeQuote())
})
afterEach(() => {
  scopes.splice(0).forEach((scope) => {
    scope.stop()
  })
  vi.useRealTimers()
})

describe('what is asked, and when', () => {
  it('an empty cart asks nothing, and the surfaces see no quote', async () => {
    const { surface, quoteStore } = await load()
    const { quote } = surface()
    await settle(DEBOUNCE * 2)
    expect(gqlFetch).not.toHaveBeenCalled()
    expect(quote.quote.value).toBeNull()
    expect(quote.pending.value).toBe(false)
    expect(quote.blocked.value).toBe(false)
    expect(quoteStore.wantedKey).toBe('')
  })

  it('the first quote of a visit goes out at once with the cart as the input, and lands in the store', async () => {
    const { surface, cart, quoteStore, QUOTE_ORDER_QUERY } = await load()
    cart.addProduct(ramen, 2)
    const { quote } = surface()
    expect(quote.pending.value).toBe(true)
    expect(quote.blocked.value).toBe(true) // A quote on its way: the order cannot be placed yet
    expect(gqlFetch).not.toHaveBeenCalled() // The cycle sends on its own tick
    answerWith(answerFor(1, { subtotal: '28.00', total: '28.00' }))
    await settle(0)
    expect(gqlFetch).toHaveBeenCalledOnce()
    const [query, options] = gqlFetch.mock.calls[0]!
    expect(query).toBe(QUOTE_ORDER_QUERY)
    expect(options.variables.input).toMatchObject({
      orderType: 'DELIVERY',
      isOnlinePayment: true,
      items: [{ productId: 'ramen', quantity: 2, expectedLineTotal: '28.00' }],
    })
    expect(options.signal).toBeInstanceOf(AbortSignal)
    expect(quote.pending.value).toBe(false)
    expect(quote.quote.value?.total).toBe('28.00')
    expect(quote.freshQuote.value?.total).toBe('28.00')
    expect(quote.blocked.value).toBe(false)
    expect(quote.error.value).toBeNull()
    expect(quoteStore.lineKeys).toHaveLength(1)
  })

  it('a change of the cart is debounced: a burst costs one request, with the last state', async () => {
    const { surface, cart } = await load()
    cart.addProduct(ramen, 1)
    surface()
    await settle(0)
    gqlFetch.mockClear()
    cart.addProduct(ramen, 1)
    await settle(100)
    cart.addProduct(tea, 1)
    await settle(100)
    cart.collectionOption = 'PICKUP'
    await settle(DEBOUNCE - 1)
    expect(gqlFetch).not.toHaveBeenCalled()
    await settle(1)
    expect(gqlFetch).toHaveBeenCalledOnce()
    expect(gqlFetch.mock.calls[0]![1].variables.input).toMatchObject({
      orderType: 'PICKUP',
      items: [
        { productId: 'ramen', quantity: 2 },
        { productId: 'tea', quantity: 1 },
      ],
    })
  })

  it('every priced input re-asks: payment option, coupon, slot, address', async () => {
    const { surface, cart } = await load()
    cart.addProduct(ramen, 1)
    surface()
    await settle(0)
    const change = async (apply: () => void) => {
      gqlFetch.mockClear()
      apply()
      await settle(DEBOUNCE)
      expect(gqlFetch).toHaveBeenCalledOnce()
    }
    await change(() => {
      cart.paymentOption = 'CASH'
    })
    await change(() => {
      cart.couponCode = 'WELCOME'
    })
    await change(() => {
      cart.preferredReadyTime = '2026-10-04T19:00:00+02:00'
    })
    await change(() => {
      cart.collectionOption = 'PICKUP'
    })
    expect(gqlFetch.mock.calls[0]![1].variables.input).toMatchObject({
      isOnlinePayment: false,
      couponCode: 'WELCOME',
      preferredReadyTime: '2026-10-04T19:00:00+02:00',
      orderType: 'PICKUP',
    })
  })

  it('an input that is not priced (the order note) does not re-ask', async () => {
    const { surface, cart } = await load()
    cart.addProduct(ramen, 1)
    surface()
    await settle(0)
    gqlFetch.mockClear()
    cart.orderNote = 'no wasabi'
    await settle(DEBOUNCE * 2)
    expect(gqlFetch).not.toHaveBeenCalled()
  })

  it('signing in changes the question (the server evaluates the coupon only for a signed-in customer)', async () => {
    const { surface, cart, auth } = await load()
    cart.addProduct(ramen, 1)
    surface()
    await settle(0)
    gqlFetch.mockClear()
    auth.setUser(makeUser())
    await settle(DEBOUNCE)
    expect(gqlFetch).toHaveBeenCalledOnce()
  })

  it('emptying the cart clears the quote and cancels what was asked', async () => {
    const { surface, cart, quoteStore } = await load()
    cart.addProduct(ramen, 1)
    const { quote } = surface()
    await settle(0)
    expect(quote.quote.value).not.toBeNull()
    cart.removeFromCart(ramen)
    await settle(0)
    expect(quote.quote.value).toBeNull()
    expect(quoteStore.wantedKey).toBe('')
    expect(quote.freshQuote.value).toBeNull()
  })

  it('a surface that is not active (the closed drawer) asks nothing until it is', async () => {
    const { surface, cart } = await load()
    cart.addProduct(ramen, 1)
    const open = ref(false)
    surface({ active: open })
    await settle(DEBOUNCE * 2)
    expect(gqlFetch).not.toHaveBeenCalled()
    open.value = true
    await settle(0)
    expect(gqlFetch).toHaveBeenCalledOnce()
  })

  it('`active` may be a getter or a plain boolean', async () => {
    const { surface, cart } = await load()
    cart.addProduct(ramen, 1)
    surface({ active: () => false })
    surface({ active: false })
    await settle(DEBOUNCE)
    expect(gqlFetch).not.toHaveBeenCalled()
    surface({ active: true })
    await settle(0)
    expect(gqlFetch).toHaveBeenCalledOnce()
  })

  it('any number of surfaces mounted at once cost ONE request per change', async () => {
    const { surface, cart } = await load()
    cart.addProduct(ramen, 1)
    surface()
    surface()
    surface()
    await settle(0)
    expect(gqlFetch).toHaveBeenCalledOnce()
    gqlFetch.mockClear()
    cart.addProduct(tea, 1)
    await settle(DEBOUNCE)
    expect(gqlFetch).toHaveBeenCalledOnce()
  })

  it('on the server nothing is asked (the module is shared by every request): the surface only reads the store', async () => {
    setFlags({ server: true })
    const { surface, cart, quoteStore } = await load()
    cart.addProduct(ramen, 1)
    const { quote } = surface()
    await settle(DEBOUNCE * 2)
    expect(gqlFetch).not.toHaveBeenCalled()
    expect(quote.quote.value).toBeNull()
    expect(quoteStore.wantedKey).toBe('')
  })
})

describe('blocked and fresh', () => {
  it('a fresh quote with a blocking line issue blocks the order; the issues are keyed by cart line', async () => {
    const { surface, cart } = await load()
    cart.addProduct(ramen, 1)
    cart.addProduct(tea, 1)
    answerWith(
      makeQuote({
        lines: [
          makeQuoteLine(),
          makeQuoteLine({
            productId: 'tea',
            issues: [{ code: 'PRODUCT_UNAVAILABLE', currentPrice: null }],
          }),
        ],
      }),
    )
    const { quote } = surface()
    await settle(0)
    expect(quote.blocked.value).toBe(true)
    const keys = Object.keys(quote.lineIssues.value)
    expect(keys).toHaveLength(1)
    expect(keys[0]).toMatch(/^tea-/u)
    expect(quote.lineIssues.value[keys[0]!]).toEqual([
      { code: 'PRODUCT_UNAVAILABLE', currentPrice: null },
    ])
  })

  it('a blocking order-level issue (delivery minimum) blocks too', async () => {
    const { surface, cart } = await load()
    cart.addProduct(ramen, 1)
    answerWith(answerFor(1, { issues: [{ code: 'DELIVERY_MINIMUM_NOT_MET', minimum: '25.00' }] }))
    const { quote } = surface()
    await settle(0)
    expect(quote.blocked.value).toBe(true)
  })

  it('a quote of the cart as it WAS is shown (stale) but neither fresh nor blocking once the cart moved and settled', async () => {
    const { surface, cart } = await load()
    cart.addProduct(ramen, 1)
    answerWith(answerFor(1, { issues: [{ code: 'DELIVERY_MINIMUM_NOT_MET', minimum: '25.00' }] }))
    const { quote } = surface()
    await settle(0)
    expect(quote.blocked.value).toBe(true)
    // The next request fails: the old quote stays visible, but it no longer describes the cart.
    gqlFetch.mockRejectedValue(new Error('network down'))
    cart.addProduct(tea, 1)
    await settle(DEBOUNCE)
    expect(quote.quote.value).not.toBeNull()
    expect(quote.freshQuote.value).toBeNull()
    expect(quote.pending.value).toBe(false)
    expect(quote.blocked.value).toBe(false)
  })

  it('freshQuote follows the cart: after a change it is null until the new answer arrives', async () => {
    const { surface, cart } = await load()
    cart.addProduct(ramen, 1)
    const { quote } = surface()
    await settle(0)
    expect(quote.freshQuote.value).not.toBeNull()
    cart.addProduct(ramen, 1)
    await nextTick()
    expect(quote.freshQuote.value).toBeNull()
    expect(quote.pending.value).toBe(true)
    await settle(DEBOUNCE)
    expect(quote.freshQuote.value).not.toBeNull()
  })
})

describe('failures', () => {
  it('a failed request is reported, leaves the surfaces on the client maths, and blocks nothing', async () => {
    const { surface, cart, GqlError } = await load()
    cart.addProduct(ramen, 1)
    const failure = GqlError.fromTransport(new TypeError('Failed to fetch'))
    gqlFetch.mockRejectedValue(failure)
    const { quote } = surface()
    await settle(0)
    expect(reportError).toHaveBeenCalledWith(failure, 'cart.quote')
    expect(quote.error.value).toBe(failure)
    expect(quote.quote.value).toBeNull()
    expect(quote.freshQuote.value).toBeNull()
    expect(quote.pending.value).toBe(false)
    expect(quote.blocked.value).toBe(false)
  })

  it('a request that is never answered is given up on after 8 s (Pay is not disabled forever)', async () => {
    const { surface, cart } = await load()
    cart.addProduct(ramen, 1)
    gqlFetch.mockImplementation(() => new Promise(() => undefined))
    const { quote } = surface()
    await settle(0)
    expect(quote.pending.value).toBe(true)
    await settle(8000)
    expect(quote.pending.value).toBe(false)
    expect(quote.blocked.value).toBe(false)
    expect(reportError).toHaveBeenCalledOnce()
  })

  it('an old backend without quoteOrder is detected once and never asked again', async () => {
    const { surface, cart, quoteStore, GqlError } = await load()
    cart.addProduct(ramen, 1)
    gqlFetch.mockRejectedValue(
      new GqlError([
        {
          message: 'Cannot query field "quoteOrder" on type "Query".',
          extensions: { code: 'GRAPHQL_VALIDATION_FAILED' },
        },
      ]),
    )
    const { quote } = surface()
    await settle(0)
    expect(quoteStore.unsupported).toBe(true)
    expect(quote.pending.value).toBe(false)
    expect(quote.blocked.value).toBe(false)
    expect(reportError).not.toHaveBeenCalled()
    cart.addProduct(tea, 1)
    await settle(DEBOUNCE * 2)
    expect(gqlFetch).toHaveBeenCalledOnce()
  })
})

describe('the coupon of the cart follows each quote', () => {
  const couponQuote = (
    overrides: Partial<NonNullable<OrderQuote['coupon']>>,
    couponDiscount = '2.00',
  ) =>
    answerFor(1, {
      couponDiscount,
      coupon: { code: 'WELCOME', valid: true, errorCode: null, ...overrides },
    })

  const withCoupon = async (quote: OrderQuote) => {
    const loaded = await load()
    loaded.cart.addProduct(ramen, 1)
    loaded.cart.couponCode = 'WELCOME'
    loaded.cart.couponDiscountCents = 100
    answerWith(quote)
    const { quote: surface } = loaded.surface()
    await settle(0)
    return { ...loaded, surface }
  }

  it('an applying coupon takes the discount the server computes now (it follows the basket)', async () => {
    const { cart, notifications } = await withCoupon(couponQuote({}, '2.50'))
    expect(cart.couponCode).toBe('WELCOME')
    expect(cart.couponDiscountCents).toBe(250)
    expect(notifications.current).toBeNull()
  })

  it('an unchanged discount is left as it is', async () => {
    const { cart } = await withCoupon(couponQuote({}, '1.00'))
    expect(cart.couponDiscountCents).toBe(100)
  })

  it('a coupon that stopped applying is removed, with a warning that names the code and the reason', async () => {
    const { cart, notifications } = await withCoupon(
      couponQuote({ valid: false, errorCode: 'COUPON_MIN_ORDER_NOT_MET' }),
    )
    expect(cart.couponCode).toBeNull()
    expect(cart.couponDiscountCents).toBe(0)
    expect(notifications.current).toMatchObject({
      message:
        'coupon.removedNoLongerApplies{"code":"WELCOME","reason":"notify.errors.couponMinOrderNotMet"}',
      variant: 'warning',
      duration: 7000,
    })
    notifications.dismiss()
  })

  it('a refusal the table does not know is reported as "invalid"', async () => {
    const { cart, notifications } = await withCoupon(
      couponQuote({ valid: false, errorCode: 'COUPON_SOMETHING_NEW' }),
    )
    expect(cart.couponCode).toBeNull()
    expect(notifications.current?.message).toContain('"reason":"coupon.invalid"')
    notifications.dismiss()
  })

  it('a quote that did not evaluate the coupon (anonymous) keeps it and its discount', async () => {
    const { cart, notifications } = await withCoupon(
      couponQuote({ valid: false, errorCode: 'UNAUTHENTICATED' }),
    )
    expect(cart.couponCode).toBe('WELCOME')
    expect(cart.couponDiscountCents).toBe(100)
    expect(notifications.current).toBeNull()
  })

  it('a quote about another code (the cart changed it meanwhile) does not touch the cart coupon', async () => {
    const { cart } = await withCoupon(
      couponQuote({ code: 'OTHER', valid: false, errorCode: 'COUPON_INVALID' }),
    )
    expect(cart.couponCode).toBe('WELCOME')
  })

  it('an answer for inputs the cart has already left is not applied to the coupon', async () => {
    const loaded = await load()
    loaded.cart.addProduct(ramen, 1)
    loaded.cart.couponCode = 'WELCOME'
    loaded.cart.couponDiscountCents = 100
    let release!: (value: unknown) => void
    gqlFetch.mockImplementationOnce(() => new Promise((resolve) => (release = resolve)))
    loaded.surface()
    await settle(0)
    // The cart moves on while the first request is in flight: its answer is dropped by the cycle.
    answerWith(couponQuote({ valid: false, errorCode: 'COUPON_INVALID' }))
    loaded.cart.addProduct(tea, 1)
    await settle(DEBOUNCE)
    release({ quoteOrder: couponQuote({}, '9.00') })
    await settle(0)
    expect(loaded.cart.couponCode).toBeNull() // Only the NEW answer was applied
    loaded.notifications.dismiss()
  })
})

describe('refreshQuote and requestQuoteRefresh', () => {
  const sendCount = () => gqlFetch.mock.calls.length

  it('refreshQuote asks again for the current cart now and resolves with the fresh quote', async () => {
    const { surface, cart, refreshQuote } = await load()
    cart.addProduct(ramen, 1)
    surface()
    await settle(0)
    answerWith(answerFor(1, { total: '15.00' }))
    const refreshed = refreshQuote()
    await settle(0)
    expect((await refreshed)?.total).toBe('15.00')
    expect(sendCount()).toBe(2)
  })

  it('refreshQuote resolves null when nothing is on screen (no cycle yet) or the request failed', async () => {
    const { surface, cart, refreshQuote } = await load()
    expect(await refreshQuote()).toBeNull()
    cart.addProduct(ramen, 1)
    surface()
    await settle(0)
    gqlFetch.mockRejectedValue(new Error('down'))
    const refreshed = refreshQuote()
    await settle(0)
    expect(await refreshed).toBeNull()
  })

  it('the exposed refresh is the same function', async () => {
    const { surface, refreshQuote } = await load()
    expect(surface().quote.refresh).toBe(refreshQuote)
  })

  it('requestQuoteRefresh does nothing while no surface shows a quote', async () => {
    const { requestQuoteRefresh, cart } = await load()
    cart.addProduct(ramen, 1)
    requestQuoteRefresh()
    await settle(0)
    expect(gqlFetch).not.toHaveBeenCalled()
  })

  it('requestQuoteRefresh refreshes a visible quote, and bursts cost one request per gap', async () => {
    const { surface, cart, requestQuoteRefresh } = await load()
    cart.addProduct(ramen, 1)
    surface()
    await settle(0)
    gqlFetch.mockClear()
    requestQuoteRefresh()
    await settle(0)
    expect(sendCount()).toBe(1)
    requestQuoteRefresh()
    requestQuoteRefresh()
    await settle(1999)
    expect(sendCount()).toBe(1)
    await settle(1)
    requestQuoteRefresh()
    await settle(0)
    expect(sendCount()).toBe(2)
  })

  it('the minimum gap is the caller’s to choose', async () => {
    const { surface, cart, requestQuoteRefresh } = await load()
    cart.addProduct(ramen, 1)
    surface()
    await settle(0)
    gqlFetch.mockClear()
    requestQuoteRefresh(10_000)
    await settle(5000)
    requestQuoteRefresh(10_000)
    await settle(0)
    expect(sendCount()).toBe(1)
    await settle(5000)
    requestQuoteRefresh(10_000)
    await settle(0)
    expect(sendCount()).toBe(2)
  })

  it('does nothing on the server', async () => {
    const { surface, cart, requestQuoteRefresh } = await load()
    cart.addProduct(ramen, 1)
    surface()
    await settle(0)
    gqlFetch.mockClear()
    setFlags({ server: true })
    requestQuoteRefresh()
    await settle(0)
    expect(gqlFetch).not.toHaveBeenCalled()
  })
})

describe('lifecycle', () => {
  it('while another surface is still mounted the shared cycle keeps running', async () => {
    const { surface, cart, quoteStore } = await load()
    cart.addProduct(ramen, 1)
    const first = surface()
    surface()
    await settle(0)
    first.scope.stop()
    expect(quoteStore.quote).not.toBeNull()
    gqlFetch.mockClear()
    cart.addProduct(tea, 1)
    await settle(DEBOUNCE)
    expect(gqlFetch).toHaveBeenCalledOnce()
  })

  it('when the last surface goes the cycle stops and forgets the quote; the next surface restarts it', async () => {
    const { surface, cart, quoteStore } = await load()
    cart.addProduct(ramen, 1)
    const only = surface()
    await settle(0)
    only.scope.stop()
    expect(quoteStore.quote).toBeNull()
    expect(quoteStore.wantedKey).toBe('')
    gqlFetch.mockClear()
    cart.addProduct(tea, 1)
    await settle(DEBOUNCE * 2)
    expect(gqlFetch).not.toHaveBeenCalled() // Nobody is watching
    const { quote } = surface()
    await settle(0)
    expect(gqlFetch).toHaveBeenCalledOnce()
    expect(quote.quote.value).not.toBeNull()
  })

  it('stopping a surface twice cannot take the consumer count below zero', async () => {
    const { surface, cart, requestQuoteRefresh } = await load()
    cart.addProduct(ramen, 1)
    const first = surface()
    first.scope.stop()
    first.scope.stop()
    const second = surface()
    await settle(0)
    gqlFetch.mockClear()
    requestQuoteRefresh()
    await settle(0)
    expect(gqlFetch).toHaveBeenCalledOnce()
    second.scope.stop()
  })
})
