// useCartRemoval: THE way a cart line leaves the cart on every surface: removed, with an "X removed, Undo" toast; several
// removals in a row merge into one toast whose single Undo restores them all; the last unit of a line is a removal too.
// Real cart and notifications stores; only the analytics beacon (window.umami) and the i18n function are fakes.
// Run: `vp test run layers/engine/composables/useCartRemoval.nuxt.test.ts`.
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { useCartRemoval } from '#engine/composables/useCartRemoval'
import { useCartStore } from '#engine/stores/cart'
import { useNotificationsStore } from '#engine/stores/notifications'
import type { CartItem } from '#engine/types'
import { makeChoice, makeProduct } from '../../../test/fixtures/catalog'

vi.mock('vue-i18n', async (importOriginal) => {
  const { fakeI18n } = await import('../../../test/helpers/i18n')
  return { ...(await importOriginal<typeof import('vue-i18n')>()), useI18n: fakeI18n }
})

const track = vi.fn()
const ramen = makeProduct({ id: 'ramen', name: 'Ramen', price: '14.00' })
const tea = makeProduct({ id: 'tea', name: 'Green tea', price: '3.00' })
const brothA = makeChoice({ id: 'broth-a', choiceGroupId: 'broth', productId: 'bowl' })
const bowl = makeProduct({ id: 'bowl', name: 'Bowl', price: '10.00', choices: [brothA] })

function setup() {
  setActivePinia(createPinia())
  const cart = useCartStore()
  const notifications = useNotificationsStore()
  return { cart, notifications, removal: useCartRemoval() }
}

/** The Undo of the toast on screen. */
const undo = (notifications: ReturnType<typeof useNotificationsStore>) => {
  const action = notifications.current?.action
  expect(action).toBeDefined()
  action!.handler()
}

beforeEach(() => {
  track.mockReset()
  vi.stubGlobal('umami', { track })
})
afterEach(() => {
  useNotificationsStore().dismiss()
})

describe('removeLine', () => {
  it('takes the line out of the cart and says so, with an Undo, in a neutral 5 s toast', () => {
    const { cart, notifications, removal } = setup()
    cart.addProduct(ramen, 2)
    cart.addProduct(tea, 1)
    removal.removeLine(cart.products[0]!)
    expect(cart.products.map((line) => line.product.id)).toEqual(['tea'])
    expect(notifications.current).toMatchObject({
      message: 'cart.removedUndo{"name":"Ramen"}',
      duration: 5000,
      variant: 'neutral',
      group: 'cart-removal',
    })
    expect(notifications.current?.action?.label).toBe('cart.undo')
    expect(track).toHaveBeenCalledWith('product_removed_from_cart', {
      product_id: 'ramen',
      product_name: 'Ramen',
    })
  })

  it('Undo puts the line back with its quantity, and tracks it', () => {
    const { cart, notifications, removal } = setup()
    cart.addProduct(ramen, 3)
    removal.removeLine(cart.products[0]!)
    expect(cart.products).toEqual([])
    undo(notifications)
    expect(cart.products).toHaveLength(1)
    expect(cart.products[0]).toMatchObject({ quantity: 3 })
    expect(cart.products[0]!.product.id).toBe('ramen')
    expect(track).toHaveBeenCalledWith('product_removal_undone', {
      product_id: 'ramen',
      quantity: 3,
    })
  })

  it('Undo restores the choice selections of a customised line, as they were', () => {
    const { cart, notifications, removal } = setup()
    cart.addProduct(bowl, 2, {
      selections: [{ groupId: 'broth', choiceId: 'broth-a', quantity: 2 }],
    })
    const before = cart.products[0]!.selectedChoices
    removal.removeLine(cart.products[0]!)
    undo(notifications)
    expect(cart.products).toHaveLength(1)
    expect(cart.products[0]!.quantity).toBe(2)
    expect(cart.products[0]!.selectedChoices).toEqual(before)
  })

  it('Undo restores the legacy single choice of an old line (no selections)', () => {
    const { cart, notifications, removal } = setup()
    cart.addProduct(bowl, 1, { choice: brothA })
    removal.removeLine(cart.products[0]!)
    undo(notifications)
    expect(cart.products[0]!.selectedChoice).toMatchObject({ id: 'broth-a' })
  })

  it('removing a second line while the first toast is alive merges them into one toast, one Undo restores both', () => {
    const { cart, notifications, removal } = setup()
    cart.addProduct(ramen, 1)
    cart.addProduct(tea, 2)
    removal.removeLine(cart.products[0]!)
    removal.removeLine(cart.products[0]!)
    expect(cart.products).toEqual([])
    expect(notifications.current?.message).toBe('cart.removedManyUndo{"count":2}')
    expect(notifications.queue).toEqual([])
    undo(notifications)
    expect(cart.products.map((line) => `${line.product.id}x${line.quantity}`).toSorted()).toEqual([
      'ramenx1',
      'teax2',
    ])
    expect(track).toHaveBeenCalledWith('product_removal_undone', {
      product_id: 'ramen',
      quantity: 1,
    })
    expect(track).toHaveBeenCalledWith('product_removal_undone', { product_id: 'tea', quantity: 2 })
  })

  it('once the earlier toast is gone, a new removal starts a new batch (its Undo restores only the new line)', () => {
    const { cart, notifications, removal } = setup()
    cart.addProduct(ramen, 1)
    cart.addProduct(tea, 1)
    removal.removeLine(cart.products[0]!)
    notifications.dismiss() // Expired, closed or its Undo was used
    removal.removeLine(cart.products[0]!)
    expect(notifications.current?.message).toBe('cart.removedUndo{"name":"Green tea"}')
    undo(notifications)
    expect(cart.products.map((line) => line.product.id)).toEqual(['tea'])
  })
})

