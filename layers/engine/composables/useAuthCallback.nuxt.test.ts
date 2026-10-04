// useAuthCallback: what runs on /auth/callback once Zitadel has sent the customer back: restore the profile, then pick
// the destination (the page they came from, the menu, or checkout when the cart is full and ordering is possible).
// The OIDC client, the GraphQL transport, navigation and the error reporter are the boundaries; the stores, the
// ordering policy, the localised paths and the redirect rules are real.
// Run: `vp test run layers/engine/composables/useAuthCallback.nuxt.test.ts`.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { createPinia, setActivePinia } from 'pinia'
import { makeCartItem } from '../../../test/fixtures/catalog'
import { makeUser } from '../../../test/fixtures/auth'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

const oidc = vi.hoisted(() => ({ getAccessToken: vi.fn<() => Promise<string | null>>() }))
const gqlFetch = vi.hoisted(() => vi.fn())
const navigateTo = vi.hoisted(() => vi.fn())
const reportError = vi.hoisted(() => vi.fn())
const track = vi.hoisted(() => vi.fn())

vi.mock('#engine/composables/useOidc', () => ({ useOidc: () => oidc }))
vi.mock('#engine/utils/reportError', () => ({ reportError }))
mockNuxtImport('navigateTo', () => navigateTo)
// The plugin-provided transport is the one thing replaced on the real nuxtApp.
mockNuxtImport('useNuxtApp', async (original) => {
  const { withGqlFetch } = await import('../../../test/helpers/gqlFetch')
  return () => withGqlFetch(original(), gqlFetch)
})

const { useAuthCallback } = await import('./useAuthCallback')
const { useAuthStore } = await import('#engine/stores/auth')
const { useCartStore } = await import('#engine/stores/cart')

/** Umami's tracker, as the page sees it. */
const analytics = () => window as unknown as { umami?: { track: typeof track } }

const NOW = new Date('2026-10-04T12:00:00+02:00')
const inMinutes = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000).toISOString()

const OPEN = {
  restaurantConfig: {
    orderingEnabled: true,
    isOrderingCurrentlyOpen: true,
    preparationMinutes: 30,
    availableSlotsToday: [],
  },
}
const CLOSED_WITH_SLOT = {
  restaurantConfig: {
    ...OPEN.restaurantConfig,
    isOrderingCurrentlyOpen: false,
    availableSlotsToday: [{ label: '19:00', value: inMinutes(120) }],
  },
}
const CLOSED_FOR_GOOD = {
  restaurantConfig: {
    ...OPEN.restaurantConfig,
    isOrderingCurrentlyOpen: false,
    availableSlotsToday: [{ label: '12:10', value: inMinutes(10) }],
  },
}
const DISABLED = { restaurantConfig: { ...OPEN.restaurantConfig, orderingEnabled: false } }

const me = makeUser({ id: 'user-9' })

/** Answers the `me` query with a profile and the restaurant status query with `status`. */
const answer = (status: unknown, profile: unknown = { me }) => {
  gqlFetch.mockImplementation((query: string) =>
    Promise.resolve(query.includes('AuthCallbackRestaurantStatus') ? status : profile),
  )
}

const setup = (cartFull = false) => {
  setActivePinia(createPinia())
  if (cartFull) useCartStore().products = [makeCartItem()]
  return useAuthCallback()
}

beforeEach(() => {
  vi.resetAllMocks()
  useNuxtApp().$i18n.locale.value = 'fr'
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
  oidc.getAccessToken.mockResolvedValue('token')
  answer(OPEN)
  sessionStorage.clear()
  analytics().umami = { track }
})

afterEach(() => {
  vi.useRealTimers()
  analytics().umami = undefined
})

