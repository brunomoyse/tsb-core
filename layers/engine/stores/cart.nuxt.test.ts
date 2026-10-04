// Cart store: lines, quantity rules, accepting a quoted price, reset, and its localStorage persistence.
// Run: `vp test run layers/engine/stores/cart.nuxt.test.ts`.
import { MAX_ITEM_QUANTITY, defaultOrderExtra, useCartStore } from '#engine/stores/cart'
import { beforeEach, describe, expect, it } from 'vite-plus/test'
import { createApp, nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { makeChoice, makeProduct } from '../../../test/fixtures/catalog'
import type { CartItem } from '#engine/types'
import type { QuoteLine } from '#engine/utils/orderQuote'
import { brand } from '#brand/brand'
import { createPersistedState } from 'pinia-plugin-persistedstate'
import { setFlags } from '../../../test/flags'

const sushi = makeProduct({ id: 'sushi', price: '10.00' })
const ramen = makeProduct({ id: 'ramen', price: '14.50', name: 'Ramen' })
const brothA = makeChoice({ id: 'broth-a', choiceGroupId: 'broth', productId: 'ramen' })
const brothB = makeChoice({ id: 'broth-b', choiceGroupId: 'broth', productId: 'ramen' })

function freshStore() {
  setActivePinia(createPinia())
  return useCartStore()
}

/** A pinia with the real persistence plugin, as @pinia/nuxt installs it, over happy-dom's localStorage. */
function persistedStore() {
  const pinia = createPinia()
  pinia.use(createPersistedState())
  createApp({}).use(pinia)
  setActivePinia(pinia)
  return useCartStore()
}

beforeEach(() => {
  localStorage.clear()
})

describe('initial state', () => {
  it('starts empty, on delivery and online payment, with the brand pre-ticked extras', () => {
    const cart = freshStore()
    expect(cart.products).toEqual([])
    expect(cart.isCartVisible).toBe(false)
    expect(cart.collectionOption).toBe('DELIVERY')
    expect(cart.paymentOption).toBe('ONLINE')
    expect(cart.couponCode).toBeNull()
    expect(cart.couponDiscountCents).toBe(0)
    expect(cart.pendingOrderId).toBeNull()
    expect(cart.orderExtra).toEqual(
      brand.orderExtras.filter((e) => e.preselected).map((e) => defaultOrderExtra(e)),
    )
  })

  it('defaultOrderExtra pre-selects the default option, else the first, else none', () => {
    expect(defaultOrderExtra({ name: 'chopsticks', preselected: true })).toEqual({
      name: 'chopsticks',
    })
    expect(
      defaultOrderExtra({
        name: 'sauce',
        preselected: true,
        options: ['sweet', 'both'],
        defaultOption: 'both',
      }),
    ).toEqual({
      name: 'sauce',
      options: ['both'],
    })
    expect(
      defaultOrderExtra({ name: 'sauce', preselected: false, options: ['sweet', 'salty'] }),
    ).toEqual({
      name: 'sauce',
      options: ['sweet'],
    })
  })
})

describe('addProduct', () => {
  it('adds a line, clamping the quantity to 1..MAX_ITEM_QUANTITY', () => {
    const cart = freshStore()
    cart.addProduct(sushi, 0)
    cart.addProduct(ramen, 500)
    expect(cart.products.map((l) => [l.product.id, l.quantity])).toEqual([
      ['sushi', 1],
      ['ramen', MAX_ITEM_QUANTITY],
    ])
  })

  it('merges the same product without selections into one line and caps the total', () => {
    const cart = freshStore()
    cart.addProduct(sushi, 2)
    cart.addProduct(sushi, 3)
    expect(cart.products).toHaveLength(1)
    expect(cart.products[0]!.quantity).toBe(5)
    cart.addProduct(sushi, MAX_ITEM_QUANTITY)
    expect(cart.products).toHaveLength(1)
    expect(cart.products[0]!.quantity).toBe(MAX_ITEM_QUANTITY)
  })

  it('keeps lines of the same product with different selections apart', () => {
    const cart = freshStore()
    cart.addProduct(ramen, 1, {
      selections: [{ groupId: 'broth', choiceId: 'broth-a', quantity: 1 }],
    })
    cart.addProduct(ramen, 1, {
      selections: [{ groupId: 'broth', choiceId: 'broth-b', quantity: 1 }],
    })
    expect(cart.products).toHaveLength(2)
  })

  it('merges identical per-unit compositions and rescales the selections to the new quantity', () => {
    const cart = freshStore()
    const broth = { groupId: 'broth', choiceId: 'broth-a' }
    cart.addProduct(ramen, 1, { selections: [{ ...broth, quantity: 1 }] })
    // 2 bowls with the same broth are the same composition per unit: 1 line of 3 bowls, selection quantity 3.
    cart.addProduct(ramen, 2, { selections: [{ ...broth, quantity: 2 }] })
    expect(cart.products).toHaveLength(1)
    expect(cart.products[0]!.quantity).toBe(3)
    expect(cart.products[0]!.selectedChoices).toEqual([{ ...broth, quantity: 3 }])
  })

  it('merges identical non-uniform lines by adding their selections, and starts a new line past the cap', () => {
    const cart = freshStore()
    const mixed = [
      { groupId: 'broth', choiceId: 'broth-a', quantity: 1 },
      { groupId: 'broth', choiceId: 'broth-b', quantity: 1 },
    ]
    // Two bowls, one broth each: not a whole multiple per unit -> cannot be rescaled.
    cart.addProduct(ramen, 2, { selections: mixed })
    cart.addProduct(ramen, 2, { selections: mixed })
    expect(cart.products).toHaveLength(1)
    expect(cart.products[0]!.quantity).toBe(4)
    expect(cart.products[0]!.selectedChoices.map((s) => s.quantity)).toEqual([2, 2])

    const full = freshStore()
    full.addProduct(ramen, 98, {
      selections: [
        { groupId: 'broth', choiceId: 'broth-a', quantity: 49 },
        { groupId: 'broth', choiceId: 'broth-b', quantity: 49 },
      ],
    })
    full.addProduct(ramen, 98, {
      selections: [
        { groupId: 'broth', choiceId: 'broth-a', quantity: 49 },
        { groupId: 'broth', choiceId: 'broth-b', quantity: 49 },
      ],
    })
    // 98 + 98 would exceed 99 and the line cannot be rescaled: a second line, no unit dropped.
    expect(full.products.map((l) => l.quantity)).toEqual([98, 98])
  })

  it('drops zero-quantity selections and stores the others in canonical order, copied', () => {
    const cart = freshStore()
    const input = [
      { groupId: 'g2', choiceId: 'c', quantity: 1 },
      { groupId: 'g1', choiceId: 'c', quantity: 1 },
      { groupId: 'g3', choiceId: 'c', quantity: 0 },
    ]
    cart.addProduct(ramen, 1, { selections: input })
    expect(cart.products[0]!.selectedChoices).toEqual([
      { groupId: 'g1', choiceId: 'c', quantity: 1 },
      { groupId: 'g2', choiceId: 'c', quantity: 1 },
    ])
    expect(cart.products[0]!.selectedChoices[0]).not.toBe(input[1])
  })

  it('turns a lone legacy choice into a selection scaled to the line quantity', () => {
    const cart = freshStore()
    cart.addProduct(ramen, 3, { choice: brothA })
    expect(cart.products[0]!.selectedChoices).toEqual([
      { groupId: 'broth', choiceId: 'broth-a', quantity: 3 },
    ])
    expect(cart.products[0]!.selectedChoice).toEqual(brothA)
  })

  it('keeps a legacy choice that does not know its group as a plain choice, without selections', () => {
    const cart = freshStore()
    const orphan = makeChoice({ id: 'orphan', choiceGroupId: undefined })
    cart.addProduct(ramen, 1, { choice: orphan })
    expect(cart.products[0]!.selectedChoices).toEqual([])
    expect(cart.products[0]!.selectedChoice).toEqual(orphan)
  })
})

describe('incrementQuantity / decrementQuantity / removeFromCart', () => {
  it('increments an existing line by one', () => {
    const cart = freshStore()
    cart.addProduct(sushi, 2)
    cart.incrementQuantity(sushi)
    expect(cart.products[0]!.quantity).toBe(3)
  })

  it('creates the line with quantity 1 when it is not in the cart yet', () => {
    const cart = freshStore()
    cart.incrementQuantity(sushi)
    cart.incrementQuantity(ramen, { choice: brothA })
    expect(cart.products.map((l) => [l.product.id, l.quantity])).toEqual([
      ['sushi', 1],
      ['ramen', 1],
    ])
    expect(cart.products[1]!.selectedChoices).toEqual([
      { groupId: 'broth', choiceId: 'broth-a', quantity: 1 },
    ])
  })

  it('never goes above MAX_ITEM_QUANTITY', () => {
    const cart = freshStore()
    cart.addProduct(sushi, MAX_ITEM_QUANTITY)
    cart.incrementQuantity(sushi)
    expect(cart.products[0]!.quantity).toBe(MAX_ITEM_QUANTITY)
  })

  it('rescales the selections with the quantity on + and -', () => {
    const cart = freshStore()
    cart.addProduct(ramen, 2, {
      selections: [{ groupId: 'broth', choiceId: 'broth-a', quantity: 2 }],
    })
    cart.incrementQuantity(ramen, {
      selections: [{ groupId: 'broth', choiceId: 'broth-a', quantity: 2 }],
      quantity: 2,
    })
    expect(cart.products[0]!.quantity).toBe(3)
    expect(cart.products[0]!.selectedChoices[0]!.quantity).toBe(3)
    cart.decrementQuantity(ramen, {
      selections: [{ groupId: 'broth', choiceId: 'broth-a', quantity: 3 }],
      quantity: 3,
    })
    expect(cart.products[0]!.quantity).toBe(2)
    expect(cart.products[0]!.selectedChoices[0]!.quantity).toBe(2)
  })

  it('leaves a non-uniform line untouched on + and -', () => {
    const cart = freshStore()
    const mixed = [
      { groupId: 'broth', choiceId: 'broth-a', quantity: 1 },
      { groupId: 'broth', choiceId: 'broth-b', quantity: 1 },
    ]
    cart.addProduct(ramen, 2, { selections: mixed })
    cart.incrementQuantity(ramen, { selections: mixed, quantity: 2 })
    cart.decrementQuantity(ramen, { selections: mixed, quantity: 2 })
    expect(cart.products[0]!.quantity).toBe(2)
    expect(cart.products[0]!.selectedChoices).toEqual(mixed)
  })

  it('decrements, and removes the line when it reaches zero', () => {
    const cart = freshStore()
    cart.addProduct(sushi, 2)
    cart.decrementQuantity(sushi)
    expect(cart.products[0]!.quantity).toBe(1)
    cart.decrementQuantity(sushi)
    expect(cart.products).toEqual([])
  })

  it('ignores a decrement of a line that is not in the cart', () => {
    const cart = freshStore()
    cart.addProduct(sushi, 1)
    cart.decrementQuantity(ramen)
    expect(cart.products).toHaveLength(1)
  })

  it('finds lines whose selections are handed back in another order', () => {
    const cart = freshStore()
    const a = { groupId: 'g1', choiceId: 'x', quantity: 1 }
    const b = { groupId: 'g2', choiceId: 'y', quantity: 1 }
    cart.addProduct(ramen, 1, { selections: [a, b] })
    cart.removeFromCart(ramen, { selections: [b, a] })
    expect(cart.products).toEqual([])
  })

  it('removeFromCart removes only the line it names', () => {
    const cart = freshStore()
    cart.addProduct(sushi, 1)
    cart.addProduct(ramen, 1)
    cart.addProduct(ramen, 1, {
      selections: [{ groupId: 'broth', choiceId: 'broth-a', quantity: 1 }],
    })
    cart.removeFromCart(ramen)
    expect(cart.products.map((l) => l.product.id)).toEqual(['sushi', 'ramen'])
    expect(cart.products[1]!.selectedChoices).toHaveLength(1)
  })

  it('tells lines of the same selections but another quantity apart when a quantity is given', () => {
    const cart = freshStore()
    const mixed = [{ groupId: 'g', choiceId: 'a', quantity: 2 }]
    // Two lines with the same selection signature (a duplicate that survived an old persisted cart).
    cart.products.push(
      { product: ramen, quantity: 2, selectedChoices: mixed, selectedChoice: null },
      { product: ramen, quantity: 3, selectedChoices: mixed, selectedChoice: null },
    )
    cart.removeFromCart(ramen, { selections: mixed, quantity: 3 })
    expect(cart.products.map((l) => l.quantity)).toEqual([2])
  })
})

describe('lines without a selectedChoices list (older in-memory shape)', () => {
  const legacyLine = (quantity: number) =>
    ({ product: sushi, quantity, selectedChoice: null }) as unknown as CartItem

  it('are still found, merged into, incremented and decremented', () => {
    const cart = freshStore()
    cart.products.push(legacyLine(2))
    cart.incrementQuantity(sushi)
    expect(cart.products[0]!.quantity).toBe(3)
    cart.products = [legacyLine(2)]
    cart.addProduct(sushi, 1)
    expect(cart.products).toHaveLength(1)
    expect(cart.products[0]!.quantity).toBe(3)
    cart.incrementQuantity(sushi)
    expect(cart.products[0]!.quantity).toBe(4)
    cart.decrementQuantity(sushi)
    expect(cart.products[0]!.quantity).toBe(3)
  })
})

describe('getters', () => {
  it('totalItems sums the quantities, subtotalCents the line totals in cents', () => {
    const cart = freshStore()
    expect(cart.totalItems).toBe(0)
    expect(cart.subtotalCents).toBe(0)
    cart.addProduct(sushi, 3)
    cart.addProduct(ramen, 2)
    expect(cart.totalItems).toBe(5)
    expect(cart.subtotalCents).toBe(3 * 1000 + 2 * 1450)
  })

  it('subtotalCents includes the priced choices of a line', () => {
    const cart = freshStore()
    const priced = makeProduct({
      id: 'p',
      price: '10.00',
      choices: [makeChoice({ id: 'extra', choiceGroupId: 'g', priceModifier: '1.50' })],
    })
    cart.addProduct(priced, 2, { selections: [{ groupId: 'g', choiceId: 'extra', quantity: 2 }] })
    expect(cart.subtotalCents).toBe(2 * 1000 + 2 * 150)
  })
})

describe('acceptQuotedPrice', () => {
  const quoteLine = (overrides: Partial<QuoteLine> = {}): QuoteLine => ({
    productId: 'ramen',
    quantity: 1,
    selections: [],
    productPrice: '16.00',
    unitPrice: '16.00',
    lineTotal: '16.00',
    issues: [],
    ...overrides,
  })

  it('does nothing when the quote has no price for the product', () => {
    const cart = freshStore()
    cart.addProduct(ramen, 1)
    const line = cart.products[0]!
    const { product } = line
    cart.acceptQuotedPrice(line, quoteLine({ productPrice: null }))
    expect(line.product).toBe(product)
    expect(line.product.price).toBe('14.50')
  })

  it('takes the current price and replaces the product object instead of mutating the menu product', () => {
    const cart = freshStore()
    cart.addProduct(ramen, 1)
    const line = cart.products[0]!
    cart.acceptQuotedPrice(line, quoteLine())
    expect(line.product.price).toBe('16.00')
    expect(line.product).not.toBe(ramen)
    expect(ramen.price).toBe('14.50')
    expect(cart.subtotalCents).toBe(1600)
  })

  it('reprices the known choices, adds the ones the snapshot lacked, and refreshes the selected choice', () => {
    const cart = freshStore()
    const product = makeProduct({
      id: 'ramen',
      price: '14.50',
      choices: [
        { ...brothA, priceModifier: '1.00' },
        { ...brothB, priceModifier: '2.00' },
      ],
    })
    cart.addProduct(product, 1, { choice: product.choices[0]! })
    const line = cart.products[0]!
    cart.acceptQuotedPrice(
      line,
      quoteLine({
        selections: [
          { groupId: 'broth', choiceId: 'broth-a', quantity: 1, priceModifier: '1.25' },
          { groupId: 'broth', choiceId: 'broth-new', quantity: 1, priceModifier: '0.50' },
          {
            choiceId: 'broth-nogroup',
            quantity: 1,
            priceModifier: '0.10',
          } as QuoteLine['selections'][number],
        ],
      }),
    )
    const byId = Object.fromEntries(line.product.choices.map((c) => [c.id, c]))
    expect(byId['broth-a']!.priceModifier).toBe('1.25')
    // A choice the quote did not price keeps its modifier.
    expect(byId['broth-b']!.priceModifier).toBe('2.00')
    expect(byId['broth-new']).toMatchObject({
      productId: 'ramen',
      choiceGroupId: 'broth',
      priceModifier: '0.50',
      name: '',
    })
    expect(byId['broth-nogroup']!.choiceGroupId).toBe('')
    // The legacy selected choice now points at the repriced one.
    expect(line.selectedChoice).toBe(byId['broth-a'])
  })

  it('keeps the selected choice when it is no longer among the choices', () => {
    const cart = freshStore()
    const gone = makeChoice({ id: 'gone', choiceGroupId: undefined })
    cart.addProduct(ramen, 1, { choice: gone })
    const line = cart.products[0]!
    cart.acceptQuotedPrice(line, quoteLine())
    expect(line.selectedChoice).toEqual(gone)
  })
})

describe('visibility and reset', () => {
  it('toggles and sets the cart drawer', () => {
    const cart = freshStore()
    cart.toggleCartVisibility()
    expect(cart.isCartVisible).toBe(true)
    cart.setCartVisibility(false)
    expect(cart.isCartVisible).toBe(false)
  })

  it('resetState returns every field to a fresh cart, so a second order starts like the first', () => {
    const cart = freshStore()
    const fresh = JSON.stringify(cart.$state)
    cart.addProduct(sushi, 2)
    cart.couponCode = 'WELCOME'
    cart.couponDiscountCents = 500
    cart.paymentOption = 'CASH'
    cart.cashPaymentAmount = '50'
    cart.collectionOption = 'PICKUP'
    cart.orderNote = 'no wasabi'
    cart.pendingOrderId = 'order-1'
    cart.orderExtra = []
    cart.isCartVisible = true
    cart.resetState()
    expect(JSON.stringify(cart.$state)).toBe(fresh)
  })
})

describe('persistence (localStorage "cart")', () => {
  const stored = () => JSON.parse(localStorage.getItem('cart') ?? 'null')

  it('writes the slim versioned shape on change and leaves transient UI state out', async () => {
    const cart = persistedStore()
    await nextTick()
    cart.addProduct(ramen, 2, {
      selections: [{ groupId: 'broth', choiceId: 'broth-a', quantity: 2 }],
    })
    cart.setCartVisibility(true)
    await nextTick()
    const saved = stored()
    expect(saved.version).toBe(2)
    expect(saved).not.toHaveProperty('isCartVisible')
    expect(saved).not.toHaveProperty('droppedOnHydrate')
    expect(saved.products).toHaveLength(1)
    expect(saved.products[0]).toMatchObject({
      productId: 'ramen',
      quantity: 2,
      selections: [{ groupId: 'broth', choiceId: 'broth-a', quantity: 2 }],
      snapshot: { name: 'Ramen', priceCents: 1450 },
    })
    // The whole Product (description, nested category products...) is not stored.
    expect(saved.products[0]).not.toHaveProperty('product')
  })

  it('hydrates a saved cart at creation: lines, options, drawer closed', () => {
    localStorage.setItem(
      'cart',
      JSON.stringify({
        version: 2,
        paymentOption: 'CASH',
        collectionOption: 'PICKUP',
        couponCode: 'WELCOME',
        couponDiscountCents: 300,
        products: [
          {
            productId: 'sushi',
            quantity: 4,
            selections: [],
            choiceId: null,
            snapshot: {
              name: 'Salmon nigiri',
              priceCents: 1000,
              code: 'S1',
              slug: 'salmon',
              category: null,
              choices: [],
            },
          },
        ],
      }),
    )
    const cart = persistedStore()
    expect(cart.products.map((l) => [l.product.id, l.quantity, l.product.price])).toEqual([
      ['sushi', 4, '10.00'],
    ])
    expect(cart.paymentOption).toBe('CASH')
    expect(cart.collectionOption).toBe('PICKUP')
    expect(cart.couponDiscountCents).toBe(300)
    expect(cart.isCartVisible).toBe(false)
    expect(cart.droppedOnHydrate).toBe(0)
  })

  it('migrates an old cart, counts the unrecoverable lines once, and writes the migrated shape back', () => {
    localStorage.setItem(
      'cart',
      JSON.stringify({
        products: [
          { product: { ...sushi }, quantity: 2, selectedChoices: [], selectedChoice: null },
          { garbage: true },
        ],
        couponCode: 'OLD',
        couponDiscount: 2.5,
      }),
    )
    const cart = persistedStore()
    expect(cart.products).toHaveLength(1)
    expect(cart.droppedOnHydrate).toBe(1)
    // Euros became integer cents.
    expect(cart.couponDiscountCents).toBe(250)
    // Written back right away, so the next visit does not migrate (and announce) again.
    const saved = stored()
    expect(saved.version).toBe(2)
    expect(saved.products[0].productId).toBe('sushi')
  })

  it('drops saved extras this brand does not offer and keeps the offered ones', () => {
    localStorage.setItem(
      'cart',
      JSON.stringify({
        version: 2,
        products: [],
        orderExtra: [{ name: 'chopsticks' }, { name: 'caviar-spoon' }],
      }),
    )
    const cart = persistedStore()
    expect(cart.orderExtra).toEqual([{ name: 'chopsticks' }])
  })

  it('tolerates a saved cart without an extras list', () => {
    localStorage.setItem('cart', JSON.stringify({ version: 2, products: [], orderExtra: null }))
    const cart = persistedStore()
    expect(cart.orderExtra).toBeNull()
  })

  it('starts empty on unreadable storage instead of failing', () => {
    localStorage.setItem('cart', '{not json')
    const cart = persistedStore()
    expect(cart.products).toEqual([])
    expect(cart.droppedOnHydrate).toBe(0)
  })

  it('does not take the drawer state from a saved cart', () => {
    localStorage.setItem('cart', JSON.stringify({ version: 2, products: [], isCartVisible: true }))
    expect(persistedStore().isCartVisible).toBe(false)
  })
})

describe('storage adapter', () => {
  /** The `persist` options the store declares, as the persistence plugin receives them. */
  function declaredStorage() {
    let storage:
      | { getItem: (k: string) => string | null; setItem: (k: string, v: string) => void }
      | undefined
    const pinia = createPinia()
    pinia.use(({ store, options }) => {
      if (store.$id === 'cart') {
        ;({ storage } = options.persist as { storage: typeof storage })
      }
    })
    createApp({}).use(pinia)
    setActivePinia(pinia)
    useCartStore()
    return storage!
  }

  it('is plain localStorage on the client (not the cookie default, which a big cart overflows)', () => {
    const storage = declaredStorage()
    storage.setItem('cart', 'value')
    expect(localStorage.getItem('cart')).toBe('value')
    expect(storage.getItem('cart')).toBe('value')
  })

  it('reads nothing and writes nothing during SSR (localStorage does not exist there)', () => {
    const storage = declaredStorage()
    localStorage.setItem('cart', 'client-only')
    setFlags({ server: true })
    expect(storage.getItem('cart')).toBeNull()
    storage.setItem('cart', 'from-server')
    expect(localStorage.getItem('cart')).toBe('client-only')
  })
})