describe('decrementLine', () => {
  it('takes one unit off a line with several, silently (no toast), and tracks the new quantity', () => {
    const { cart, notifications, removal } = setup()
    cart.addProduct(ramen, 3)
    removal.decrementLine(cart.products[0]!)
    expect(cart.products[0]!.quantity).toBe(2)
    expect(notifications.current).toBeNull()
    expect(track).toHaveBeenCalledWith('product_quantity_decremented', {
      product_id: 'ramen',
      new_quantity: 2,
    })
  })

  it('the last unit is a removal: the line goes, with its Undo toast, never a silent drop', () => {
    const { cart, notifications, removal } = setup()
    cart.addProduct(ramen, 1)
    removal.decrementLine(cart.products[0]!)
    expect(cart.products).toEqual([])
    expect(notifications.current?.message).toBe('cart.removedUndo{"name":"Ramen"}')
    undo(notifications)
    expect(cart.products[0]!.quantity).toBe(1)
  })

  it('keeps the selections of a customised line when it steps down', () => {
    const { cart, removal } = setup()
    cart.addProduct(bowl, 2, {
      selections: [{ groupId: 'broth', choiceId: 'broth-a', quantity: 2 }],
    })
    removal.decrementLine(cart.products[0]!)
    expect(cart.products[0]).toMatchObject({
      quantity: 1,
      selectedChoices: [{ groupId: 'broth', choiceId: 'broth-a', quantity: 1 }],
    })
  })
})

describe('decrementProduct (the "−" of a product card)', () => {
  it('steps the plain line of that product', () => {
    const { cart, removal } = setup()
    cart.addProduct(ramen, 2)
    removal.decrementProduct(ramen)
    expect(cart.products[0]!.quantity).toBe(1)
  })

  it('does not touch a customised line of the same product, only its plain line', () => {
    const { cart, removal } = setup()
    cart.addProduct(bowl, 1, {
      selections: [{ groupId: 'broth', choiceId: 'broth-a', quantity: 1 }],
    })
    cart.addProduct(bowl, 3)
    removal.decrementProduct(bowl)
    const quantities = cart.products.map((line) => line.quantity).toSorted((a, b) => a - b)
    expect(quantities).toEqual([1, 2])
    expect(cart.products.find((line) => line.selectedChoices.length > 0)!.quantity).toBe(1)
  })

  it('does nothing for a product that is not in the cart', () => {
    const { cart, notifications, removal } = setup()
    cart.addProduct(ramen, 1)
    removal.decrementProduct(tea)
    expect(cart.products).toHaveLength(1)
    expect(notifications.current).toBeNull()
  })

  it('a card whose plain line has one unit removes it, with an Undo', () => {
    const { cart, notifications, removal } = setup()
    cart.addProduct(ramen, 1)
    removal.decrementProduct(ramen)
    expect(cart.products).toEqual([])
    expect(notifications.current?.action?.label).toBe('cart.undo')
  })
})

describe('keyboard focus', () => {
  it('a surface that passes its container keeps focus on the next line after a removal', async () => {
    setActivePinia(createPinia())
    const cart = useCartStore()
    cart.addProduct(ramen, 1)
    cart.addProduct(tea, 1)
    const root = document.createElement('div')
    root.innerHTML = [
      '<div data-cart-line id="l0"><button id="rm0" data-cart-remove></button></div>',
      '<div data-cart-line id="l1"><button id="rm1" data-cart-remove></button></div>',
    ].join('')
    document.body.append(root)
    const removal = useCartRemoval({ container: () => root, fallback: () => null })
    ;(document.getElementById('rm0') as HTMLElement).focus()
    removal.removeLine(cart.products[0]!)
    // The surface drops the line itself, as its re-render would.
    root.querySelector('#l0')?.remove()
    await nextTick()
    await nextTick()
    expect(cart.products.map((line) => line.product.id)).toEqual(['tea'])
    expect(document.activeElement?.id).toBe('rm1')
    root.remove()
  })

  it('decrementing a line with several units through a surface leaves focus where it is', async () => {
    setActivePinia(createPinia())
    const cart = useCartStore()
    cart.addProduct(ramen, 2)
    const root = document.createElement('div')
    root.innerHTML =
      '<div data-cart-line><button id="dec"></button><button data-cart-remove></button></div>'
    document.body.append(root)
    const removal = useCartRemoval({ container: () => root, fallback: () => null })
    ;(document.getElementById('dec') as HTMLElement).focus()
    removal.decrementLine(cart.products[0]!)
    await nextTick()
    expect(cart.products[0]!.quantity).toBe(1)
    expect(document.activeElement?.id).toBe('dec')
    root.remove()
  })
})

describe('legacy lines', () => {
  it('a line saved without a selectedChoices list is removed and restored as a plain line', () => {
    const { cart, notifications, removal } = setup()
    cart.products.push({ product: ramen, quantity: 2, selectedChoice: null } as unknown as CartItem)
    removal.removeLine(cart.products[0]!)
    expect(cart.products).toEqual([])
    undo(notifications)
    expect(cart.products).toHaveLength(1)
    expect(cart.products[0]).toMatchObject({ quantity: 2, selectedChoices: [] })
  })
})
