// UseOrderCompleted: the logic of /order-completed/[orderId] after the Mollie redirect (paid, canceled, failed, expired,
// "back": the redirect itself says nothing). Everything derives from the LOADED order: the phase, when the cart is cleared
// (only a confirmed order, only the cart checked out for this order), the verify loop for a late webhook, the live
// Subscription and the polling fallback. The pure rules are in utils/orderCompleted.test.mjs; here they are wired.
// Boundaries: the GraphQL transport, the data-fetching wrapper (useAsyncData), the WebSocket subscription and the clock.
// Run: `vp test run layers/engine/composables/useOrderCompleted.nuxt.test.ts`.
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { createPinia, setActivePinia } from 'pinia'
import type { Ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { setFlags } from '../../../test/flags'
import { useCartStore } from '#engine/stores/cart'
import type { Order } from '#engine/types'
import { makeProduct } from '../../../test/fixtures/catalog'
import { makeOrder, makePayment } from '../../../test/fixtures/order'
import { withSetup } from '../../../test/helpers/withSetup'

interface SubscriptionCall {
  query: string
  variables: Record<string, unknown>
  options: { onReconnect?: () => void | Promise<void> }
  data: Ref<{ myOrderUpdated?: Partial<Order> } | null>
}
const gqlFetch = vi.hoisted(() => vi.fn())
const subscriptions = vi.hoisted(() => ({ calls: [] as unknown[] }))
const asyncDataCalls = vi.hoisted(() => ({ calls: [] as { key: string; options: unknown }[] }))

mockNuxtImport('useNuxtApp', async (original) => {
  const { withGqlFetch } = await import('../../../test/helpers/gqlFetch')
  return () => withGqlFetch(original(), gqlFetch)
})
// The data-fetching wrapper, reduced to its contract: run the handler at once, expose data / error / refresh.
mockNuxtImport('useAsyncData', async () => {
  const { ref } = await import('vue')
  return (key: string, handler: () => Promise<unknown>, options: unknown) => {
    asyncDataCalls.calls.push({ key, options })
    const data = ref<unknown>(null)
    const error = ref<unknown>(null)
    const refresh = async () => {
      try {
        data.value = await handler()
        error.value = null
      } catch (err) {
        error.value = err
      }
    }
    void refresh()
    return { data, error, refresh }
  }
})
mockNuxtImport('useGqlSubscription', async () => {
  const { ref } = await import('vue')
  return (query: string, variables: Record<string, unknown>, options: object) => {
    const data = ref(null)
    subscriptions.calls.push({ query, variables, options, data })
    return { data }
  }
})

const { ORDER_COMPLETED_QUERY, useOrderCompleted } =
  await import('#engine/composables/useOrderCompleted')

const NOW = new Date('2026-10-04T12:00:00Z')
const MINUTES = 60_000
const subscription = () => subscriptions.calls.at(-1) as SubscriptionCall
const ramen = makeProduct({ id: 'ramen' })

const paid = (overrides: Partial<Order> = {}) =>
  makeOrder({
    status: 'CONFIRMED',
    payment: makePayment({ status: 'paid', paidAt: '2026-10-04T11:59:00Z' }),
    ...overrides,
  })
const pending = (overrides: Partial<Order> = {}) =>
  makeOrder({ status: 'PENDING', payment: makePayment({ status: 'open' }), ...overrides })
const cash = (overrides: Partial<Order> = {}) =>
  makeOrder({ isOnlinePayment: false, status: 'PENDING', payment: null, ...overrides })

let cart: ReturnType<typeof useCartStore>
let current: { unmount: () => void } | undefined

/** The API answers `myOrder` with each given order in turn (the last one is repeated). */
const serve = (...orders: (Order | Error)[]) => {
  let index = 0
  gqlFetch.mockImplementation(async () => {
    const next = orders[Math.min(index++, orders.length - 1)]!
    if (next instanceof Error) throw next
    return { myOrder: next }
  })
}
const mount = (orderId = 'order-1') => {
  const view = withSetup(() => useOrderCompleted(orderId))
  current = view
  return view.result
}
const settle = (ms = 0) => vi.advanceTimersByTimeAsync(ms)
const fetches = () => gqlFetch.mock.calls.length

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'],
  })
  vi.setSystemTime(NOW)
  setActivePinia(createPinia())
  cart = useCartStore()
  cart.addProduct(ramen, 2)
  cart.pendingOrderId = 'order-1'
  gqlFetch.mockReset()
  subscriptions.calls = []
  asyncDataCalls.calls = []
})
afterEach(() => {
  current?.unmount()
  current = undefined
  vi.useRealTimers()
})

