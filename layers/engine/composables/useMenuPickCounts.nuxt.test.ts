// useMenuPickCounts: what the row at the top of the menu is made of, the most ordered products for everyone and the
// signed-in customer's own. The GraphQL transport and the error reporter are the boundaries; the auth store, useState
// and useAsyncData are real.
// Run: `vp test run layers/engine/composables/useMenuPickCounts.nuxt.test.ts`.
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { flushPromises } from '@vue/test-utils'
import { makeUser } from '../../../test/fixtures/auth'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { clearNuxtData, useState } from '#imports'
import { defineComponent, h } from 'vue'

const gqlFetch = vi.hoisted(() => vi.fn())
const reportError = vi.hoisted(() => vi.fn())

vi.mock('#engine/utils/reportError', () => ({ reportError }))
mockNuxtImport('useNuxtApp', async (original) => {
  const { withGqlFetch } = await import('../../../test/helpers/gqlFetch')
  return () => withGqlFetch(original(), gqlFetch)
})

const { useMenuPickCounts } = await import('./useMenuPickCounts')
const { useAuthStore } = await import('#engine/stores/auth')

const POPULAR = [
  { productId: 'p1', orderCount: 40 },
  { productId: 'p2', orderCount: 30 },
]
const MINE = [
  { productId: 'm1', orderCount: 3 },
  { productId: 'm2', orderCount: 1 },
]

/** Answers each query with its own data; `mine` gives the customer's answer, to control when (and whether) it lands. */
const answer = (mine: () => unknown = () => Promise.resolve({ myOrderedProducts: MINE })) => {
  gqlFetch.mockImplementation((query: string) =>
    query.includes('popularProducts') ? Promise.resolve({ popularProducts: POPULAR }) : mine(),
  )
}

type Counts = Awaited<ReturnType<typeof useMenuPickCounts>>

/** Runs the composable in a real component setup (useGqlQuery needs one) and waits for the suspense to resolve. */
async function mountCounts(): Promise<Counts> {
  let result!: Counts
  await mountSuspended(
    defineComponent({
      async setup() {
        result = await useMenuPickCounts()
        return () => h('div')
      },
    }),
  )
  return result
}

const myQueries = () =>
  gqlFetch.mock.calls.filter((call) => String(call[0]).includes('myOrderedProducts')).length

beforeEach(() => {
  // The app's own Pinia: the composable runs in a component of the Nuxt app (mountSuspended), which injects it.
  useAuthStore().clearUser()
  clearNuxtData()
  useState('menu-picks-mine').value = null
  gqlFetch.mockReset()
  reportError.mockReset()
})

describe('useMenuPickCounts', () => {
  it('gives everyone the most ordered products, and asks nothing about a visitor', async () => {
    answer()
    const { mine, popular } = await mountCounts()
    await flushPromises()
    expect(popular.value).toEqual(POPULAR)
    expect(mine.value).toBeNull()
    expect(myQueries()).toBe(0)
  })

  it("loads the signed-in customer's products once and keeps them for the next page", async () => {
    useAuthStore().setUser(makeUser({ id: 'u1' }))
    answer()
    const { mine } = await mountCounts()
    await flushPromises()
    expect(mine.value).toEqual(MINE)

    const again = await mountCounts()
    await flushPromises()
    expect(again.mine.value).toEqual(MINE)
    expect(myQueries()).toBe(1)
  })

  it('forgets them when the customer signs out, and loads the next account', async () => {
    const auth = useAuthStore()
    auth.setUser(makeUser({ id: 'u1' }))
    answer()
    const { mine } = await mountCounts()
    await flushPromises()
    auth.clearUser()
    await flushPromises()
    expect(mine.value).toBeNull()

    auth.setUser(makeUser({ id: 'u2' }))
    await flushPromises()
    expect(myQueries()).toBe(2)
    expect(mine.value).toEqual(MINE)
  })

  it('drops an answer that arrives after the customer signed out', async () => {
    const auth = useAuthStore()
    auth.setUser(makeUser({ id: 'u1' }))
    const { promise, resolve } = Promise.withResolvers<unknown>()
    answer(() => promise)
    const { mine } = await mountCounts()
    auth.clearUser()
    resolve({ myOrderedProducts: MINE })
    await flushPromises()
    expect(mine.value).toBeNull()
    expect(useState('menu-picks-mine').value).toBeNull()
  })

  it("never shows another account's products while the new ones load", async () => {
    useState('menu-picks-mine').value = { userId: 'someone-else', counts: MINE }
    useAuthStore().setUser(makeUser({ id: 'u1' }))
    answer(() => new Promise(() => {}))
    const { mine } = await mountCounts()
    expect(mine.value).toBeNull()
  })

  it('shows no own products and reports a failed load', async () => {
    useAuthStore().setUser(makeUser({ id: 'u1' }))
    const failure = new Error('network down')
    answer(() => Promise.reject(failure))
    const { mine, popular } = await mountCounts()
    await flushPromises()
    expect(mine.value).toBeNull()
    expect(popular.value).toEqual(POPULAR)
    expect(reportError).toHaveBeenCalledWith(failure, 'useMenuPickCounts.load')
  })

  it('shows no popular products when they could not be loaded', async () => {
    gqlFetch.mockRejectedValue(new Error('network down'))
    const { popular } = await mountCounts()
    expect(popular.value).toEqual([])
  })
})
