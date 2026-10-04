// useReorder: "re-order" of a past order. An empty cart takes the order straight away; a cart with lines is never replaced
// silently (the shared prompt asks Replace / Add / Cancel); lines that cannot be restored are skipped and named.
// Real cart, notifications, planReorder and shared state; navigation and i18n are the boundaries.
// Run: `vp test run layers/engine/composables/useReorder.nuxt.test.ts`.
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { clearNuxtState, useLocalePath, useState } from '#imports'
import { createPinia, setActivePinia } from 'pinia'
import { makeChoice, makeProduct } from '../../../test/fixtures/catalog'
import { makeOrder, makeOrderItem } from '../../../test/fixtures/order'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useCartStore } from '#engine/stores/cart'
import { useNotificationsStore } from '#engine/stores/notifications'

const navigateTo = vi.hoisted(() => vi.fn())
mockNuxtImport('navigateTo', () => navigateTo)
vi.mock('vue-i18n', async (importOriginal) => {
  const { fakeI18n } = await import('../../../test/helpers/i18n')
  return { ...(await importOriginal<typeof import('vue-i18n')>()), useI18n: fakeI18n }
})

const { useReorder } = await import('#engine/composables/useReorder')

const ramen = makeProduct({ id: 'ramen', name: 'Ramen', price: '14.00' })
const gone = makeProduct({ id: 'gone', name: 'Gyoza', isAvailable: false })
const brothA = makeChoice({ id: 'broth-a', choiceGroupId: 'broth', productId: 'bowl' })
const bowl = makeProduct({
  id: 'bowl',
  name: 'Bowl',
  choices: [brothA],
  choiceGroups: [
    {
      id: 'broth',
      productId: 'bowl',
      minSelections: 1,
      maxSelections: 1,
      sortOrder: 0,
      name: 'Broth',
      choices: [brothA],
    },
  ],
})

const ramenOrder = makeOrder({ items: [makeOrderItem({ product: ramen, quantity: 2 })] })
const mixedOrder = makeOrder({
  items: [
    makeOrderItem({ product: ramen, quantity: 1 }),
    makeOrderItem({ product: gone, quantity: 3 }),
  ],
})

let cart: ReturnType<typeof useCartStore>
let notifications: ReturnType<typeof useNotificationsStore>

beforeEach(() => {
  setActivePinia(createPinia())
  cart = useCartStore()
  notifications = useNotificationsStore()
  navigateTo.mockReset()
  clearNuxtState(['reorder-prompt', 'checkout-cash-touched'])
})

describe('reorder into an empty cart', () => {
  it('fills the cart straight away, says how many units, and goes to the checkout', () => {
    const result = useReorder().reorder(ramenOrder)
    expect(result).toEqual({ added: 2, skipped: 0 })
    expect(cart.products.map((l) => [l.product.id, l.quantity])).toEqual([['ramen', 2]])
    expect(notifications.current).toMatchObject({
      message: 'reorder.success{"count":2}',
      variant: 'success',
    })
    expect(navigateTo).toHaveBeenCalledWith(useLocalePath()('/checkout'))
  })

  it('a customised line comes back with its selections', () => {
    const order = makeOrder({
      items: [
        makeOrderItem({
          product: bowl,
          quantity: 2,
          selections: [{ groupId: 'broth', choiceId: 'broth-a', quantity: 2 }],
        }),
      ],
    })
    useReorder().reorder(order)
    expect(cart.products[0]).toMatchObject({
      quantity: 2,
      selectedChoices: [{ groupId: 'broth', choiceId: 'broth-a', quantity: 2 }],
    })
  })

  it('a line it cannot restore is skipped and named with its reason; the rest is added (partial toast, 9 s, info)', () => {
    const result = useReorder().reorder(mixedOrder)
    expect(result).toEqual({ added: 1, skipped: 3 })
    expect(cart.products.map((l) => l.product.id)).toEqual(['ramen'])
    expect(notifications.current).toMatchObject({
      message: 'reorder.partial{"added":1,"names":"Gyoza (reorder.reason.unavailable)"}',
      variant: 'info',
      duration: 9000,
    })
    expect(navigateTo).toHaveBeenCalledOnce()
  })
})

