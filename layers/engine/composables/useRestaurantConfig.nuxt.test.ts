// useRestaurantConfig: THE restaurant config of the app (hours, ordering switch, today's slots, ordering policy): one
// shared state fed by the query, by one live `restaurantConfigUpdated` subscription, and by gap-recovery refetches.
// The GraphQL transport, the WebSocket subscription layer, the server request and the quote refresh are the boundaries;
// useGqlQuery, useAsyncData, the shared state and the components' lifecycle (mountSuspended) are real.
// Run: `vp test run layers/engine/composables/useRestaurantConfig.nuxt.test.ts`.
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent, h, nextTick, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { clearNuxtData, clearNuxtState, useState } from '#imports'
import { GqlError } from '#engine/utils/gqlError'
import { STATIC_PAGE_FILL_HEADER, STATIC_PAGE_SKIP_HEADER } from '#engine/utils/staticPageCache'
import { setFlags } from '../../../test/flags'
import type { RestaurantConfig, RestaurantConfigResponse } from './useRestaurantConfig'

interface FakeSubscription {
  query: string
  variables: unknown
  options: { onReconnect?: () => Promise<void> | void }
  data: ReturnType<typeof ref<unknown>>
  error: ReturnType<typeof ref<unknown>>
  stop: ReturnType<typeof vi.fn>
}

const gqlFetch = vi.hoisted(() => vi.fn())
const requestQuoteRefresh = vi.hoisted(() => vi.fn())
const useRequestEvent = vi.hoisted(() => vi.fn())
const skipHeader = vi.hoisted(() => ({
  ref: null as null | { value: string | undefined },
  name: '',
}))
const subscriptions = vi.hoisted(() => [] as unknown[])

mockNuxtImport('useNuxtApp', async (original) => {
  const { withGqlFetch } = await import('../../../test/helpers/gqlFetch')
  return () => withGqlFetch(original(), gqlFetch)
})
mockNuxtImport('useRequestEvent', () => useRequestEvent)
mockNuxtImport('useResponseHeader', () => (name: string) => {
  skipHeader.name = name
  return skipHeader.ref
})
vi.mock('./useOrderQuote', () => ({ requestQuoteRefresh }))
vi.mock('./useGqlSubscription', async () => {
  const { ref: makeRef } = await import('vue')
  return {
    useGqlSubscription: (
      query: string,
      variables: unknown,
      options: FakeSubscription['options'],
    ) => {
      const subscription = {
        query,
        variables,
        options,
        data: makeRef<unknown>(),
        error: makeRef<unknown>(null),
        stop: vi.fn(),
      }
      subscriptions.push(subscription)
      return subscription
    },
  }
})

const { useRestaurantConfig, useRestaurantConfigState } = await import('./useRestaurantConfig')

const sub = (index = subscriptions.length - 1) => subscriptions[index] as FakeSubscription

const makeConfig = (overrides: Partial<RestaurantConfig> = {}): RestaurantConfig => ({
  orderingEnabled: true,
  openingHours: { monday: { open: '11:30', close: '22:00' } },
  orderingHours: null,
  preparationMinutes: 30,
  isCurrentlyOpen: true,
  isOrderingCurrentlyOpen: true,
  availableSlotsToday: [],
  nextOpeningAt: null,
  ...overrides,
})
const answer = (overrides: Partial<RestaurantConfig> = {}): RestaurantConfigResponse => ({
  restaurantConfig: makeConfig(overrides),
})

const policyRefused = () =>
  new GqlError([
    {
      message: 'Cannot query field "policy" on type "RestaurantConfig".',
      extensions: { code: 'GRAPHQL_VALIDATION_FAILED' },
    },
  ])

const hasPolicy = (document: string) => document.includes('policy {')

type Result = Awaited<ReturnType<typeof useRestaurantConfig>>

/** Runs the composable in a real component setup (its onMounted needs one) and waits for the suspense to resolve. */
async function mountConfig(options?: Parameters<typeof useRestaurantConfig>[0]) {
  let result!: Result
  const component = defineComponent({
    async setup() {
      result = await useRestaurantConfig(options)
      return () => h('div')
    },
  })
  const wrapper = await mountSuspended(component)
  return { result, wrapper }
}

beforeEach(() => {
  vi.resetAllMocks()
  subscriptions.length = 0
  clearNuxtData()
  clearNuxtState()
  skipHeader.ref = null
  gqlFetch.mockImplementation(() => Promise.resolve(answer()))
  useRequestEvent.mockReturnValue(undefined)
})

