// UseOrderTracking: live tracking of a list of orders (the /me widget and /me/orders): one subscription per ACTIVE order,
// A live patch layered over the queried data (never older than it), a refetch when the socket reconnects, a polling
// Fallback while any order is active, `?followOrder=<id>` expand-and-scroll, and the status labels.
// Boundaries: the WebSocket subscription, the route, i18n (fake) and the clock. Runs in a real component setup.
// Run: `vp test run layers/engine/composables/useOrderTracking.nuxt.test.ts`.
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { type Ref, nextTick, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { setFlags } from '../../../test/flags'
import type { Order } from '#engine/types'
import { makeOrder } from '../../../test/fixtures/order'
import { withSetup } from '../../../test/helpers/withSetup'

interface Sub {
  query: string
  variables: { orderId: string }
  options: { onReconnect: () => void | Promise<void> }
  data: Ref<{ myOrderUpdated?: Partial<Order> } | null>
  stopped: boolean
}
const subs = vi.hoisted(() => ({ list: [] as unknown[] }))
const route = await vi.hoisted(async () => {
  const { reactive } = await import('vue')
  return reactive({ query: {} })
})

mockNuxtImport('useGqlSubscription', async () => {
  const { onScopeDispose, ref } = await import('vue')
  return (query: string, variables: { orderId: string }, options: object) => {
    const sub = { query, variables, options, data: ref(null), stopped: false }
    onScopeDispose(() => {
      sub.stopped = true
    })
    subs.list.push(sub)
    return { data: sub.data }
  }
})
mockNuxtImport('useRoute', () => () => route)
vi.mock('vue-i18n', async (importOriginal) => {
  const { fakeI18n } = await import('../../../test/helpers/i18n')
  return { ...(await importOriginal<typeof import('vue-i18n')>()), useI18n: fakeI18n }
})

const { isOrderCompleted, isOrderFailed, isOrderSuccess, useOrderTracking } =
  await import('#engine/composables/useOrderTracking')

const allSubs = () => subs.list as Sub[]
const subFor = (orderId: string) => allSubs().find((s) => s.variables.orderId === orderId)!
const liveSubs = () =>
  allSubs()
    .filter((s) => !s.stopped)
    .map((s) => s.variables.orderId)

const order = (id: string, status: Order['status'] = 'PREPARING', extra: Partial<Order> = {}) =>
  makeOrder({ id, status, ...extra })

let current: { unmount: () => void } | undefined
const orders = ref<Order[] | null | undefined>(null)
const refetch = vi.fn()
const revealOrder = vi.fn()

const mount = (options: { autoExpandActive?: boolean; reveal?: boolean } = {}) => {
  const view = withSetup(() =>
    useOrderTracking({
      orders,
      refetch,
      autoExpandActive: options.autoExpandActive,
      revealOrder: options.reveal === false ? undefined : revealOrder,
    }),
  )
  current = view
  return view.result
}
const settle = (ms = 0) => vi.advanceTimersByTimeAsync(ms)

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'],
  })
  subs.list = []
  route.query = {}
  orders.value = null
  refetch.mockReset().mockResolvedValue(undefined)
  revealOrder.mockReset()
})
afterEach(() => {
  current?.unmount()
  current = undefined
  vi.useRealTimers()
  document.body.innerHTML = ''
})

describe('status helpers', () => {
  it('completed is delivered, picked up, cancelled or failed; success and failed split it', () => {
    for (const status of ['DELIVERED', 'PICKED_UP', 'CANCELLED', 'FAILED']) {
      expect(isOrderCompleted(status)).toBe(true)
    }
    for (const status of [
      'PENDING',
      'CONFIRMED',
      'PREPARING',
      'AWAITING_PICK_UP',
      'OUT_FOR_DELIVERY',
    ]) {
      expect(isOrderCompleted(status)).toBe(false)
    }
    expect(['DELIVERED', 'PICKED_UP', 'CANCELLED'].map(isOrderSuccess)).toEqual([true, true, false])
    expect(['CANCELLED', 'FAILED', 'DELIVERED'].map(isOrderFailed)).toEqual([true, true, false])
  })

  it('are handed back by the composable too', () => {
    const view = mount()
    expect([view.isOrderCompleted, view.isOrderSuccess, view.isOrderFailed]).toEqual([
      isOrderCompleted,
      isOrderSuccess,
      isOrderFailed,
    ])
  })
})

