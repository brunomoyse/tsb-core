// useOrderingAvailability: "can I order right now?" for every surface: loading vs failed vs closed vs pre-order only vs
// open vs switched off, a clock that retires slots as they fall inside the preparation window, and retry.
// The restaurant config request (useRestaurantConfig) is the boundary; the shared config state, the ordering policy and
// the rules of utils/orderingAvailability are real; time is fake.
// Run: `vp test run layers/engine/composables/useOrderingAvailability.nuxt.test.ts`.
import { type EffectScope, effectScope, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { setFlags } from '../../../test/flags'
import type { ApiOrderingPolicy } from '#engine/utils/orderingPolicy'
import type { RestaurantConfig } from '#engine/composables/useRestaurantConfig'

const request = vi.hoisted(() => ({ useRestaurantConfig: vi.fn() }))
vi.mock('#engine/composables/useRestaurantConfig', async (importOriginal) => ({
  ...(await importOriginal<typeof import('#engine/composables/useRestaurantConfig')>()),
  useRestaurantConfig: request.useRestaurantConfig,
}))

const { useRestaurantConfigState } = await import('#engine/composables/useRestaurantConfig')
const { useOrderingAvailability } = await import('#engine/composables/useOrderingAvailability')

// Sunday 4 October 2026, 18:20 in Liège (CEST).
const NOW = new Date('2026-10-04T18:20:00+02:00')
const slot = (label: string, hour: number, minute = 0) => ({
  label,
  value: `2026-10-04T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+02:00`,
  isLunchOnlyAllowed: false,
})

const config = (overrides: Partial<RestaurantConfig> = {}): RestaurantConfig => ({
  orderingEnabled: true,
  openingHours: {},
  orderingHours: null,
  preparationMinutes: 30,
  isCurrentlyOpen: false,
  isOrderingCurrentlyOpen: false,
  availableSlotsToday: [],
  nextOpeningAt: null,
  ...overrides,
})

const pending = ref(false)
const error = ref<unknown>(null)
const refresh = vi.fn()
let scope: EffectScope

const serve = (value: RestaurantConfig | null) => {
  useRestaurantConfigState().value = value ? { restaurantConfig: value } : null
}
const mount = async (options?: { lazy?: boolean; server?: boolean }) => {
  scope = effectScope()
  return scope.run(() => useOrderingAvailability(options))!
}
const tick = (ms: number) => vi.advanceTimersByTimeAsync(ms)

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'],
  })
  vi.setSystemTime(NOW)
  pending.value = false
  error.value = null
  refresh.mockReset().mockResolvedValue(undefined)
  request.useRestaurantConfig.mockReset().mockImplementation(async () => ({
    config: useRestaurantConfigState(),
    refresh,
    pending,
    error,
  }))
  serve(null)
})
afterEach(() => {
  scope?.stop()
  vi.useRealTimers()
})

describe('before there is a config', () => {
  it('is loading: nothing is known, nothing may be called "closed" (no banner, no disabled button)', async () => {
    const a = await mount()
    expect(a.isLoaded.value).toBe(false)
    expect(a.isLoading.value).toBe(true)
    expect(a.loadFailed.value).toBe(false)
    expect(a.status.value).toBeNull()
    expect(a.isAvailable.value).toBe(false)
    expect(a.isClosed.value).toBe(false)
    expect(a.isPreorderOnly.value).toBe(false)
    expect(a.isOrderingDisabled.value).toBe(false)
    expect(a.firstSlotLabel.value).toBeNull()
    expect(a.preorderTime.value).toBeNull()
  })

  it('a failed request is a load failure, not "closed"; retry is offered', async () => {
    error.value = new Error('network')
    const a = await mount()
    expect(a.loadFailed.value).toBe(true)
    expect(a.isLoading.value).toBe(false)
    expect(a.isClosed.value).toBe(false)
    expect(a.isAvailable.value).toBe(false)
  })

  it('an error while a retry is pending is still loading', async () => {
    error.value = new Error('network')
    pending.value = true
    const a = await mount()
    expect(a.loadFailed.value).toBe(false)
    expect(a.isLoading.value).toBe(true)
  })

  it('a config that arrives later (or a failed one that recovers) takes over', async () => {
    error.value = new Error('network')
    const a = await mount()
    serve(config({ orderingEnabled: true, isOrderingCurrentlyOpen: true }))
    expect(a.isLoaded.value).toBe(true)
    expect(a.loadFailed.value).toBe(false)
    expect(a.isAvailable.value).toBe(true)
  })
})