describe('loading the config', () => {
  it('asks the restaurantConfig query (with the ordering policy) and shares the answer as the app-wide state', async () => {
    gqlFetch.mockResolvedValue(answer({ preparationMinutes: 45 }))

    const { result } = await mountConfig()

    expect(gqlFetch).toHaveBeenCalledOnce()
    const [document, { variables }] = gqlFetch.mock.calls[0]!
    expect(document).toContain('query RestaurantConfig')
    expect(hasPolicy(document)).toBe(true)
    expect(variables).toEqual({})
    expect(result.config.value).toEqual(answer({ preparationMinutes: 45 }))
    expect(useRestaurantConfigState().value).toEqual(answer({ preparationMinutes: 45 }))
    expect(result.error.value).toBeUndefined()
    expect(result.pending.value).toBe(false)
  })

  it('is one request for callers that ask at the same time (the layout and the page)', async () => {
    gqlFetch.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => {
            resolve(answer())
          }, 10),
        ),
    )
    const [first, second] = await Promise.all([mountConfig(), mountConfig()])
    expect(gqlFetch).toHaveBeenCalledOnce()
    expect(first.result.config.value).toEqual(answer())
    expect(second.result.config.value).toEqual(answer())
  })

  it('replaces the shared state with the answer of a refresh', async () => {
    gqlFetch.mockResolvedValueOnce(answer({ isCurrentlyOpen: true }))
    const { result } = await mountConfig()
    gqlFetch.mockResolvedValueOnce(answer({ isCurrentlyOpen: false }))

    await result.refresh()
    await nextTick()

    expect(result.config.value?.restaurantConfig.isCurrentlyOpen).toBe(false)
  })

  it('drops what the live feed had merged into the previous answer when a new answer arrives', async () => {
    const { result } = await mountConfig()
    sub().data.value = { restaurantConfigUpdated: { preparationMinutes: 99 } }
    await nextTick()
    expect(result.config.value?.restaurantConfig.preparationMinutes).toBe(99)

    gqlFetch.mockResolvedValueOnce(answer({ preparationMinutes: 20 }))
    await result.refresh()
    await nextTick()

    expect(result.config.value?.restaurantConfig.preparationMinutes).toBe(20)
  })

  it('surfaces a failed query as `error`, with no config', async () => {
    const failure = new GqlError([{ message: 'down' }], { status: 503 })
    gqlFetch.mockRejectedValue(failure)
    const { result } = await mountConfig()
    expect(result.error.value).toMatchObject({ message: 'down' })
    expect(result.config.value).toBeNull()
  })

  it('does not block on the query when lazy: the config arrives once it is mounted', async () => {
    const { result } = await mountConfig({ lazy: true })
    await vi.waitFor(() => {
      expect(result.config.value).toEqual(answer())
    })
  })

  it('still loads in the browser with server: false', async () => {
    const { result } = await mountConfig({ server: false })
    expect(result.config.value).toEqual(answer())
  })
})

describe('an old backend that does not know the ordering policy', () => {
  it('asks the legacy document, once, when the main one is refused, and remembers it', async () => {
    gqlFetch.mockImplementation((document: string) =>
      hasPolicy(document) ? Promise.reject(policyRefused()) : Promise.resolve(answer()),
    )

    const { result } = await mountConfig()

    expect(gqlFetch.mock.calls.map(([document]) => hasPolicy(document))).toEqual([true, false])
    expect(result.config.value).toEqual(answer())
    expect(useState('restaurant-config-policy-unsupported').value).toBe(true)
  })

  it('asks the legacy document straight away once it is known, and subscribes to the legacy feed', async () => {
    useState('restaurant-config-policy-unsupported').value = true

    await mountConfig()

    expect(gqlFetch).toHaveBeenCalledOnce()
    expect(hasPolicy(gqlFetch.mock.calls[0]![0])).toBe(false)
    expect(sub().query).toContain('subscription RestaurantConfigUpdated')
    expect(hasPolicy(sub().query)).toBe(false)
  })
})