describe('loading the order', () => {
  it('asks for the order of the page, on the client only (SSR has no OIDC token), and does not wait for it', async () => {
    serve(paid())
    mount('order-1')
    expect(asyncDataCalls.calls).toEqual([{ key: 'order-order-1', options: { server: false } }])
    await settle()
    expect(gqlFetch.mock.calls[0]![0]).toBe(ORDER_COMPLETED_QUERY)
    expect(gqlFetch.mock.calls[0]![1]).toEqual({ variables: { orderId: 'order-1' } })
  })

  it('shows a neutral spinner until the order is there, and decides nothing from the first render', async () => {
    serve(paid())
    const view = mount()
    expect(view.order.value).toBeNull()
    expect(view.phase.value).toBe('loading')
    expect(view.resolvingPayment.value).toBe(true)
    expect(view.paymentProblem.value).toBe(false)
    expect(cart.products).toHaveLength(1)
    await settle()
    expect(view.order.value?.id).toBe('order-1')
    expect(view.phase.value).toBe('confirmed')
    expect(view.resolvingPayment.value).toBe(false)
  })

  it('an order that cannot be loaded is an error card, and the cart is kept', async () => {
    serve(new Error('forbidden'))
    const view = mount()
    await settle()
    expect(view.phase.value).toBe('error')
    expect(view.orderError.value).toBeInstanceOf(Error)
    expect(view.order.value).toBeNull()
    expect(cart.products).toHaveLength(1)
  })

  it('closes the cart sheet when the page is mounted', async () => {
    serve(paid())
    cart.setCartVisibility(true)
    mount()
    expect(cart.isCartVisible).toBe(false)
  })

  it('hands back refresh, the live update ref and the order', async () => {
    serve(paid())
    const view = mount()
    await settle()
    expect(typeof view.refresh).toBe('function')
    expect(view.liveUpdate.value).toBeNull()
    await view.refresh()
    expect(fetches()).toBe(2)
  })
})

describe('the outcome of the payment', () => {
  it('paid online: confirmed', async () => {
    serve(paid())
    const view = mount()
    await settle()
    expect(view.phase.value).toBe('confirmed')
    expect(view.paymentOutcome.value).toBeNull()
    expect(view.paymentProblem.value).toBe(false)
    expect(view.awaitingConfirmation.value).toBe(false)
  })

  it('a cash order is confirmed straight away', async () => {
    serve(cash())
    const view = mount()
    await settle()
    expect(view.phase.value).toBe('confirmed')
  })

  it.each([['canceled'], ['failed'], ['expired']])(
    'a payment that ended %s sends the customer to the retry screen, the cart is kept',
    async (status) => {
      serve(pending({ payment: makePayment({ status }) }))
      const view = mount()
      await settle()
      expect(view.phase.value).toBe('problem')
      expect(view.paymentProblem.value).toBe(true)
      expect(view.paymentOutcome.value).toBe(status)
      expect(cart.products).toHaveLength(1)
      expect(cart.pendingOrderId).toBe('order-1')
    },
  )

  it('an order the backend already cancelled, with a payment still open, is a problem too', async () => {
    serve(makeOrder({ status: 'CANCELLED', payment: makePayment({ status: 'open' }) }))
    const view = mount()
    await settle()
    expect(view.phase.value).toBe('problem')
    expect(view.paymentOutcome.value).toBe('abandoned')
  })

  it('an order the webhook has not confirmed yet is "verifying": a spinner, not an error', async () => {
    serve(pending())
    const view = mount()
    await settle()
    expect(view.phase.value).toBe('verifying')
    expect(view.resolvingPayment.value).toBe(true)
    expect(view.paymentProblem.value).toBe(false)
    expect(cart.products).toHaveLength(1)
  })
})