describe('the statuses', () => {
  it('open: orders as soon as possible; no pre-order wording even if slots exist', async () => {
    serve(config({ isOrderingCurrentlyOpen: true, availableSlotsToday: [slot('19:30', 19, 30)] }))
    const a = await mount()
    expect(a.status.value).toBe('open')
    expect(a.isAvailable.value).toBe(true)
    expect(a.isClosed.value).toBe(false)
    expect(a.isPreorderOnly.value).toBe(false)
    expect(a.preorderTime.value).toBeNull()
    expect(a.firstSlotLabel.value).toBe('19:30')
  })

  it('pre-order only: closed right now but a slot today can be booked, with its time advertised', async () => {
    serve(config({ availableSlotsToday: [slot('19:30', 19, 30), slot('19:45', 19, 45)] }))
    const a = await mount()
    expect(a.status.value).toBe('preorder')
    expect(a.isAvailable.value).toBe(true)
    expect(a.isClosed.value).toBe(false)
    expect(a.isPreorderOnly.value).toBe(true)
    expect(a.preorderTime.value).toBe('19:30')
  })

  it('closed: nothing open and nothing bookable', async () => {
    serve(config())
    const a = await mount()
    expect(a.status.value).toBe('closed')
    expect(a.isAvailable.value).toBe(false)
    expect(a.isClosed.value).toBe(true)
    expect(a.isOrderingDisabled.value).toBe(false)
    expect(a.preorderTime.value).toBeNull()
  })

  it('switched off by the restaurant: disabled, which is closed for the UI', async () => {
    serve(config({ orderingEnabled: false, isOrderingCurrentlyOpen: true }))
    const a = await mount()
    expect(a.status.value).toBe('disabled')
    expect(a.isOrderingDisabled.value).toBe(true)
    expect(a.isAvailable.value).toBe(false)
    expect(a.isClosed.value).toBe(true)
  })

  it('a slot inside the preparation window cannot be booked: the first label is the first bookable one', async () => {
    serve(config({ availableSlotsToday: [slot('18:30', 18, 30), slot('19:00', 19)] }))
    const a = await mount()
    expect(a.firstSlotLabel.value).toBe('19:00') // 18:30 is 10 min away, 30 needed
    expect(a.preorderTime.value).toBe('19:00')
  })

  it('the backend’s minimum preparation time (policy) widens the window beyond the restaurant’s own', async () => {
    const policy = { minimumPreparationMinutes: 60 } as ApiOrderingPolicy
    serve(config({ policy, availableSlotsToday: [slot('19:00', 19), slot('19:30', 19, 30)] }))
    const a = await mount()
    expect(a.firstSlotLabel.value).toBe('19:30') // 19:00 is 40 min away, 60 needed
  })

  it('a missing preparation time falls back to 30 minutes', async () => {
    serve(
      config({
        preparationMinutes: undefined as unknown as number,
        availableSlotsToday: [slot('18:40', 18, 40), slot('19:00', 19)],
      }),
    )
    expect((await mount()).firstSlotLabel.value).toBe('19:00')
  })

  it('follows a live change of the config (the restaurant opens, or switches ordering off)', async () => {
    serve(config())
    const a = await mount()
    expect(a.isClosed.value).toBe(true)
    serve(config({ isOrderingCurrentlyOpen: true }))
    expect(a.isAvailable.value).toBe(true)
    serve(config({ orderingEnabled: false }))
    expect(a.isOrderingDisabled.value).toBe(true)
  })
})

describe('the clock', () => {
  it('a slot that falls inside the preparation window stops counting on a stale config, without a refetch', async () => {
    serve(config({ availableSlotsToday: [slot('19:00', 19)] }))
    const a = await mount()
    expect(a.status.value).toBe('preorder')
    await tick(5 * 60_000) // 18:25: cutoff 18:55, the 19:00 slot still counts
    expect(a.status.value).toBe('preorder')
    await tick(6 * 60_000) // 18:31: cutoff 19:01
    expect(a.status.value).toBe('closed')
    expect(a.isAvailable.value).toBe(false)
    expect(a.isClosed.value).toBe(true)
    expect(a.preorderTime.value).toBeNull()
  })

  it('is checked every 30 seconds', async () => {
    serve(config({ availableSlotsToday: [slot('19:00', 19)] }))
    const a = await mount()
    // 18:30:00 is the exact line (cutoff 19:00): a slot on the line is still accepted.
    await tick(10 * 60_000)
    expect(a.status.value).toBe('preorder')
    await tick(29_999)
    expect(a.status.value).toBe('preorder')
    await tick(1)
    expect(a.status.value).toBe('closed')
  })

  it('stops with the surface', async () => {
    serve(config({ availableSlotsToday: [slot('19:00', 19)] }))
    const a = await mount()
    scope.stop()
    await tick(20 * 60_000)
    expect(a.status.value).toBe('preorder') // Frozen: no timer is left to move the clock
  })

  it('does not run on the server', async () => {
    setFlags({ server: true })
    serve(config({ availableSlotsToday: [slot('19:00', 19)] }))
    const a = await mount()
    await tick(20 * 60_000)
    expect(a.status.value).toBe('preorder')
  })
})

describe('plumbing', () => {
  it('passes its options to the config request', async () => {
    await mount({ lazy: true, server: false })
    expect(request.useRestaurantConfig).toHaveBeenCalledExactlyOnceWith({
      lazy: true,
      server: false,
    })
    scope.stop()
    request.useRestaurantConfig.mockClear()
    await mount()
    expect(request.useRestaurantConfig).toHaveBeenCalledExactlyOnceWith({})
  })

  it('hands back the config, the request state and its refresh', async () => {
    serve(config())
    const a = await mount()
    expect(a.config.value).toEqual({ restaurantConfig: config() })
    expect(a.pending).toBe(pending)
    expect(a.error).toBe(error)
    expect(a.refresh).toBe(refresh)
  })

  it('retry asks the config again and resolves once it is done', async () => {
    const a = await mount()
    let done = false
    refresh.mockImplementation(async () => {
      await Promise.resolve()
      done = true
    })
    await a.retry()
    expect(refresh).toHaveBeenCalledOnce()
    expect(done).toBe(true)
  })
})