describe('the live feed', () => {
  it('is one subscription for the whole app, with the policy, however many components ask for the config', async () => {
    await mountConfig()
    await mountConfig()
    expect(subscriptions).toHaveLength(1)
    expect(sub().query).toContain('subscription RestaurantConfigUpdated')
    expect(hasPolicy(sub().query)).toBe(true)
    expect(sub().variables).toEqual({})
  })

  it('merges each push into the shared config and asks the open quote to refresh', async () => {
    const { result } = await mountConfig()

    sub().data.value = {
      restaurantConfigUpdated: {
        isOrderingCurrentlyOpen: false,
        nextOpeningAt: '2026-10-05T11:30:00Z',
      },
    }
    await nextTick()

    expect(result.config.value).toEqual({
      restaurantConfig: {
        ...makeConfig(),
        isOrderingCurrentlyOpen: false,
        nextOpeningAt: '2026-10-05T11:30:00Z',
      },
    })
    expect(requestQuoteRefresh).toHaveBeenCalledOnce()
  })

  it('ignores a push that arrives before the first answer (that answer is up to date anyway)', async () => {
    await mountConfig()
    useRestaurantConfigState().value = null
    sub().data.value = { restaurantConfigUpdated: { isCurrentlyOpen: false } }
    await nextTick()
    expect(useRestaurantConfigState().value).toBeNull()
    expect(requestQuoteRefresh).not.toHaveBeenCalled()
  })

  it('ignores a message without a config', async () => {
    const { result } = await mountConfig()
    sub().data.value = {}
    await nextTick()
    sub().data.value = null
    await nextTick()
    expect(result.config.value).toEqual(answer())
    expect(requestQuoteRefresh).not.toHaveBeenCalled()
  })

  it('recovers the gap after a reconnect by asking for the config again', async () => {
    const { result } = await mountConfig()
    gqlFetch.mockClear()
    gqlFetch.mockResolvedValue(answer({ isCurrentlyOpen: false, preparationMinutes: 50 }))

    await sub().options.onReconnect!()

    expect(gqlFetch).toHaveBeenCalledOnce()
    expect(result.config.value).toEqual(answer({ isCurrentlyOpen: false, preparationMinutes: 50 }))
    expect(requestQuoteRefresh).toHaveBeenCalledOnce()
  })

  it('answers overlapping reconnect announcements with one request, and a later one with a new request', async () => {
    await mountConfig()
    gqlFetch.mockClear()
    let finish: (value: unknown) => void = () => undefined
    gqlFetch.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve
      }),
    )
    const first = sub().options.onReconnect!()
    const second = sub().options.onReconnect!()
    finish(answer({ preparationMinutes: 60 }))
    await Promise.all([first, second])
    expect(gqlFetch).toHaveBeenCalledOnce()

    gqlFetch.mockResolvedValueOnce(answer({ preparationMinutes: 61 }))
    await sub().options.onReconnect!()
    expect(gqlFetch).toHaveBeenCalledTimes(2)
  })

  it('keeps the config as it is when the refetch answers without one', async () => {
    const { result } = await mountConfig()
    gqlFetch.mockResolvedValue({})
    await sub().options.onReconnect!()
    expect(result.config.value).toEqual(answer())
    expect(requestQuoteRefresh).not.toHaveBeenCalled()
  })

  it('fails the refetch with the error (the subscription layer reports it) and keeps the config', async () => {
    const { result } = await mountConfig()
    const failure = new GqlError([{ message: 'down' }], { status: 503 })
    gqlFetch.mockRejectedValue(failure)
    await expect(sub().options.onReconnect!()).rejects.toBe(failure)
    expect(result.config.value).toEqual(answer())
  })

  it('refetches with the legacy document when the backend turns out not to know the policy', async () => {
    const { result } = await mountConfig()
    gqlFetch.mockClear()
    gqlFetch.mockImplementation((document: string) =>
      hasPolicy(document)
        ? Promise.reject(policyRefused())
        : Promise.resolve(answer({ preparationMinutes: 70 })),
    )

    await sub().options.onReconnect!()

    expect(gqlFetch.mock.calls.map(([document]) => hasPolicy(document))).toEqual([true, false])
    expect(result.config.value?.restaurantConfig.preparationMinutes).toBe(70)
    expect(useState('restaurant-config-policy-unsupported').value).toBe(true)
  })

  it('does not retry a policy refusal when the legacy document was already in use', async () => {
    useState('restaurant-config-policy-unsupported').value = true
    await mountConfig()
    gqlFetch.mockClear()
    const failure = policyRefused()
    gqlFetch.mockRejectedValue(failure)

    await expect(sub().options.onReconnect!()).rejects.toBe(failure)
    expect(gqlFetch).toHaveBeenCalledOnce()
    expect(hasPolicy(gqlFetch.mock.calls[0]![0])).toBe(false)
  })

  describe('a backend that refuses the subscription document naming `policy`', () => {
    it('stops it and subscribes to the legacy document instead, for good', async () => {
      const { result } = await mountConfig()
      const policyFeed = sub()

      policyFeed.error.value = policyRefused()
      await nextTick()

      expect(policyFeed.stop).toHaveBeenCalledOnce()
      expect(useState('restaurant-config-policy-unsupported').value).toBe(true)
      expect(subscriptions).toHaveLength(2)
      expect(hasPolicy(sub().query)).toBe(false)
      expect(sub().options.onReconnect).toBeTypeOf('function')

      // The legacy feed keeps the state up to date.
      sub().data.value = { restaurantConfigUpdated: { preparationMinutes: 80 } }
      await nextTick()
      expect(result.config.value?.restaurantConfig.preparationMinutes).toBe(80)
    })

    it('switches once: a later error of the old feed does not subscribe again, nor does the legacy feed watch for it', async () => {
      await mountConfig()
      const policyFeed = sub(0)
      policyFeed.error.value = policyRefused()
      await nextTick()
      policyFeed.error.value = null
      await nextTick()
      policyFeed.error.value = policyRefused()
      await nextTick()
      sub(1).error.value = policyRefused()
      await nextTick()
      expect(subscriptions).toHaveLength(2)
      expect(policyFeed.stop).toHaveBeenCalledOnce()
    })

    it.each([
      ['no error', null],
      ['a lost connection', new Error('Lost internet connection')],
      [
        'an error about something else',
        new GqlError([{ message: 'forbidden', extensions: { code: 'FORBIDDEN' } }]),
      ],
    ])('is not triggered by %s', async (_label, error) => {
      await mountConfig()
      sub().error.value = error
      await nextTick()
      expect(subscriptions).toHaveLength(1)
      expect(sub().stop).not.toHaveBeenCalled()
      expect(useState('restaurant-config-policy-unsupported').value).toBe(false)
    })
  })
})