describe('tracked orders', () => {
  it('null while the orders are not loaded, then the orders as queried', () => {
    const view = mount()
    expect(view.trackedOrders.value).toBeNull()
    orders.value = undefined
    expect(view.trackedOrders.value).toBeNull()
    orders.value = [order('a')]
    expect(view.trackedOrders.value?.map((o) => o.id)).toEqual(['a'])
  })

  it('a live patch is layered over the queried order', async () => {
    orders.value = [order('a', 'PREPARING')]
    const view = mount()
    subFor('a').data.value = {
      myOrderUpdated: { status: 'OUT_FOR_DELIVERY', estimatedReadyTime: '2026-10-04T19:30:00Z' },
    }
    await nextTick()
    expect(view.trackedOrders.value![0]).toMatchObject({
      id: 'a',
      status: 'OUT_FOR_DELIVERY',
      estimatedReadyTime: '2026-10-04T19:30:00Z',
      type: 'PICKUP',
    })
  })

  it('successive patches accumulate', async () => {
    orders.value = [order('a', 'PENDING')]
    const view = mount()
    subFor('a').data.value = { myOrderUpdated: { status: 'CONFIRMED' } }
    await nextTick()
    subFor('a').data.value = { myOrderUpdated: { estimatedReadyTime: '2026-10-04T19:30:00Z' } }
    await nextTick()
    expect(view.trackedOrders.value![0]).toMatchObject({
      status: 'CONFIRMED',
      estimatedReadyTime: '2026-10-04T19:30:00Z',
    })
  })

  it('a stale live patch does not overwrite a refetched order that is newer', async () => {
    orders.value = [order('a', 'PREPARING', { updatedAt: '2026-10-04T18:00:00Z' })]
    const view = mount()
    subFor('a').data.value = {
      myOrderUpdated: { status: 'CONFIRMED', updatedAt: '2026-10-04T17:00:00Z' },
    }
    await nextTick()
    expect(view.trackedOrders.value![0]!.status).toBe('PREPARING')
    subFor('a').data.value = {
      myOrderUpdated: { status: 'OUT_FOR_DELIVERY', updatedAt: '2026-10-04T18:05:00Z' },
    }
    await nextTick()
    expect(view.trackedOrders.value![0]!.status).toBe('OUT_FOR_DELIVERY')
  })

  it('a patch or an order without a date is applied (nothing to compare)', async () => {
    orders.value = [order('a', 'PREPARING', { updatedAt: '' })]
    const view = mount()
    subFor('a').data.value = {
      myOrderUpdated: { status: 'CONFIRMED', updatedAt: '2026-10-04T17:00:00Z' },
    }
    await nextTick()
    expect(view.trackedOrders.value![0]!.status).toBe('CONFIRMED')
    subFor('a').data.value = { myOrderUpdated: { status: 'PREPARING' } }
    await nextTick()
    expect(view.trackedOrders.value![0]!.status).toBe('PREPARING')
  })

  it('an empty push changes nothing', async () => {
    orders.value = [order('a')]
    const view = mount()
    subFor('a').data.value = {}
    await nextTick()
    expect(view.trackedOrders.value![0]!.status).toBe('PREPARING')
  })

  it('getTrackedOrder applies the same rule to one order', () => {
    const view = mount()
    const base = order('z')
    expect(view.getTrackedOrder(base)).toBe(base)
  })
})

