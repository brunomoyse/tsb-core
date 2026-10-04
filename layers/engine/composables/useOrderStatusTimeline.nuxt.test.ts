// useOrderStatusTimeline: the steps of an order's status timeline (delivery vs pick-up), what state each is in, the
// screen-reader suffix, and the polite announcement of a status that changes while the page is open.
// Real announcer; i18n is a fake returning the key, so the assertions name the message chosen.
// Run: `vp test run layers/engine/composables/useOrderStatusTimeline.nuxt.test.ts`.
import type * as VueI18NModule from 'vue-i18n'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { nextTick, ref } from 'vue'
import type { Order } from '#engine/types'
import { makeOrder } from '../../../test/fixtures/order'
import { useAnnouncer } from '#engine/composables/useAnnouncer'
import { useOrderStatusTimeline } from '#engine/composables/useOrderStatusTimeline'

vi.mock('vue-i18n', async (importOriginal) => {
  const { fakeI18n } = await import('../../../test/helpers/i18n')
  return { ...(await importOriginal<typeof VueI18NModule>()), useI18n: fakeI18n }
})

const title = (key: string) => `me.orders.status.details.title.${key}`
const delivery = (status: Order['status']) => makeOrder({ type: 'DELIVERY', status })
const pickup = (status: Order['status']) => makeOrder({ type: 'PICKUP', status })

const summary = (order: Order) =>
  useOrderStatusTimeline(order).steps.value.map((step) => [step.status, step.state])

beforeEach(() => {
  useAnnouncer().announcement.value = { message: '', seq: 0 }
})

describe('steps', () => {
  it('a delivery goes PENDING, CONFIRMED, PREPARING, OUT_FOR_DELIVERY, DELIVERED', () => {
    expect(summary(delivery('PENDING')).map(([status]) => status)).toEqual([
      'PENDING',
      'CONFIRMED',
      'PREPARING',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
    ])
  })

  it('a pick-up goes through the counter step AWAITING_PICK_UP and ends PICKED_UP', () => {
    expect(summary(pickup('PENDING')).map(([status]) => status)).toEqual([
      'PENDING',
      'CONFIRMED',
      'PREPARING',
      'AWAITING_PICK_UP',
      'PICKED_UP',
    ])
  })

  it('steps before the current one are done, the current one is current, the rest upcoming', () => {
    expect(summary(pickup('PREPARING'))).toEqual([
      ['PENDING', 'done'],
      ['CONFIRMED', 'done'],
      ['PREPARING', 'current'],
      ['AWAITING_PICK_UP', 'upcoming'],
      ['PICKED_UP', 'upcoming'],
    ])
  })

  it('a delivery the kitchen has finished (AWAITING_PICK_UP) still reads as preparing', () => {
    expect(summary(delivery('AWAITING_PICK_UP'))).toEqual([
      ['PENDING', 'done'],
      ['CONFIRMED', 'done'],
      ['PREPARING', 'current'],
      ['OUT_FOR_DELIVERY', 'upcoming'],
      ['DELIVERED', 'upcoming'],
    ])
  })

  it('a finished order has no current step: every step, the outcome included, is done', () => {
    for (const order of [delivery('DELIVERED'), pickup('PICKED_UP')]) {
      expect(summary(order).every(([, state]) => state === 'done')).toBe(true)
    }
  })

  it('a cancelled or failed order is not on the timeline: no step is done or current', () => {
    for (const status of ['CANCELLED', 'FAILED'] as const) {
      expect(summary(delivery(status)).every(([, state]) => state === 'upcoming')).toBe(true)
    }
  })

  it('titles are the customer-facing detailed ones, in camelCase keys', () => {
    const steps = useOrderStatusTimeline(delivery('PENDING')).steps.value
    expect(steps.map((s) => s.title)).toEqual([
      title('pending'),
      title('confirmed'),
      title('preparing'),
      title('outForDelivery'),
      title('delivered'),
    ])
    const pickupSteps = useOrderStatusTimeline(pickup('PENDING')).steps.value
    expect(pickupSteps[3]!.title).toBe(title('awaitingPickUp'))
    expect(pickupSteps[4]!.title).toBe(title('pickedUp'))
  })

  it('says "completed" / "upcoming" in text for the steps that are not the current one', () => {
    const steps = useOrderStatusTimeline(pickup('CONFIRMED')).steps.value
    expect(steps.map((s) => s.srSuffix)).toEqual([
      'orderStatus.completed',
      '',
      'orderStatus.upcoming',
      'orderStatus.upcoming',
      'orderStatus.upcoming',
    ])
  })

  it('follows a reactive order (ref or getter), including a change of type', () => {
    const order = ref<Order>(pickup('PREPARING'))
    const { steps } = useOrderStatusTimeline(order)
    expect(steps.value[3]!.status).toBe('AWAITING_PICK_UP')
    order.value = delivery('PREPARING')
    expect(steps.value[3]!.status).toBe('OUT_FOR_DELIVERY')
    const fromGetter = useOrderStatusTimeline(() => order.value)
    expect(fromGetter.steps.value[2]!.state).toBe('current')
  })
})

describe('announcements', () => {
  it('the first value (the page loading) is not announced', async () => {
    useOrderStatusTimeline(pickup('PENDING'))
    await nextTick()
    expect(useAnnouncer().announcement.value.message).toBe('')
  })

  it('a status that changes while the page is open is announced with its title', async () => {
    const order = ref<Order>(pickup('PENDING'))
    useOrderStatusTimeline(order)
    order.value = pickup('CONFIRMED')
    await nextTick()
    expect(useAnnouncer().announcement.value.message).toBe(
      `orderStatus.changed{"status":"${title('confirmed')}"}`,
    )
  })

  it('a delivery that becomes AWAITING_PICK_UP announces "preparing", the step it falls on', async () => {
    const order = ref<Order>(delivery('PREPARING'))
    useOrderStatusTimeline(order)
    order.value = delivery('AWAITING_PICK_UP')
    await nextTick()
    expect(useAnnouncer().announcement.value.message).toBe(
      `orderStatus.changed{"status":"${title('preparing')}"}`,
    )
  })

  it('a pick-up that becomes AWAITING_PICK_UP announces the counter step', async () => {
    const order = ref<Order>(pickup('PREPARING'))
    useOrderStatusTimeline(order)
    order.value = pickup('AWAITING_PICK_UP')
    await nextTick()
    expect(useAnnouncer().announcement.value.message).toContain(title('awaitingPickUp'))
  })

  it('a cancellation is announced with the plain status label (it has no detailed title)', async () => {
    const order = ref<Order>(pickup('PREPARING'))
    useOrderStatusTimeline(order)
    order.value = pickup('CANCELLED')
    await nextTick()
    expect(useAnnouncer().announcement.value.message).toBe(
      'orderStatus.changed{"status":"me.orders.status.cancelled"}',
    )
  })

  it('an update that keeps the same status (another field changed) says nothing', async () => {
    const order = ref<Order>(pickup('PREPARING'))
    useOrderStatusTimeline(order)
    order.value = { ...pickup('PREPARING'), updatedAt: '2026-10-04T11:00:00Z' }
    await nextTick()
    expect(useAnnouncer().announcement.value.seq).toBe(0)
  })

  it('an empty status (the order being replaced) is never announced', async () => {
    const order = ref<Order>(pickup('PREPARING'))
    useOrderStatusTimeline(order)
    order.value = { ...pickup('PREPARING'), status: '' as Order['status'] }
    await nextTick()
    expect(useAnnouncer().announcement.value.seq).toBe(0)
  })
})