describe('restoring the session', () => {
  it('makes sure the token is usable (renewing it if needed) before it asks for the profile', async () => {
    const order: string[] = []
    oidc.getAccessToken.mockImplementation(() => {
      order.push('token')
      return Promise.resolve('token')
    })
    gqlFetch.mockImplementation(() => {
      order.push('me')
      return Promise.resolve({ me })
    })
    await setup().processCallback()
    expect(order.slice(0, 2)).toEqual(['token', 'me'])
  })

  it('stores the profile of `me` and reports the sign-in to analytics', async () => {
    await setup().processCallback()
    expect(useAuthStore().user).toEqual(me)
    expect(track).toHaveBeenCalledExactlyOnceWith('user_logged_in', { method: 'oidc' })
    expect(gqlFetch.mock.calls[0]![0]).toContain('me {')
  })

  it('keeps going without a profile when `me` answers nothing', async () => {
    answer(OPEN, null)
    await setup().processCallback()
    expect(useAuthStore().user).toBeNull()
    expect(track).toHaveBeenCalledOnce()
    expect(navigateTo).toHaveBeenCalledOnce()
  })

  it('fails, without navigating, when the profile cannot be loaded (the callback page shows its error)', async () => {
    const failure = new Error('401')
    gqlFetch.mockRejectedValue(failure)
    await expect(setup().processCallback()).rejects.toBe(failure)
    expect(useAuthStore().user).toBeNull()
    expect(navigateTo).not.toHaveBeenCalled()
    expect(track).not.toHaveBeenCalled()
  })

  it('fails when the token cannot be obtained', async () => {
    const failure = new Error('oidc broken')
    oidc.getAccessToken.mockRejectedValue(failure)
    await expect(setup().processCallback()).rejects.toBe(failure)
    expect(gqlFetch).not.toHaveBeenCalled()
  })
})

describe('where the customer goes next', () => {
  it('back to the page they came from, which is consumed so it is used once', async () => {
    sessionStorage.setItem('oidc_return_to', '/fr/me/orders?page=2')
    await setup(true).processCallback()
    expect(navigateTo).toHaveBeenCalledExactlyOnceWith('/fr/me/orders?page=2')
    expect(sessionStorage.getItem('oidc_return_to')).toBeNull()
    // A destination was given: the restaurant status is not even asked.
    expect(gqlFetch).toHaveBeenCalledOnce()
  })

  it.each([
    ['an absolute URL', 'https://evil.example/fr/me'],
    ['a protocol-relative URL', '//evil.example'],
    ['the login flow itself', '/fr/auth/login'],
  ])(
    'ignores %s as a destination (no open redirect, no loop) and forgets it',
    async (_label, raw) => {
      sessionStorage.setItem('oidc_return_to', raw)
      await setup().processCallback()
      expect(navigateTo).toHaveBeenCalledExactlyOnceWith('/fr/menu')
      expect(sessionStorage.getItem('oidc_return_to')).toBeNull()
    },
  )

  it('goes to the menu with an empty cart, without asking whether the restaurant is open', async () => {
    await setup().processCallback()
    expect(navigateTo).toHaveBeenCalledExactlyOnceWith('/fr/menu')
    expect(gqlFetch).toHaveBeenCalledOnce()
  })

  it('goes to checkout with a full cart while the restaurant takes orders', async () => {
    answer(OPEN)
    await setup(true).processCallback()
    expect(navigateTo).toHaveBeenCalledExactlyOnceWith('/fr/checkout')
  })

  it('goes to checkout with a full cart when the restaurant is closed but a slot can still be booked today (pre-order)', async () => {
    answer(CLOSED_WITH_SLOT)
    await setup(true).processCallback()
    expect(navigateTo).toHaveBeenCalledExactlyOnceWith('/fr/checkout')
  })

  it.each([
    ['closed for good today (the only slot is inside the preparation time)', CLOSED_FOR_GOOD],
    ['ordering switched off', DISABLED],
    ['no config in the answer', null],
  ])(
    'goes to the menu with a full cart when %s (the cart would be a dead end)',
    async (_label, status) => {
      answer(status)
      await setup(true).processCallback()
      expect(navigateTo).toHaveBeenCalledExactlyOnceWith('/fr/menu')
    },
  )

  it('goes to checkout when the status cannot be loaded, and reports it (checkout checks again and offers a retry)', async () => {
    const failure = new Error('timeout')
    gqlFetch.mockImplementation((query: string) =>
      query.includes('AuthCallbackRestaurantStatus')
        ? Promise.reject(failure)
        : Promise.resolve({ me }),
    )
    await setup(true).processCallback()
    expect(reportError).toHaveBeenCalledExactlyOnceWith(failure, 'auth.checkoutAvailability')
    expect(navigateTo).toHaveBeenCalledExactlyOnceWith('/fr/checkout')
    expect(useAuthStore().user).toEqual(me)
  })

  it('works where sessionStorage does not exist (no destination to restore)', async () => {
    vi.stubGlobal('sessionStorage', undefined)
    try {
      await setup().processCallback()
    } finally {
      vi.unstubAllGlobals()
    }
    expect(navigateTo).toHaveBeenCalledExactlyOnceWith('/fr/menu')
  })
})