describe('one subscription per active order', () => {
  it('subscribes to each active order, with the order id and the reconnect hook; not to finished ones', () => {
    orders.value = [
      order('a', 'PREPARING'),
      order('b', 'DELIVERED'),
      order('c', 'PENDING'),
      order('d', 'CANCELLED'),
    ]
    mount()
    expect(liveSubs()).toEqual(['a', 'c'])
    expect(subFor('a').query).toContain('myOrderUpdated')
    expect(subFor('a').variables).toEqual({ orderId: 'a' })
    expect(typeof subFor('a').options.onReconnect).toBe('function')
  })

  it('subscribes when an order appears or becomes active, and only once', async () => {
    const view = mount()
    expect(liveSubs()).toEqual([])
    orders.value = [order('a', 'PENDING')]
    await nextTick()
    expect(liveSubs()).toEqual(['a'])
    orders.value = [order('a', 'CONFIRMED'), order('b', 'PENDING')]
    await nextTick()
    expect(liveSubs()).toEqual(['a', 'b'])
    expect(allSubs()).toHaveLength(2)
    expect(view.trackedOrders.value).toHaveLength(2)
  })

  it('drops the subscription of an order that completes (by a live push) or disappears', async () => {
    orders.value = [order('a', 'PREPARING'), order('b', 'PREPARING')]
    mount()
    subFor('a').data.value = { myOrderUpdated: { status: 'DELIVERED' } }
    await nextTick()
    expect(liveSubs()).toEqual(['b'])
    orders.value = []
    await nextTick()
    expect(liveSubs()).toEqual([])
  })

  it('a completed order that becomes active again (a refetch) is subscribed to again', async () => {
    orders.value = [order('a', 'DELIVERED')]
    mount()
    expect(liveSubs()).toEqual([])
    orders.value = [order('a', 'PREPARING')]
    await nextTick()
    expect(liveSubs()).toEqual(['a'])
  })

  it('all subscriptions stop when the page is left', () => {
    orders.value = [order('a'), order('b')]
    const view = mount()
    expect(liveSubs()).toEqual(['a', 'b'])
    current?.unmount()
    expect(liveSubs()).toEqual([])
    expect(view.trackedOrders.value).toHaveLength(2)
  })

  it('nothing is subscribed on the server', () => {
    setFlags({ server: true })
    orders.value = [order('a')]
    mount()
    expect(allSubs()).toEqual([])
  })

  it('a push for an order updates only that order', async () => {
    orders.value = [order('a', 'PREPARING'), order('b', 'PREPARING')]
    const view = mount()
    subFor('b').data.value = { myOrderUpdated: { status: 'AWAITING_PICK_UP' } }
    await nextTick()
    expect(view.trackedOrders.value!.map((o) => o.status)).toEqual([
      'PREPARING',
      'AWAITING_PICK_UP',
    ])
  })
})

describe('refetching', () => {
  it('after a reconnect the orders are queried again; N subscriptions reconnecting cost one request', async () => {
    orders.value = [order('a'), order('b'), order('c')]
    mount()
    await Promise.all(allSubs().map((s) => Promise.resolve(s.options.onReconnect())))
    expect(refetch).toHaveBeenCalledOnce()
    await subFor('a').options.onReconnect() // The earlier one is over: a new request is allowed
    expect(refetch).toHaveBeenCalledTimes(2)
  })

  it('a failing refetch is swallowed and does not block the next one', async () => {
    orders.value = [order('a')]
    mount()
    refetch.mockRejectedValueOnce(new Error('offline'))
    await expect(subFor('a').options.onReconnect()).resolves.toBeUndefined()
    await subFor('a').options.onReconnect()
    expect(refetch).toHaveBeenCalledTimes(2)
  })
})