describe('clearing the cart', () => {
  it('a confirmed order clears the cart that was checked out for it', async () => {
    serve(paid())
    mount()
    await settle()
    expect(cart.products).toEqual([])
    expect(cart.pendingOrderId).toBeNull()
  })

  it('a cash order clears it too', async () => {
    serve(cash())
    mount()
    await settle()
    expect(cart.products).toEqual([])
  })

  it('never wipes a cart that was checked out for ANOTHER order (revisiting an old confirmation)', async () => {
    cart.pendingOrderId = 'order-other'
    serve(paid({ createdAt: '2026-10-04T11:59:00Z' }))
    mount()
    await settle()
    expect(cart.products).toHaveLength(1)
    expect(cart.pendingOrderId).toBe('order-other')
  })

  it('a cart with no pending id (checked out by the previous bundle) is cleared when the order is minutes old', async () => {
    cart.pendingOrderId = null
    serve(paid({ createdAt: new Date(NOW.getTime() - 5 * MINUTES).toISOString() }))
    mount()
    await settle()
    expect(cart.products).toEqual([])
  })

  it('...but not when the order is old: whatever is in the cart now is the customer’s new basket', async () => {
    cart.pendingOrderId = null
    serve(paid({ createdAt: new Date(NOW.getTime() - 3 * 60 * MINUTES).toISOString() }))
    mount()
    await settle()
    expect(cart.products).toHaveLength(1)
  })

  it('waits for a late hydration of the pending id (the persisted cart arrives after the order)', async () => {
    cart.pendingOrderId = 'order-other'
    serve(paid())
    mount()
    await settle()
    expect(cart.products).toHaveLength(1)
    cart.pendingOrderId = 'order-1'
    await settle()
    expect(cart.products).toEqual([])
  })

  it('commits once: a basket started afterwards is not wiped by the same page', async () => {
    serve(paid())
    mount()
    await settle()
    expect(cart.products).toEqual([])
    cart.addProduct(ramen, 1)
    cart.pendingOrderId = 'order-1'
    await settle()
    expect(cart.products).toHaveLength(1)
  })

  it('does not clear the cart on the server', async () => {
    setFlags({ server: true })
    serve(paid())
    mount()
    await settle()
    expect(cart.products).toHaveLength(1)
  })

  it('does not clear while verifying, nor on a problem, nor on an error', async () => {
    for (const answer of [
      pending(),
      pending({ payment: makePayment({ status: 'failed' }) }),
      new Error('x'),
    ]) {
      cart.products = []
      cart.addProduct(ramen, 1)
      cart.pendingOrderId = 'order-1'
      serve(answer)
      mount()
      await settle()
      expect(cart.products).toHaveLength(1)
      current?.unmount()
      subscriptions.calls = []
    }
  })

  it('clears once a pending order is confirmed by the verify loop', async () => {
    serve(pending(), paid())
    mount()
    await settle()
    expect(cart.products).toHaveLength(1)
    await settle(800)
    expect(cart.products).toEqual([])
  })
})

