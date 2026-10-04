// Cart persistence on the data localStorage really holds: partial snapshots, hand-edited or corrupted JSON, carts written
// By older (v0/v1) or newer builds. What cannot be recovered is dropped and counted, never thrown.
import { describe, expect, it } from 'vite-plus/test'
import type { CartItem, ProductChoice } from '#engine/types'
import {
  CART_SCHEMA_VERSION,
  type PersistedLine,
  lineFromPersisted,
  migratePersistedCart,
  parsePersistedCart,
  productFromSnapshot,
  serializeCartState,
  toPersistedLine,
} from './cartPersistence'
import { makeChoice, makeProduct } from '../../../test/fixtures/catalog'

const MAX = 20

const snapshot = (overrides: Record<string, unknown> = {}) => ({
  name: 'Salmon nigiri',
  code: 'S1',
  slug: 'salmon-nigiri',
  priceCents: 1000,
  pieceCount: null,
  isDiscountable: true,
  isLunchOnly: false,
  category: { id: 'cat', name: 'Sushi', slug: 'sushi' },
  choices: [],
  ...overrides,
})

const v2Line = (overrides: Record<string, unknown> = {}) => ({
  productId: 'p1',
  quantity: 2,
  selections: [],
  choiceId: null,
  snapshot: snapshot(),
  ...overrides,
})

const migrate = (products: unknown[], extra: Record<string, unknown> = {}) =>
  migratePersistedCart({ version: CART_SCHEMA_VERSION, products, ...extra }, MAX)

describe('toPersistedLine with sparse products', () => {
  it('fills what the product lacks with neutral values', () => {
    const product = makeProduct({
      code: undefined as never,
      slug: undefined as never,
      pieceCount: undefined as never,
      isDiscountable: undefined as never,
      isLunchOnly: undefined as never,
      category: undefined as never,
      choices: undefined as never,
    })
    const line = toPersistedLine({ product, quantity: 1 } as CartItem)
    expect(line.snapshot).toMatchObject({
      code: null,
      slug: '',
      pieceCount: null,
      isDiscountable: false,
      isLunchOnly: false,
      category: null,
      choices: [],
    })
    expect(line.choiceId).toBeNull()
    expect(line.selections).toEqual([])
  })

  it('a category without id or names takes the product category id and empty strings', () => {
    const product = makeProduct({ categoryId: 'cat-9', category: {} as never })
    expect(toPersistedLine({ product, quantity: 1 } as CartItem).snapshot.category).toEqual({
      id: 'cat-9',
      name: '',
      slug: '',
    })
    const none = makeProduct({ categoryId: undefined as never, category: {} as never })
    expect(toPersistedLine({ product: none, quantity: 1 } as CartItem).snapshot.category?.id).toBe(
      '',
    )
  })

  it('keeps only the selected choices, with their price modifiers in cents', () => {
    const a = makeChoice({ id: 'a', priceModifier: '1.50', choiceGroupId: 'g' })
    const b = makeChoice({ id: 'b', priceModifier: '2.00', choiceGroupId: null as never })
    const product = makeProduct({ choices: [a, b, makeChoice({ id: 'c' })] })
    const line = toPersistedLine({
      product,
      quantity: 1,
      selectedChoices: [{ groupId: 'g', choiceId: 'a', quantity: 1 }],
      selectedChoice: b,
    })
    expect(line.snapshot.choices).toEqual([
      { id: 'a', groupId: 'g', priceModifierCents: 150, name: 'Choice' },
      { id: 'b', groupId: '', priceModifierCents: 200, name: 'Choice' },
    ])
    expect(line.choiceId).toBe('b')
  })

  it('a legacy choice that is not in the product choices is kept so that it can price itself', () => {
    const legacy = makeChoice({
      id: 'legacy',
      priceModifier: '0.50',
      choiceGroupId: undefined as never,
    })
    const line = toPersistedLine({
      product: makeProduct({ choices: [] }),
      quantity: 1,
      selectedChoice: legacy,
    } as CartItem)
    expect(line.snapshot.choices).toEqual([
      { id: 'legacy', groupId: '', priceModifierCents: 50, name: 'Choice' },
    ])
  })
})

