// useLastOrder: the signed-in customer's last order that the "your last order" bar offers again. The GraphQL transport
// and the error reporter are the boundaries; the auth store, the order choice (utils/lastOrder.ts) and localStorage are
// real.
// Run: `vp test run layers/engine/composables/useLastOrder.nuxt.test.ts`.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises } from '@vue/test-utils'
import { makeProduct } from '../../../test/fixtures/catalog'
import { makeUser } from '../../../test/fixtures/auth'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useState } from '#imports'

const gqlFetch = vi.hoisted(() => vi.fn())
const reportError = vi.hoisted(() => vi.fn())

vi.mock('#engine/utils/reportError', () => ({ reportError }))
mockNuxtImport('useNuxtApp', async (original) => {
  const { withGqlFetch } = await import('../../../test/helpers/gqlFetch')
  return () => withGqlFetch(original(), gqlFetch)
})

const { useLastOrder } = await import('./useLastOrder')
const { useAuthStore } = await import('#engine/stores/auth')

const order = (id: string, status: string, createdAt: string) => ({
  id,
  status,
  createdAt,
  totalPrice: '24.50',
  items: [{ quantity: 2, product: makeProduct({ id: `${id}-p` }), choice: null, selections: [] }],
})

const DELIVERED = order('delivered', 'DELIVERED', '2026-10-01T18:00:00Z')

beforeEach(() => {
  setActivePinia(createPinia())
  useState('last-order').value = null
  useState('last-order-dismissed').value = null
  localStorage.clear()
  gqlFetch.mockReset()
  reportError.mockReset()
})

afterEach(() => {
  localStorage.clear()
})

describe('useLastOrder', () => {
  it('offers nothing and asks nothing while nobody is signed in', async () => {
    const { order: last } = useLastOrder()
    await flushPromises()
    expect(gqlFetch).not.toHaveBeenCalled()
    expect(last.value).toBeNull()
  })

  it('loads the signed-in customer orders once and offers the last delivered one', async () => {
    useAuthStore().setUser(makeUser({ id: 'u1' }))
    gqlFetch.mockResolvedValue({ myOrders: [DELIVERED] })
    const { order: last } = useLastOrder()
    await flushPromises()
    expect(last.value?.id).toBe('delivered')

    // A second page (the menu after the home page) reuses what was loaded.
    useLastOrder()
    await flushPromises()
    expect(gqlFetch).toHaveBeenCalledOnce()
  })

  it('offers nothing while an order is still in progress', async () => {
    useAuthStore().setUser(makeUser({ id: 'u1' }))
    gqlFetch.mockResolvedValue({
      myOrders: [order('live', 'PREPARING', '2026-10-02T18:00:00Z'), DELIVERED],
    })
    const { order: last } = useLastOrder()
    await flushPromises()
    expect(last.value).toBeNull()
  })

  it('forgets the order when the customer signs out', async () => {
    const auth = useAuthStore()
    auth.setUser(makeUser({ id: 'u1' }))
    gqlFetch.mockResolvedValue({ myOrders: [DELIVERED] })
    const { order: last } = useLastOrder()
    await flushPromises()
    auth.clearUser()
    await flushPromises()
    expect(last.value).toBeNull()
  })

  it('drops an answer that arrives after the customer signed out', async () => {
    const auth = useAuthStore()
    auth.setUser(makeUser({ id: 'u1' }))
    const { promise, resolve: answer } = Promise.withResolvers<unknown>()
    gqlFetch.mockReturnValue(promise)
    const { order: last } = useLastOrder()
    auth.clearUser()
    answer({ myOrders: [DELIVERED] })
    await flushPromises()
    expect(last.value).toBeNull()
  })

  it('hides a closed order on this device, and shows a newer one again', async () => {
    useAuthStore().setUser(makeUser({ id: 'u1' }))
    gqlFetch.mockResolvedValue({ myOrders: [DELIVERED] })
    const first = useLastOrder()
    await flushPromises()
    first.dismiss()
    expect(first.order.value).toBeNull()
    expect(localStorage.getItem('tsb:reorder-bar-dismissed')).toBe('delivered')

    // The next visit starts from storage, and a newer order is offered again.
    useState('last-order').value = null
    useState('last-order-dismissed').value = localStorage.getItem('tsb:reorder-bar-dismissed')
    gqlFetch.mockResolvedValue({
      myOrders: [order('newer', 'PICKED_UP', '2026-10-05T12:00:00Z'), DELIVERED],
    })
    const next = useLastOrder()
    await flushPromises()
    expect(next.order.value?.id).toBe('newer')
  })

  it('does nothing when there is no order to close', () => {
    const { order: last, dismiss } = useLastOrder()
    dismiss()
    expect(last.value).toBeNull()
    expect(localStorage.getItem('tsb:reorder-bar-dismissed')).toBeNull()
  })

  it('shows nothing and reports a failed load', async () => {
    useAuthStore().setUser(makeUser({ id: 'u1' }))
    const failure = new Error('network down')
    gqlFetch.mockRejectedValue(failure)
    const { order: last } = useLastOrder()
    await flushPromises()
    expect(last.value).toBeNull()
    expect(reportError).toHaveBeenCalledWith(failure, 'useLastOrder.load')
  })

  it('keeps working when storage is blocked', async () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    useState('last-order-dismissed').value = undefined
    useAuthStore().setUser(makeUser({ id: 'u1' }))
    gqlFetch.mockResolvedValue({ myOrders: [DELIVERED] })
    const { order: last, dismiss } = useLastOrder()
    await flushPromises()
    expect(last.value?.id).toBe('delivered')
    dismiss()
    expect(last.value).toBeNull()
    getItem.mockRestore()
    setItem.mockRestore()
  })
})