describe('the verify loop (the webhook may be late)', () => {
  it('re-checks after 800 ms, and stops as soon as the order is confirmed', async () => {
    serve(pending(), pending(), paid())
    const view = mount()
    await settle()
    expect(fetches()).toBe(1)
    await settle(799)
    expect(fetches()).toBe(1)
    await settle(1)
    expect(fetches()).toBe(2)
    expect(view.phase.value).toBe('verifying')
    await settle(1200)
    expect(fetches()).toBe(3)
    expect(view.phase.value).toBe('confirmed')
    await settle(5000) // Well before the 15 s safety net: no further re-check of the loop
    expect(fetches()).toBe(3)
    expect(view.awaitingConfirmation.value).toBe(false)
  })

  it('gaps grow 0.8, 1.2, 1.5, 2, 3, 4, 5 s; then it gives up with the neutral "awaiting confirmation" card, cart kept', async () => {
    serve(pending())
    const view = mount()
    await settle()
    let elapsed = 0
    for (const gap of [800, 1200, 1500, 2000, 3000, 4000, 5000]) {
      expect(view.phase.value).toBe('verifying')
      await settle(gap)
      elapsed += gap
    }
    expect(elapsed).toBe(17_500)
    expect(fetches()).toBe(8) // The first load + the seven re-checks
    expect(view.phase.value).toBe('awaiting-confirmation')
    expect(view.awaitingConfirmation.value).toBe(true)
    expect(view.paymentProblem.value).toBe(false) // Never the retry screen: the webhook may just be late
    expect(view.resolvingPayment.value).toBe(false)
    expect(cart.products).toHaveLength(1)
  })

  it('a failed re-check is transient: it keeps polling', async () => {
    serve(pending(), new Error('blip'), paid())
    const view = mount()
    await settle()
    await settle(800)
    expect(view.phase.value).toBe('verifying')
    await settle(1200)
    expect(view.phase.value).toBe('confirmed')
  })

  it('an answer without an order is ignored', async () => {
    serve(pending())
    const view = mount()
    await settle()
    gqlFetch.mockResolvedValue({ myOrder: null })
    await settle(800)
    expect(view.order.value?.id).toBe('order-1')
    expect(view.phase.value).toBe('verifying')
  })

  it('a problem found by the re-check ends the loop on the retry screen', async () => {
    serve(pending(), pending({ payment: makePayment({ status: 'failed' }) }))
    const view = mount()
    await settle()
    await settle(800)
    expect(view.phase.value).toBe('problem')
    const after = fetches()
    await settle(5000)
    expect(fetches()).toBe(after) // No more re-checks
  })

  it('leaving the page stops the loop and never marks the window as expired', async () => {
    serve(pending())
    const view = mount()
    await settle()
    await settle(800)
    const before = fetches()
    current?.unmount()
    await settle(60_000)
    expect(fetches()).toBe(before)
    expect(view.phase.value).toBe('verifying')
  })

  it('leaving the page while a re-check is in flight ends the loop quietly', async () => {
    let release!: (value: unknown) => void
    serve(pending())
    const view = mount()
    await settle()
    gqlFetch.mockImplementation(() => new Promise((resolve) => (release = resolve)))
    await settle(800)
    current?.unmount()
    release({ myOrder: paid() })
    await settle(60_000)
    expect(fetches()).toBe(2)
    expect(view.awaitingConfirmation.value).toBe(false) // The window was not declared expired
    expect(cart.products).toHaveLength(1) // The page is gone: it no longer touches the cart
  })

  it('a push that confirms the order while the loop sleeps ends the loop without another request', async () => {
    serve(pending())
    const view = mount()
    await settle()
    await settle(400)
    subscription().data.value = {
      myOrderUpdated: { status: 'CONFIRMED', payment: makePayment({ status: 'paid' }) },
    }
    await settle(400) // The first gap (800 ms) ends: the phase is no longer verifying
    expect(view.phase.value).toBe('confirmed')
    expect(fetches()).toBe(1)
    await settle(5000)
    expect(fetches()).toBe(1)
  })

  it('a payment that goes failed then open again while the loop runs does not start a second loop', async () => {
    serve(pending())
    mount()
    await settle()
    subscription().data.value = {
      myOrderUpdated: { payment: makePayment({ status: 'failed' }) },
    }
    await settle(100)
    subscription().data.value = {
      myOrderUpdated: { payment: makePayment({ status: 'open' }) },
    }
    await settle(800)
    // One loop only: one re-check at 800 ms, the next gap (1200 ms) has not elapsed.
    expect(fetches()).toBe(2)
    await settle(1200)
    expect(fetches()).toBe(3)
  })

  it('does not run on the server', async () => {
    setFlags({ server: true })
    serve(pending())
    mount()
    await settle(20_000)
    expect(fetches()).toBeLessThanOrEqual(2) // Only the load (and at most the safety net)
  })
})

describe('live updates', () => {
  it('subscribes to the order and recovers the gap after a reconnect', async () => {
    serve(paid())
    mount('order-1')
    await settle()
    const live = subscription()
    expect(live.query).toContain('myOrderUpdated')
    expect(live.variables).toEqual({ orderId: 'order-1' })
    serve(paid({ status: 'PREPARING' }))
    await live.options.onReconnect!()
    expect(subscription().data).toBeDefined()
  })

  it('a pushed update is merged into the loaded order', async () => {
    serve(paid())
    const view = mount()
    await settle()
    subscription().data.value = {
      myOrderUpdated: { status: 'PREPARING', estimatedReadyTime: '2026-10-04T12:30:00Z' },
    }
    await settle()
    expect(view.order.value).toMatchObject({
      id: 'order-1',
      status: 'PREPARING',
      estimatedReadyTime: '2026-10-04T12:30:00Z',
      type: 'PICKUP',
    })
    expect(view.liveUpdate.value?.myOrderUpdated?.status).toBe('PREPARING')
  })

  it('an update that arrives before the order is loaded is not applied', async () => {
    serve(new Error('not yet'))
    const view = mount()
    await settle()
    subscription().data.value = { myOrderUpdated: { status: 'PREPARING' } }
    await settle()
    expect(view.order.value).toBeNull()
  })

  it('an empty push changes nothing', async () => {
    serve(paid())
    const view = mount()
    await settle()
    subscription().data.value = {}
    await settle()
    expect(view.order.value?.status).toBe('CONFIRMED')
  })

  it('a payment confirmed by a push ends the verifying phase', async () => {
    serve(pending())
    const view = mount()
    await settle()
    expect(view.phase.value).toBe('verifying')
    subscription().data.value = {
      myOrderUpdated: { status: 'CONFIRMED', payment: makePayment({ status: 'paid' }) },
    }
    await settle()
    expect(view.phase.value).toBe('confirmed')
    expect(cart.products).toEqual([])
  })

  it('after a reconnect the order is fetched again and merged; a failure there is not shown', async () => {
    serve(paid())
    const view = mount()
    await settle()
    serve(paid({ status: 'PREPARING' }))
    await subscription().options.onReconnect!()
    expect(view.order.value?.status).toBe('PREPARING')
    gqlFetch.mockRejectedValue(new Error('offline'))
    await expect(subscription().options.onReconnect!()).resolves.toBeUndefined()
    expect(view.order.value?.status).toBe('PREPARING')
    gqlFetch.mockResolvedValue({ myOrder: null })
    await subscription().options.onReconnect!()
    expect(view.order.value?.status).toBe('PREPARING')
  })
})

