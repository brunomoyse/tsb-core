// useCartAnnouncements: what the cart says to a screen reader, for every surface at once, by listening to the store actions.
// Real cart store and announcer; the i18n function is a fake that returns the key and its params.
// Run: `vp test run layers/engine/composables/useCartAnnouncements.nuxt.test.ts`.
import { MAX_ITEM_QUANTITY, useCartStore } from '#engine/stores/cart'
import { createPinia, setActivePinia } from 'pinia'
import { describe, expect, it, vi } from 'vite-plus/test'
import { formatCents } from '#engine/lib/price'
import { makeProduct } from '../../../test/fixtures/catalog'
import { useAnnouncer } from '#engine/composables/useAnnouncer'
import { useCartAnnouncements } from '#engine/composables/useCartAnnouncements'

vi.mock('vue-i18n', async (importOriginal) => {
  const { fakeI18n } = await import('../../../test/helpers/i18n')
  return { ...(await importOriginal<typeof import('vue-i18n')>()), useI18n: fakeI18n }
})

const ramen = makeProduct({ id: 'ramen', name: 'Ramen', price: '14.00' })
const tea = makeProduct({ id: 'tea', name: 'Green tea', price: '3.00' })

function setup() {
  setActivePinia(createPinia())
  const cart = useCartStore()
  useCartAnnouncements()
  const { announcement } = useAnnouncer()
  announcement.value = { message: '', seq: 0 }
  return { cart, announcement }
}

const added = (name: string, count: number, subtotalCents: number) =>
  `cart.announce.added{"name":"${name}","count":${count},"total":${JSON.stringify(formatCents(subtotalCents))}}#${count}`
const quantity = (name: string, n: number) =>
  `cart.announce.quantity{"name":"${name}","quantity":${n}}`

describe('adding', () => {
  it('a new line: "{name} added to cart, {count} items, total {subtotal}"', () => {
    const { cart, announcement } = setup()
    cart.addProduct(ramen, 2)
    expect(announcement.value.message).toBe(added('Ramen', 2, 2800))
    expect(announcement.value.seq).toBe(1)
  })

  it('the count and the total are those of the whole basket, not of the line', () => {
    const { cart, announcement } = setup()
    cart.addProduct(ramen, 1)
    cart.addProduct(tea, 3)
    expect(announcement.value.message).toBe(added('Green tea', 4, 1400 + 900))
  })

  it('an add that merges into an existing line is still an add (the modal / the card "+")', () => {
    const { cart, announcement } = setup()
    cart.addProduct(ramen, 1)
    cart.addProduct(ramen, 2)
    expect(cart.products).toHaveLength(1)
    expect(announcement.value.message).toBe(added('Ramen', 3, 4200))
    expect(announcement.value.seq).toBe(2)
  })

  it('incrementing a product that has no line yet creates one, and says it was added', () => {
    const { cart, announcement } = setup()
    cart.incrementQuantity(tea)
    expect(announcement.value.message).toBe(added('Green tea', 1, 300))
  })
})

describe('stepping a line', () => {
  it('"+" on an existing line says the new quantity, not "added"', () => {
    const { cart, announcement } = setup()
    cart.addProduct(ramen, 1)
    cart.incrementQuantity(ramen)
    expect(announcement.value.message).toBe(quantity('Ramen', 2))
  })

  it('"−" on a line with several units says the new quantity', () => {
    const { cart, announcement } = setup()
    cart.addProduct(ramen, 3)
    cart.decrementQuantity(ramen)
    expect(announcement.value.message).toBe(quantity('Ramen', 2))
  })

  it('the same sentence twice in a row is announced twice (seq grows)', () => {
    const { cart, announcement } = setup()
    cart.addProduct(ramen, 5)
    cart.decrementQuantity(ramen)
    const first = announcement.value.seq
    cart.incrementQuantity(ramen)
    cart.decrementQuantity(ramen)
    expect(announcement.value.message).toBe(quantity('Ramen', 4))
    expect(announcement.value.seq).toBe(first + 2)
  })
})

describe('silence', () => {
  it('a line that goes away is not announced here (its removal toast already is)', () => {
    const { cart, announcement } = setup()
    cart.addProduct(ramen, 1)
    const { seq } = announcement.value
    cart.decrementQuantity(ramen)
    expect(cart.products).toEqual([])
    expect(announcement.value.seq).toBe(seq)
  })

  it('removeFromCart is not announced either', () => {
    const { cart, announcement } = setup()
    cart.addProduct(ramen, 1)
    const { seq } = announcement.value
    cart.removeFromCart(ramen)
    expect(announcement.value.seq).toBe(seq)
  })

  it('other store actions say nothing', () => {
    const { cart, announcement } = setup()
    cart.setCartVisibility(true)
    cart.resetState()
    expect(announcement.value).toEqual({ message: '', seq: 0 })
  })

  it('an increment past the limit changes nothing, so says nothing', () => {
    const { cart, announcement } = setup()
    cart.addProduct(ramen, MAX_ITEM_QUANTITY)
    const { seq } = announcement.value
    cart.incrementQuantity(ramen)
    expect(cart.products[0]!.quantity).toBe(MAX_ITEM_QUANTITY)
    expect(announcement.value.seq).toBe(seq)
  })

  it('an add to a line already at the limit is capped by the store: nothing changed, nothing announced', () => {
    const { cart, announcement } = setup()
    cart.addProduct(ramen, MAX_ITEM_QUANTITY)
    const { seq } = announcement.value
    cart.addProduct(ramen, 1)
    expect(cart.products.map((line) => line.quantity)).toEqual([MAX_ITEM_QUANTITY])
    expect(announcement.value.seq).toBe(seq)
  })
})