describe('productFromSnapshot / lineFromPersisted', () => {
  it('a snapshot without category gives an empty one', () => {
    const product = productFromSnapshot('p1', snapshot({ category: null }))
    expect(product.categoryId).toBe('')
    expect(product.category).toMatchObject({ id: '', name: '', slug: '', order: 0 })
    expect(product.price).toBe('10.00')
  })

  it('rebuilds the legacy choice from the snapshot, or null when it is not in it', () => {
    const base: PersistedLine = {
      productId: 'p1',
      quantity: 1,
      selections: [],
      choiceId: 'c1',
      snapshot: snapshot({
        choices: [{ id: 'c1', groupId: 'g', priceModifierCents: 150, name: 'Spicy' }],
      }),
    }
    expect(lineFromPersisted(base).selectedChoice).toMatchObject({
      id: 'c1',
      priceModifier: '1.50',
    })
    expect(lineFromPersisted({ ...base, choiceId: 'other' }).selectedChoice).toBeNull()
    expect(lineFromPersisted({ ...base, choiceId: null }).selectedChoice).toBeNull()
  })
})

describe('serialize / parse round trip', () => {
  it('writes the versioned slim shape and reads it back to the same cart', () => {
    const choice = makeChoice({ id: 'c1', priceModifier: '1.00', choiceGroupId: 'g' })
    const product = makeProduct({ id: 'p1', choices: [choice] })
    const item: CartItem = {
      product,
      quantity: 2,
      selectedChoices: [{ groupId: 'g', choiceId: 'c1', quantity: 2 }],
      selectedChoice: null,
    }
    const json = serializeCartState({
      products: [item],
      couponCode: 'SUMMER',
      couponDiscountCents: 150,
    })
    expect(JSON.parse(json).version).toBe(CART_SCHEMA_VERSION)
    const { state, dropped, from } = parsePersistedCart(json, MAX)
    expect(dropped).toBe(0)
    expect(from).toBe(CART_SCHEMA_VERSION)
    expect(state.couponCode).toBe('SUMMER')
    expect(state.couponDiscountCents).toBe(150)
    const [line] = state.products as CartItem[]
    expect(line!.quantity).toBe(2)
    expect(line!.selectedChoices).toEqual(item.selectedChoices)
  })

  it('an empty state serialises to an empty cart', () => {
    expect(JSON.parse(serializeCartState({})).products).toEqual([])
  })

  it('text that is not JSON is an empty cart, not an error', () => {
    expect(parsePersistedCart('{oops', MAX)).toEqual({ state: {}, dropped: 0, from: 0 })
  })

  it('JSON that is not an object is an empty cart', () => {
    for (const json of ['null', '42', '"cart"', '[1,2]'])
      expect(parsePersistedCart(json, MAX)).toEqual({ state: {}, dropped: 0, from: 0 })
  })
})