describe('the polling fallback (a WebSocket that fails silently)', () => {
  it('starts after 15 s, then asks every 15 s and merges a changed status', async () => {
    serve(paid())
    const view = mount()
    await settle()
    const base = fetches()
    serve(paid({ status: 'PREPARING' }))
    await settle(14_999)
    expect(fetches()).toBe(base)
    await settle(1) // The poll starts now; its first tick is 15 s later
    await settle(15_000)
    expect(fetches()).toBe(base + 1)
    expect(view.order.value?.status).toBe('PREPARING')
  })

  it('a changed payment status is merged as well', async () => {
    serve(pending({ createdAt: '2026-10-04T11:59:00Z' }))
    const view = mount()
    await settle()
    serve(pending({ payment: makePayment({ status: 'paid' }), status: 'PENDING' }))
    await settle(30_000)
    expect(view.order.value?.payment?.status).toBe('paid')
  })

  it('an unchanged answer is not merged (no needless re-render)', async () => {
    serve(paid())
    const view = mount()
    await settle()
    const before = view.order.value
    serve(paid({ updatedAt: '2026-10-04T12:00:00Z' }))
    await settle(30_000)
    expect(view.order.value).toBe(before)
  })

  it('recovers a failed first load', async () => {
    serve(new Error('first load failed'), paid())
    const view = mount()
    await settle()
    expect(view.phase.value).toBe('error')
    await settle(30_000)
    expect(view.order.value?.id).toBe('order-1')
    expect(view.orderError.value).toBeNull()
    expect(view.phase.value).toBe('confirmed')
  })

  it('stops once the order is in a terminal state', async () => {
    serve(paid())
    mount()
    await settle()
    serve(paid({ status: 'PICKED_UP' }))
    await settle(30_000)
    const after = fetches()
    await settle(120_000)
    expect(fetches()).toBe(after)
  })

  it('survives an error and an empty answer, and keeps going', async () => {
    serve(paid())
    const view = mount()
    await settle()
    gqlFetch.mockRejectedValue(new Error('blip'))
    await settle(30_000)
    gqlFetch.mockResolvedValue({ myOrder: null })
    await settle(15_000)
    serve(paid({ status: 'PREPARING' }))
    await settle(15_000)
    expect(view.order.value?.status).toBe('PREPARING')
  })

  it('stops with the page: no timer, no request', async () => {
    serve(paid())
    mount()
    await settle()
    await settle(30_000)
    const before = fetches()
    current?.unmount()
    await settle(120_000)
    expect(fetches()).toBe(before)
  })

  it('leaving the page before the poll even starts cancels it', async () => {
    serve(paid())
    mount()
    await settle()
    const before = fetches()
    current?.unmount()
    await settle(120_000)
    expect(fetches()).toBe(before)
  })

  it('a poll answer that arrives after the page was left is dropped', async () => {
    serve(paid())
    const view = mount()
    await settle()
    let release!: (value: unknown) => void
    gqlFetch.mockImplementation(() => new Promise((resolve) => (release = resolve)))
    await settle(30_000)
    current?.unmount()
    release({ myOrder: paid({ status: 'PREPARING' }) })
    await settle()
    expect(view.order.value?.status).toBe('CONFIRMED')
  })
})