describe('the polling fallback', () => {
  it('polls every 30 s while any order is active', async () => {
    orders.value = [order('a')]
    mount()
    await settle(29_999)
    expect(refetch).not.toHaveBeenCalled()
    await settle(1)
    expect(refetch).toHaveBeenCalledTimes(1)
    await settle(30_000)
    expect(refetch).toHaveBeenCalledTimes(2)
  })

  it('starts when an order becomes active, and stops when none is left', async () => {
    const view = mount()
    await settle(120_000)
    expect(refetch).not.toHaveBeenCalled()
    orders.value = [order('a', 'PENDING')]
    await nextTick()
    await settle(30_000)
    expect(refetch).toHaveBeenCalledTimes(1)
    orders.value = [order('a', 'DELIVERED')]
    await nextTick()
    await settle(120_000)
    expect(refetch).toHaveBeenCalledTimes(1)
    expect(view.trackedOrders.value).toHaveLength(1)
  })

  it('does not stack timers when the active set changes while polling', async () => {
    orders.value = [order('a')]
    mount()
    orders.value = [order('a'), order('b')]
    await nextTick()
    await settle(30_000)
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('does not poll while the tab is hidden', async () => {
    orders.value = [order('a')]
    mount()
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
    await settle(90_000)
    expect(refetch).not.toHaveBeenCalled()
    Reflect.deleteProperty(document, 'hidden')
    await settle(30_000)
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('stops with the page', async () => {
    orders.value = [order('a')]
    mount()
    current?.unmount()
    await settle(120_000)
    expect(refetch).not.toHaveBeenCalled()
  })

  it('does not run on the server', async () => {
    setFlags({ server: true })
    orders.value = [order('a')]
    mount()
    await settle(120_000)
    expect(refetch).not.toHaveBeenCalled()
  })
})

describe('expanding', () => {
  it('toggles an order open and closed', () => {
    const view = mount()
    expect(view.isExpanded('a')).toBe(false)
    view.toggleOrder('a')
    expect(view.isExpanded('a')).toBe(true)
    expect(view.expandedOrders.value.has('a')).toBe(true)
    view.toggleOrder('a')
    expect(view.isExpanded('a')).toBe(false)
  })

  it('the widget expands active orders the first time they show up, never finished ones', async () => {
    orders.value = [order('a', 'PREPARING'), order('b', 'DELIVERED')]
    const view = mount({ autoExpandActive: true })
    expect(view.isExpanded('a')).toBe(true)
    expect(view.isExpanded('b')).toBe(false)
    orders.value = [...orders.value, order('c', 'PENDING')]
    await nextTick()
    expect(view.isExpanded('c')).toBe(true)
  })

  it('a customer who collapses an active order does not get it re-opened', async () => {
    orders.value = [order('a', 'PREPARING')]
    const view = mount({ autoExpandActive: true })
    view.toggleOrder('a')
    expect(view.isExpanded('a')).toBe(false)
    orders.value = [order('a', 'OUT_FOR_DELIVERY'), order('b', 'PENDING')]
    await nextTick()
    expect(view.isExpanded('a')).toBe(false)
    expect(view.isExpanded('b')).toBe(true)
  })

  it('without autoExpandActive nothing opens by itself', () => {
    orders.value = [order('a', 'PREPARING')]
    expect(mount().isExpanded('a')).toBe(false)
  })
})

describe('?followOrder=<id> (the "follow your order" email link)', () => {
  const card = (id: string) => {
    const el = document.createElement('div')
    el.id = `order-card-${id}`
    const scroll = vi.fn()
    el.scrollIntoView = scroll
    document.body.append(el)
    return Object.assign(el, { scroll })
  }

  it('expands that order, makes sure it is rendered, and scrolls to it once the DOM has updated', async () => {
    const el = card('b')
    route.query = { followOrder: 'b' }
    orders.value = [order('a'), order('b')]
    const view = mount()
    expect(view.isExpanded('b')).toBe(true)
    expect(revealOrder).toHaveBeenCalledExactlyOnceWith(1)
    await nextTick()
    expect(el.scroll).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' })
  })

  it('on a hard load the list arrives after setup: it is handled when the order shows up', async () => {
    route.query = { followOrder: 'b' }
    const view = mount()
    expect(revealOrder).not.toHaveBeenCalled()
    orders.value = [order('a')] // Not in the list yet (a first page)
    await nextTick()
    expect(revealOrder).not.toHaveBeenCalled()
    const el = card('b')
    orders.value = [order('a'), order('b')]
    await nextTick()
    await nextTick()
    expect(revealOrder).toHaveBeenCalledExactlyOnceWith(1)
    expect(view.isExpanded('b')).toBe(true)
    expect(el.scroll).toHaveBeenCalledOnce()
  })

  it('is handled once: a later refetch does not scroll again, even if the customer scrolled away', async () => {
    const el = card('a')
    route.query = { followOrder: 'a' }
    orders.value = [order('a')]
    mount()
    await nextTick()
    orders.value = [order('a', 'CONFIRMED')]
    await nextTick()
    await nextTick()
    expect(revealOrder).toHaveBeenCalledOnce()
    expect(el.scroll).toHaveBeenCalledOnce()
  })

  it('takes the first value of a repeated parameter', async () => {
    route.query = { followOrder: ['b', 'a'] }
    orders.value = [order('a'), order('b')]
    const view = mount()
    expect(view.isExpanded('b')).toBe(true)
    expect(view.isExpanded('a')).toBe(false)
  })

  it.each([[undefined], [''], [123], [[]]])(
    'ignores a missing or unusable parameter (%j)',
    (value) => {
      route.query = { followOrder: value }
      orders.value = [order('a')]
      const view = mount()
      expect(view.isExpanded('a')).toBe(false)
      expect(revealOrder).not.toHaveBeenCalled()
    },
  )

  it('does nothing while the orders are not loaded', () => {
    route.query = { followOrder: 'a' }
    mount()
    expect(revealOrder).not.toHaveBeenCalled()
  })

  it('works for a page without a pagination callback', async () => {
    const el = card('a')
    route.query = { followOrder: 'a' }
    orders.value = [order('a')]
    const view = mount({ reveal: false })
    await nextTick()
    expect(view.isExpanded('a')).toBe(true)
    expect(el.scroll).toHaveBeenCalled()
  })

  it('a card that is not in the DOM is survived', async () => {
    route.query = { followOrder: 'a' }
    orders.value = [order('a')]
    const view = mount()
    await nextTick()
    expect(view.isExpanded('a')).toBe(true)
  })

  it('uses an instant jump when the visitor asked for reduced motion', async () => {
    const original = window.matchMedia
    window.matchMedia = ((query: string) => ({
      matches: query.includes('reduce'),
    })) as typeof window.matchMedia
    const el = card('a')
    route.query = { followOrder: 'a' }
    orders.value = [order('a')]
    mount()
    await nextTick()
    window.matchMedia = original
    expect(el.scroll).toHaveBeenCalledWith({ behavior: 'auto', block: 'center' })
  })

  it('on the server it expands but does not scroll', async () => {
    setFlags({ server: true })
    const el = card('a')
    route.query = { followOrder: 'a' }
    orders.value = [order('a')]
    const view = mount()
    await nextTick()
    expect(view.isExpanded('a')).toBe(true)
    expect(el.scroll).not.toHaveBeenCalled()
  })
})

describe('getStatus (labels)', () => {
  it('maps every status to its label key', () => {
    const { getStatus } = mount()
    expect(getStatus('PENDING')).toBe('me.orders.status.pending')
    expect(getStatus('CONFIRMED')).toBe('me.orders.status.confirmed')
    expect(getStatus('PREPARING')).toBe('me.orders.status.preparing')
    expect(getStatus('AWAITING_PICK_UP', 'PICKUP')).toBe('me.orders.status.awaitingPickup')
    expect(getStatus('AWAITING_PICK_UP')).toBe('me.orders.status.awaitingPickup')
    expect(getStatus('OUT_FOR_DELIVERY')).toBe('me.orders.status.outForDelivery')
    expect(getStatus('PICKED_UP')).toBe('me.orders.status.pickedUp')
    expect(getStatus('DELIVERED')).toBe('me.orders.status.delivered')
    expect(getStatus('CANCELLED')).toBe('me.orders.status.cancelled')
    expect(getStatus('FAILED')).toBe('me.orders.status.failed')
  })

  it('a delivery the kitchen has finished still reads as preparing (there is no counter step)', () => {
    expect(mount().getStatus('AWAITING_PICK_UP', 'DELIVERY')).toBe('me.orders.status.preparing')
  })

  it('an unknown status has no label', () => {
    expect(mount().getStatus('SOMETHING_NEW')).toBe('')
  })
})

describe('reactive reading', () => {
  it('a link followed while the page is open (the query changes) is handled when it changes', async () => {
    orders.value = [order('a'), order('b')]
    const view = mount()
    expect(view.isExpanded('b')).toBe(false)
    route.query = { followOrder: 'b' }
    await nextTick()
    expect(view.isExpanded('b')).toBe(true)
    expect(revealOrder).toHaveBeenCalledExactlyOnceWith(1)
  })
})

// Last on purpose: with no scope to stop them, the watchers of this call outlive the test.
describe('outside a component', () => {
  it('with no parent scope the subscriptions still work, in their own scopes', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined) // Vue warns that there is nothing to dispose with
    // Its own list: nothing stops these watchers afterwards, so no other test may be able to wake them.
    const detached = ref<Order[] | null>([order('a')])
    const view = useOrderTracking({ orders: detached, refetch: vi.fn() })
    expect(liveSubs()).toEqual(['a'])
    expect(view.trackedOrders.value).toHaveLength(1)
  })
})