describe('v2 lines are validated', () => {
  const ok = (line: unknown) => (migrate([line]).state.products as CartItem[]).length === 1
  const dropped = (line: unknown) => migrate([line]).dropped

  it('keeps a well-formed line', () => {
    expect(ok(v2Line())).toBe(true)
    expect(dropped(v2Line())).toBe(0)
  })

  it.each([
    ['not an object', 'junk'],
    ['null', null],
    ['no product id', v2Line({ productId: '' })],
    ['no snapshot', v2Line({ snapshot: undefined })],
    ['a quantity that is not a number', v2Line({ quantity: '2' })],
    ['an infinite quantity', v2Line({ quantity: Infinity })],
    ['selections that are not a list', v2Line({ selections: 'x' })],
    ['a selection that is not an object', v2Line({ selections: [1] })],
    ['a selection without a choice id', v2Line({ selections: [{ groupId: 'g', quantity: 1 }] })],
    ['a selection without a group id', v2Line({ selections: [{ choiceId: 'c', quantity: 1 }] })],
    [
      'a selection quantity of 0',
      v2Line({ selections: [{ groupId: 'g', choiceId: 'c', quantity: 0 }] }),
    ],
    [
      'a selection quantity with decimals',
      v2Line({ selections: [{ groupId: 'g', choiceId: 'c', quantity: 1.5 }] }),
    ],
    [
      'a selection quantity that is not a number',
      v2Line({ selections: [{ groupId: 'g', choiceId: 'c', quantity: '1' }] }),
    ],
    ['snapshot choices that are not a list', v2Line({ snapshot: snapshot({ choices: 'x' }) })],
    ['a snapshot choice without id', v2Line({ snapshot: snapshot({ choices: [{ name: 'x' }] }) })],
    [
      'a snapshot choice that is not an object',
      v2Line({ snapshot: snapshot({ choices: [null] }) }),
    ],
    ['a negative price', v2Line({ snapshot: snapshot({ priceCents: -1 }) })],
    ['a price with decimals', v2Line({ snapshot: snapshot({ priceCents: 10.5 }) })],
    ['a price that is not a number', v2Line({ snapshot: snapshot({ priceCents: '10' }) })],
    ['a name that is not text', v2Line({ snapshot: snapshot({ name: 5 }) })],
  ])('drops a line with %s and counts it', (_label, line) => {
    expect(ok(line)).toBe(false)
    expect(dropped(line)).toBe(1)
  })

  it('clamps the quantity between 1 and the maximum and truncates decimals', () => {
    const quantity = (value: number) =>
      (migrate([v2Line({ quantity: value })]).state.products as CartItem[])[0]!.quantity
    expect(quantity(0)).toBe(1)
    expect(quantity(-4)).toBe(1)
    expect(quantity(3.9)).toBe(3)
    expect(quantity(500)).toBe(MAX)
  })

  it('missing selections or snapshot choices mean none', () => {
    const [line] = migrate([
      v2Line({ selections: undefined, snapshot: snapshot({ choices: undefined }) }),
    ]).state.products as CartItem[]
    expect(line!.selectedChoices).toEqual([])
    expect(line!.product.choices).toEqual([])
  })

  it('tolerates sparse snapshot fields: an unknown category, missing code/slug/flags, a choice without name or modifier', () => {
    const [line] = migrate([
      v2Line({
        choiceId: '',
        snapshot: {
          name: 'Bowl',
          priceCents: 0,
          category: 'nope',
          pieceCount: 6,
          choices: [{ id: 'c1', priceModifierCents: 1.5 }],
        },
      }),
    ]).state.products as CartItem[]
    expect(line!.product).toMatchObject({
      code: null,
      slug: '',
      pieceCount: 6,
      isDiscountable: false,
      isLunchOnly: false,
      categoryId: '',
    })
    expect(line!.product.choices[0]).toMatchObject({
      id: 'c1',
      priceModifier: '0.00',
      name: '',
      choiceGroupId: '',
    })
    expect(line!.selectedChoice).toBeNull()
  })

  it('a category that is a record keeps its parts, with empty strings for the missing ones', () => {
    const [line] = migrate([v2Line({ snapshot: snapshot({ category: { id: 'c' } }) })]).state
      .products as CartItem[]
    expect(line!.product.category).toMatchObject({ id: 'c', name: '', slug: '' })
  })
})