describe('nothing can be restored', () => {
  it('names the skipped lines in an error toast and leaves the cart and the page alone', () => {
    const result = useReorder().reorder(
      makeOrder({ items: [makeOrderItem({ product: gone, quantity: 2 })] }),
    )
    expect(result).toEqual({ added: 0, skipped: 2 })
    expect(cart.products).toEqual([])
    expect(notifications.current).toMatchObject({
      message: 'reorder.emptyWithNames{"names":"Gyoza (reorder.reason.unavailable)"}',
      variant: 'error',
      duration: 9000,
    })
    expect(navigateTo).not.toHaveBeenCalled()
  })

  it('an order without any line is "empty"', () => {
    const result = useReorder().reorder(makeOrder({ items: [] }))
    expect(result).toEqual({ added: 0, skipped: 0 })
    expect(notifications.current?.message).toBe('reorder.empty')
    expect(notifications.current?.variant).toBe('error')
  })

  it('does not open the replace prompt even when the cart has lines', () => {
    cart.addProduct(ramen, 1)
    const { reorder, prompt } = useReorder()
    reorder(makeOrder({ items: [] }))
    expect(prompt.value).toBeNull()
  })
})

describe('reorder into a cart that already has lines', () => {
  const withLines = () => {
    cart.addProduct(makeProduct({ id: 'tea', name: 'Tea', price: '3.00' }), 1)
    cart.couponCode = 'WELCOME'
    cart.couponDiscountCents = 200
    cart.pendingOrderId = 'pending-1'
    cart.cashPaymentAmount = '50'
  }

  it('never replaces it silently: it asks, and reports what the order would add', () => {
    withLines()
    const { reorder, prompt } = useReorder()
    const result = reorder(mixedOrder)
    expect(result).toEqual({ added: 1, skipped: 3 })
    expect(prompt.value?.plan.lines.map((l) => l.product.id)).toEqual(['ramen'])
    expect(cart.products.map((l) => l.product.id)).toEqual(['tea'])
    expect(notifications.current).toBeNull()
    expect(navigateTo).not.toHaveBeenCalled()
  })

  it('"Replace" empties the cart and what hangs off it (coupon, pending checkout, cash amount) but keeps the delivery settings', () => {
    withLines()
    cart.collectionOption = 'PICKUP'
    const { reorder, resolve, prompt } = useReorder()
    useState('checkout-cash-touched').value = true // The cash amount field was typed for the old total
    reorder(ramenOrder)
    resolve('replace')
    expect(prompt.value).toBeNull()
    expect(cart.products.map((l) => [l.product.id, l.quantity])).toEqual([['ramen', 2]])
    expect(cart.couponCode).toBeNull()
    expect(cart.couponDiscountCents).toBe(0)
    expect(cart.pendingOrderId).toBeNull()
    expect(cart.cashPaymentAmount).toBeNull()
    expect(useState('checkout-cash-touched').value).toBe(false)
    expect(cart.collectionOption).toBe('PICKUP')
    expect(notifications.current?.message).toBe('reorder.success{"count":2}')
    expect(navigateTo).toHaveBeenCalledWith(useLocalePath()('/checkout'))
  })

  it('"Add to cart" merges into the lines and keeps the coupon and the rest', () => {
    withLines()
    const { reorder, resolve } = useReorder()
    reorder(ramenOrder)
    resolve('merge')
    expect(cart.products.map((l) => l.product.id).sort()).toEqual(['ramen', 'tea'])
    expect(cart.couponCode).toBe('WELCOME')
    expect(cart.couponDiscountCents).toBe(200)
    expect(cart.pendingOrderId).toBe('pending-1')
    expect(cart.cashPaymentAmount).toBe('50')
    expect(navigateTo).toHaveBeenCalledOnce()
  })

  it('"Cancel" closes the prompt and changes nothing', () => {
    withLines()
    const { reorder, resolve, prompt } = useReorder()
    reorder(ramenOrder)
    resolve(null)
    expect(prompt.value).toBeNull()
    expect(cart.products.map((l) => l.product.id)).toEqual(['tea'])
    expect(notifications.current).toBeNull()
    expect(navigateTo).not.toHaveBeenCalled()
  })

  it('resolving with nothing pending does nothing (a double click on the dialog)', () => {
    const { resolve } = useReorder()
    resolve('replace')
    expect(cart.products).toEqual([])
    expect(navigateTo).not.toHaveBeenCalled()
  })

  it('merging a partial plan tells which lines were skipped', () => {
    withLines()
    const { reorder, resolve } = useReorder()
    reorder(mixedOrder)
    resolve('merge')
    expect(notifications.current?.message).toContain('reorder.partial')
    expect(notifications.current?.message).toContain('Gyoza')
  })

  it('the prompt is shared state: every caller (widget, order list) and the one dialog see the same plan', () => {
    withLines()
    useReorder().reorder(ramenOrder)
    const other = useReorder()
    expect(other.prompt.value?.plan.lines).toHaveLength(1)
    other.resolve('merge')
    expect(useReorder().prompt.value).toBeNull()
  })
})