describe('a page rendered for the static-page cache', () => {
  const rendersForCache = () =>
    useRequestEvent.mockReturnValue({
      node: { req: { headers: { [STATIC_PAGE_FILL_HEADER]: '1' } } },
    })

  describe('in the browser, after hydration', () => {
    it('asks for the current config once mounted (the cached HTML carries the config of when it was rendered), once', async () => {
      useState('restaurant-config-rendered-for-cache').value = true
      gqlFetch
        .mockResolvedValueOnce(answer({ preparationMinutes: 33 }))
        .mockResolvedValueOnce(answer({ preparationMinutes: 44 }))

      const { result } = await mountConfig()

      await vi.waitFor(() => {
        expect(result.config.value?.restaurantConfig.preparationMinutes).toBe(44)
      })
      expect(gqlFetch).toHaveBeenCalledTimes(2)
      expect(useState('restaurant-config-rendered-for-cache').value).toBe(false)
      expect(requestQuoteRefresh).toHaveBeenCalledOnce()
    })

    it('does not ask again for a page that was rendered for one visitor', async () => {
      await mountConfig()
      await nextTick()
      expect(gqlFetch).toHaveBeenCalledOnce()
    })

    it('ignores a failure of that refresh (the config of the render stays)', async () => {
      useState('restaurant-config-rendered-for-cache').value = true
      const { result } = await mountConfig()
      gqlFetch.mockRejectedValue(new Error('offline'))
      await nextTick()
      await vi.waitFor(() => {
        expect(useState('restaurant-config-rendered-for-cache').value).toBe(false)
      })
      expect(result.config.value).toEqual(answer())
    })
  })

  describe('on the server', () => {
    beforeEach(() => {
      setFlags({ server: true })
      skipHeader.ref = ref<string | undefined>(undefined)
    })

    /** The flag as the render sees it (it is cleared again once the component is mounted). */
    const flagDuringRender = async () => {
      const seen: unknown[] = []
      gqlFetch.mockImplementation(() => {
        seen.push(useState('restaurant-config-rendered-for-cache').value)
        return Promise.resolve(answer())
      })
      await mountConfig()
      return seen[0]
    }

    it('marks the page as rendered for the cache when the cache asked for it', async () => {
      rendersForCache()
      expect(await flagDuringRender()).toBe(true)
    })

    it('does not for an ordinary visitor', async () => {
      useRequestEvent.mockReturnValue({ node: { req: { headers: {} } } })
      expect(await flagDuringRender()).toBe(false)
    })

    it('opens no subscription (nothing to push to a server render)', async () => {
      await mountConfig()
      expect(subscriptions).toHaveLength(0)
    })

    it('flags the render so the cache does not keep it when the config could not be fetched', async () => {
      rendersForCache()
      gqlFetch.mockRejectedValue(new GqlError([{ message: 'down' }], { status: 503 }))
      await mountConfig()
      expect(skipHeader.name).toBe(STATIC_PAGE_SKIP_HEADER)
      expect(skipHeader.ref!.value).toBe('1')
    })

    it('does not flag a complete render for the cache', async () => {
      rendersForCache()
      await mountConfig()
      expect(skipHeader.ref!.value).toBeUndefined()
    })

    it('does not flag a failed render made for an ordinary visitor (only the cache must not replay it)', async () => {
      useRequestEvent.mockReturnValue({ node: { req: { headers: {} } } })
      gqlFetch.mockRejectedValue(new GqlError([{ message: 'down' }], { status: 503 }))
      await mountConfig()
      expect(skipHeader.ref!.value).toBeUndefined()
    })
  })
})