describe('carts written by other builds', () => {
  it('a newer build: its lines are dropped (not guessed at), the rest of the state is kept', () => {
    const result = migratePersistedCart(
      {
        version: CART_SCHEMA_VERSION + 1,
        products: [v2Line(), v2Line()],
        collectionOption: 'DELIVERY',
      },
      MAX,
    )
    expect(result.dropped).toBe(2)
    expect(result.from).toBe(CART_SCHEMA_VERSION + 1)
    expect(result.state.products).toEqual([])
    expect(result.state.collectionOption).toBe('DELIVERY')
  })

  it('a missing products list is an empty cart', () => {
    const result = migratePersistedCart({ version: 2 }, MAX)
    expect(result.state.products).toEqual([])
    expect(result.dropped).toBe(0)
  })

  describe('v0 / v1 lines (the whole product per line)', () => {
    const legacyProduct = (overrides: Record<string, unknown> = {}) => ({
      id: 'p1',
      name: 'Ramen',
      price: '12.00',
      choices: [],
      ...overrides,
    })
    const legacy = (overrides: Record<string, unknown> = {}) => ({
      product: legacyProduct(),
      quantity: 1,
      ...overrides,
    })
    const products = (line: unknown) => migrate([line]).state.products as CartItem[]

    it('keeps a plain line, slimmed to its snapshot', () => {
      const [line] = products(legacy({ quantity: 3 }))
      expect(line).toMatchObject({ quantity: 3, selectedChoices: [], selectedChoice: null })
      expect(line!.product).toMatchObject({ id: 'p1', name: 'Ramen', price: '12.00' })
    })

    it.each([
      ['a product without id', legacy({ product: legacyProduct({ id: '' }) })],
      ['a product that is not an object', legacy({ product: 'x' })],
      ['a quantity that is not a number', legacy({ quantity: 'many' })],
      ['a product name that is not text', legacy({ product: legacyProduct({ name: 1 }) })],
      ['a price that is not a number', legacy({ product: legacyProduct({ price: 'free' }) })],
      ['a null price', legacy({ product: legacyProduct({ price: null }) })],
      ['an empty price', legacy({ product: legacyProduct({ price: '' }) })],
      ['malformed selections', legacy({ selectedChoices: [{ choiceId: 'c' }] })],
    ])('drops %s', (_label, line) => {
      expect(products(line)).toEqual([])
      expect(migrate([line]).dropped).toBe(1)
    })

    it('a single legacy choice with its group becomes a selection scaled to the quantity (line-wide)', () => {
      const choice: Partial<ProductChoice> = {
        id: 'c1',
        choiceGroupId: 'g',
        priceModifier: '1.00',
        name: 'Spicy',
      }
      const [line] = products(
        legacy({
          quantity: 2,
          product: legacyProduct({ choices: [choice] }),
          selectedChoice: choice,
        }),
      )
      expect(line!.selectedChoices).toEqual([{ groupId: 'g', choiceId: 'c1', quantity: 2 }])
    })

    it('a legacy choice that never knew its group stays the single legacy choice', () => {
      const choice = { id: 'c1', priceModifier: '1.00', name: 'Spicy' }
      const [line] = products(
        legacy({ product: legacyProduct({ choices: [choice] }), selectedChoice: choice }),
      )
      expect(line!.selectedChoices).toEqual([])
      expect(line!.selectedChoice).toMatchObject({ id: 'c1' })
    })

    it('a legacy selectedChoice without an id is ignored', () => {
      const [line] = products(legacy({ selectedChoice: { name: 'x' } }))
      expect(line!.selectedChoice).toBeNull()
    })

    it('valid selectedChoices are kept as they are', () => {
      const selection = { groupId: 'g', choiceId: 'c1', quantity: 2 }
      const [line] = products(legacy({ quantity: 2, selectedChoices: [selection] }))
      expect(line!.selectedChoices).toEqual([selection])
    })

    it('duplicate legacy lines are merged', () => {
      expect(
        migrate([legacy({ quantity: 1 }), legacy({ quantity: 2 })]).state.products,
      ).toHaveLength(1)
    })

    it('legacy and v2 lines can live in the same cart', () => {
      const result = migrate([legacy(), v2Line({ productId: 'p2' })])
      expect((result.state.products as CartItem[]).map((l) => l.product.id).sort()).toEqual([
        'p1',
        'p2',
      ])
    })
  })
})

describe('the coupon discount', () => {
  it('keeps integer cents when there is a coupon code', () => {
    expect(
      migrate([], { couponCode: 'A', couponDiscountCents: 250 }).state.couponDiscountCents,
    ).toBe(250)
  })

  it('converts the legacy euro amount to cents', () => {
    expect(migrate([], { couponCode: 'A', couponDiscount: 2.5 }).state.couponDiscountCents).toBe(
      250,
    )
  })

  it.each([
    ['a negative amount', { couponDiscountCents: -5 }],
    ['an amount with decimals', { couponDiscountCents: 2.5 }],
    ['text', { couponDiscountCents: '250' }],
    ['a legacy zero', { couponDiscount: 0 }],
    ['a legacy text', { couponDiscount: '2.5' }],
    ['nothing', {}],
  ])('%s becomes 0', (_label, extra) => {
    expect(migrate([], { couponCode: 'A', ...extra }).state.couponDiscountCents).toBe(0)
  })

  it('without a coupon code there is no discount, whatever was stored', () => {
    expect(migrate([], { couponDiscountCents: 500 }).state.couponDiscountCents).toBe(0)
    expect(migrate([], { couponCode: '', couponDiscount: 5 }).state.couponDiscountCents).toBe(0)
  })

  it('the legacy euro key is not carried into the state', () => {
    expect(migrate([], { couponCode: 'A', couponDiscount: 2.5 }).state).not.toHaveProperty(
      'couponDiscount',
    )
  })
})
