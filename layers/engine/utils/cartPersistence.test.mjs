// The persisted cart: slim versioned shape, migration of the v0 / v1 shapes, lines that cannot be recovered; then the
// data localStorage really holds: partial snapshots, hand-edited or corrupted JSON, every way a line can be malformed.
// Run: `vp test run layers/engine/utils/cartPersistence.test.mjs`.

import {
  CART_SCHEMA_VERSION,
  lineFromPersisted,
  migratePersistedCart,
  parsePersistedCart,
  productFromSnapshot,
  serializeCartState,
  toPersistedLine,
} from './cartPersistence.ts'
import { describe, expect, it, test } from 'vite-plus/test'
import { makeChoice, makeProduct } from '../../../test/fixtures/catalog.ts'
import assert from 'node:assert/strict'
import { lineTotalCents } from './pricing.ts'
import { orderItemPayload } from './orderPayload.ts'

const MAX = 99

// A whole Product as the menu query returns it (what v0 / v1 carts persisted per line).
const wholeProduct = (overrides = {}) => ({
  id: 'bowl',
  categoryId: 'cat-bowls',
  code: 'M12',
  slug: 'malatang-bowl',
  name: 'Malatang bowl',
  description: 'A long marketing description '.repeat(5),
  price: '10.00',
  pieceCount: null,
  isAvailable: true,
  isVisible: true,
  isDiscountable: true,
  isLunchOnly: false,
  isHalal: false,
  isSpicy: true,
  isVegetarian: false,
  category: {
    id: 'cat-bowls',
    name: 'Bowls',
    order: 2,
    slug: 'bowls',
    products: [{ id: 'x', name: 'many other products' }],
  },
  choices: [
    {
      id: 'broth-a',
      productId: 'bowl',
      choiceGroupId: 'broths',
      priceModifier: '0.00',
      sortOrder: 1,
      name: 'Mild',
    },
    {
      id: 'broth-b',
      productId: 'bowl',
      choiceGroupId: 'broths',
      priceModifier: '1.50',
      sortOrder: 2,
      name: 'Spicy',
    },
    {
      id: 'noodle',
      productId: 'bowl',
      choiceGroupId: 'noodles',
      priceModifier: '0.50',
      sortOrder: 3,
      name: 'Glass noodles',
    },
  ],
  choiceGroups: [
    {
      id: 'broths',
      productId: 'bowl',
      minSelections: 1,
      maxSelections: 1,
      sortOrder: 1,
      name: 'Broth',
      choices: [],
    },
  ],
  ...overrides,
})
const tea = (overrides = {}) =>
  wholeProduct({
    id: 'tea',
    code: 'D1',
    slug: 'green-tea',
    name: 'Green tea',
    price: '3.50',
    isDiscountable: false,
    choices: [],
    choiceGroups: [],
    category: { id: 'cat-drinks', name: 'Drinks', order: 5, slug: 'drinks', products: [] },
    categoryId: 'cat-drinks',
    ...overrides,
  })

const v1Line = (product, quantity, selectedChoices) => ({
  product,
  quantity,
  selectedChoices,
  selectedChoice: null,
})
const v1Cart = (products, extra = {}) => ({
  products,
  collectionOption: 'PICKUP',
  couponCode: null,
  couponDiscountCents: 0,
  paymentOption: 'CASH',
  address: null,
  orderExtra: [],
  orderNote: null,
  ...extra,
})

test('the persisted line is slim: identity, selections and a minimal snapshot', () => {
  const line = v1Line(wholeProduct(), 2, [{ groupId: 'broths', choiceId: 'broth-b', quantity: 2 }])
  const persisted = toPersistedLine(line)
  assert.deepEqual(persisted, {
    productId: 'bowl',
    quantity: 2,
    selections: [{ groupId: 'broths', choiceId: 'broth-b', quantity: 2 }],
    choiceId: null,
    snapshot: {
      name: 'Malatang bowl',
      code: 'M12',
      slug: 'malatang-bowl',
      priceCents: 1000,
      pieceCount: null,
      isDiscountable: true,
      isLunchOnly: false,
      category: { id: 'cat-bowls', name: 'Bowls', slug: 'bowls' },
      // Only the SELECTED choice, with its price as cents.
      choices: [{ id: 'broth-b', groupId: 'broths', priceModifierCents: 150, name: 'Spicy' }],
    },
  })
  const wire = JSON.stringify(persisted)
  assert.ok(!wire.includes('description'))
  assert.ok(
    wire.length < JSON.stringify(line).length / 2,
    `slim: ${wire.length} vs ${JSON.stringify(line).length}`,
  )
})

test('a slim line renders and prices exactly like the whole one', () => {
  const lines = [
    v1Line(wholeProduct(), 2, [
      { groupId: 'broths', choiceId: 'broth-b', quantity: 2 },
      { groupId: 'noodles', choiceId: 'noodle', quantity: 2 },
    ]),
    v1Line(tea(), 3, []),
  ]
  for (const line of lines) {
    const back = lineFromPersisted(toPersistedLine(line))
    assert.equal(lineTotalCents(back), lineTotalCents(line))
    assert.equal(back.product.name, line.product.name)
    assert.equal(back.product.price, line.product.price)
    assert.equal(back.product.category.name, line.product.category.name)
    assert.equal(back.product.isDiscountable, line.product.isDiscountable)
    assert.deepEqual(back.selectedChoices, line.selectedChoices)
  }
  // 2 × 10.00 + 2 × 1.50 + 2 × 0.50
  assert.equal(lineTotalCents(lineFromPersisted(toPersistedLine(lines[0]))), 2400)
})

test('serialize then parse is lossless for the cart state, and writes the version', () => {
  const state = v1Cart(
    [
      v1Line(wholeProduct(), 1, [{ groupId: 'broths', choiceId: 'broth-a', quantity: 1 }]),
      v1Line(tea(), 2, []),
    ],
    { couponCode: 'TOKYO10', couponDiscountCents: 250, addressExtra: 'ring twice' },
  )
  const json = serializeCartState(state)
  assert.equal(JSON.parse(json).version, CART_SCHEMA_VERSION)
  assert.equal(JSON.parse(json).products[0].productId, 'bowl')

  const { state: back, dropped, from } = parsePersistedCart(json, MAX)
  assert.equal(from, CART_SCHEMA_VERSION)
  assert.equal(dropped, 0)
  assert.ok(!('version' in back), 'the version is not part of the store state')
  assert.equal(back.couponCode, 'TOKYO10')
  assert.equal(back.couponDiscountCents, 250)
  assert.equal(back.addressExtra, 'ring twice')
  assert.deepEqual(
    back.products.map((l) => [l.product.id, l.quantity, lineTotalCents(l)]),
    [
      ['bowl', 1, 1000],
      ['tea', 2, 700],
    ],
  )
  // Stable: writing the migrated state again gives the same bytes.
  assert.equal(serializeCartState(back), json)
})

test('v1 (no version, whole products) migrates to the slim shape without changing any total', () => {
  const lines = [
    v1Line(wholeProduct(), 2, [{ groupId: 'broths', choiceId: 'broth-b', quantity: 2 }]),
    v1Line(tea(), 1, []),
  ]
  const before = lines.map(lineTotalCents)
  const { state, dropped, from } = migratePersistedCart(v1Cart(lines), MAX)
  assert.equal(from, 0)
  assert.equal(dropped, 0)
  assert.deepEqual(state.products.map(lineTotalCents), before)
  assert.ok(!('choiceGroups' in state.products[0].product), 'the heavy product fields are gone')
  assert.equal(state.collectionOption, 'PICKUP')
})

test('Phase 1: a legacy choice stored per unit is scaled to the line quantity, duplicate lines merge', () => {
  const [, choice] = wholeProduct().choices
  const legacy = {
    ...v1Line(wholeProduct(), 3, [{ groupId: 'broths', choiceId: 'broth-b', quantity: 1 }]),
    selectedChoice: choice,
  }
  const { state } = migratePersistedCart(v1Cart([legacy]), MAX)
  assert.deepEqual(state.products[0].selectedChoices, [
    { groupId: 'broths', choiceId: 'broth-b', quantity: 3 },
  ])
  assert.equal(state.products[0].selectedChoice.id, 'broth-b')
  // 3 × 10.00 + 3 × 1.50
  assert.equal(lineTotalCents(state.products[0]), 3450)

  const twice = v1Line(tea(), 1, [])
  const merged = migratePersistedCart(v1Cart([twice, v1Line(tea(), 2, [])]), MAX)
  assert.equal(merged.state.products.length, 1)
  assert.equal(merged.state.products[0].quantity, 3)
  assert.equal(merged.dropped, 0)
})

test('v0: no selectedChoices at all, only the single selectedChoice, and a euro couponDiscount', () => {
  const [, , choice] = wholeProduct().choices
  const v0 = {
    products: [{ product: wholeProduct(), quantity: 2, selectedChoice: choice }],
    couponCode: 'OLD',
    couponDiscount: 3.5,
    collectionOption: 'DELIVERY',
  }
  const { state, dropped } = migratePersistedCart(v0, MAX)
  assert.equal(dropped, 0)
  assert.deepEqual(state.products[0].selectedChoices, [
    { groupId: 'noodles', choiceId: 'noodle', quantity: 2 },
  ])
  // Phase 2.1: euros become integer cents, the old key is gone.
  assert.equal(state.couponDiscountCents, 350)
  assert.ok(!('couponDiscount' in state))
  assert.equal(state.couponCode, 'OLD')
})

test('v0: a legacy choice without a group stays the legacy single choice (no selection with an empty groupId)', () => {
  const [, , noodle] = wholeProduct().choices
  const { choiceGroupId: _group, ...groupless } = noodle
  const v0 = {
    products: [{ product: wholeProduct(), quantity: 2, selectedChoice: groupless }],
    collectionOption: 'PICKUP',
  }
  const { state, dropped } = migratePersistedCart(v0, MAX)
  assert.equal(dropped, 0)
  const [line] = state.products
  assert.deepEqual(line.selectedChoices, [])
  assert.equal(line.selectedChoice?.id, 'noodle')
  // It is priced from the single choice and ordered as `choiceId`.
  assert.equal(lineTotalCents(line), 2 * 1000 + 2 * 50)
  assert.deepEqual(orderItemPayload(line), { productId: 'bowl', quantity: 2, choiceId: 'noodle' })
  // And it survives a save / load round trip.
  const again = parsePersistedCart(serializeCartState(state), MAX).state.products.at(0)
  assert.deepEqual(again.selectedChoices, [])
  assert.equal(again.selectedChoice?.id, 'noodle')
})

test('the coupon amount: cents win when valid, garbage becomes 0, and no code means no discount', () => {
  const base = { products: [], couponCode: 'X' }
  assert.equal(
    migratePersistedCart({ ...base, couponDiscountCents: 250 }, MAX).state.couponDiscountCents,
    250,
  )
  assert.equal(
    migratePersistedCart({ ...base, couponDiscountCents: -5 }, MAX).state.couponDiscountCents,
    0,
  )
  assert.equal(
    migratePersistedCart({ ...base, couponDiscountCents: 2.5 }, MAX).state.couponDiscountCents,
    0,
  )
  assert.equal(
    migratePersistedCart({ ...base, couponDiscountCents: 'x', couponDiscount: 1.2 }, MAX).state
      .couponDiscountCents,
    120,
  )
  assert.equal(
    migratePersistedCart({ products: [], couponCode: null, couponDiscountCents: 500 }, MAX).state
      .couponDiscountCents,
    0,
  )
})

test('lines that cannot be recovered are dropped and counted; the good ones survive', () => {
  const good = v1Line(tea(), 1, [])
  const broken = [
    { quantity: 1, selectedChoices: [] }, // No product
    { product: { name: 'No id', price: '1.00' }, quantity: 1, selectedChoices: [] },
    { product: tea(), quantity: Number.NaN, selectedChoices: [] }, // No usable quantity
    { product: tea(), quantity: 'two', selectedChoices: [] },
    { product: { ...tea(), price: null }, quantity: 1, selectedChoices: [] }, // Cannot be priced
    { product: { ...tea(), price: 'free' }, quantity: 1, selectedChoices: [] },
    { product: tea(), quantity: 1, selectedChoices: [{ groupId: 'g', quantity: 1 }] }, // Selection without a choice
    {
      product: tea(),
      quantity: 1,
      selectedChoices: [{ groupId: 'g', choiceId: 'c', quantity: 0 }],
    },
    'garbage',
    null,
    // The v2 lines
    { productId: 'p', quantity: 1, selections: [], snapshot: { name: 'x', priceCents: -1 } },
    { productId: 'p', quantity: 1, selections: [], snapshot: { name: 'x', priceCents: 1.5 } },
    { productId: 'p', quantity: 1, selections: 'nope', snapshot: { name: 'x', priceCents: 100 } },
    { productId: '', quantity: 1, selections: [], snapshot: { name: 'x', priceCents: 100 } },
    { productId: 'p', quantity: 1, selections: [] },
  ]
  const { state, dropped } = migratePersistedCart(v1Cart([good, ...broken]), MAX)
  assert.equal(dropped, broken.length)
  assert.equal(state.products.length, 1)
  assert.equal(state.products[0].product.id, 'tea')
})

test('quantities are clamped to 1..max, fractions truncated', () => {
  const { state } = migratePersistedCart(
    v1Cart([
      v1Line(tea(), 250, []),
      v1Line(wholeProduct({ id: 'x' }), 0, []),
      v1Line(wholeProduct({ id: 'y' }), 2.9, []),
    ]),
    MAX,
  )
  assert.deepEqual(
    state.products.map((l) => l.quantity),
    [99, 1, 2],
  )
})

test('a cart written by a NEWER build is not guessed at: its lines are dropped, the rest is kept', () => {
  const future = {
    version: CART_SCHEMA_VERSION + 1,
    products: [{ whatever: true }, { productId: 'p' }],
    collectionOption: 'PICKUP',
    couponCode: null,
  }
  const { state, dropped, from } = migratePersistedCart(future, MAX)
  assert.equal(from, CART_SCHEMA_VERSION + 1)
  assert.equal(dropped, 2)
  assert.deepEqual(state.products, [])
  assert.equal(state.collectionOption, 'PICKUP')
})

test('garbage in storage gives an empty cart instead of a failed page', () => {
  for (const raw of ['', 'not json', '42', 'null', '[]', '"cart"']) {
    const { state, dropped } = parsePersistedCart(raw, MAX)
    assert.deepEqual(state, {}, raw)
    assert.equal(dropped, 0)
  }
  assert.deepEqual(parsePersistedCart('{"products":"x"}', MAX).state.products, [])
})

test('a saved cart with a product that is gone keeps the line (the server flags it, not the migration)', () => {
  // The migration cannot know the menu: an unavailable / deleted product is the QUOTE's job (PRODUCT_UNAVAILABLE / PRODUCT_NOT_FOUND).
  const { state, dropped } = migratePersistedCart(
    v1Cart([v1Line(wholeProduct({ id: 'deleted-last-week', isAvailable: false }), 1, [])]),
    MAX,
  )
  assert.equal(dropped, 0)
  assert.equal(state.products.length, 1)
})

test('migrating twice changes nothing (idempotent)', () => {
  const first = migratePersistedCart(
    v1Cart(
      [
        v1Line(wholeProduct(), 2, [{ groupId: 'broths', choiceId: 'broth-b', quantity: 2 }]),
        v1Line(tea(), 1, []),
      ],
      { couponCode: 'A', couponDiscountCents: 100 },
    ),
    MAX,
  )
  const json = serializeCartState(first.state)
  const second = parsePersistedCart(json, MAX)
  assert.equal(second.dropped, 0)
  assert.equal(serializeCartState(second.state), json)
})

// ---------------------------------------------------------------------------------------------
// The data localStorage really holds: sparse products, malformed lines, other builds' carts. What cannot be recovered is
// dropped and counted, never thrown.
// ---------------------------------------------------------------------------------------------
const EDGE_MAX = 20

const snapshot = (overrides = {}) => ({
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

const v2Line = (overrides = {}) => ({
  productId: 'p1',
  quantity: 2,
  selections: [],
  choiceId: null,
  snapshot: snapshot(),
  ...overrides,
})

const migrate = (products, extra = {}) =>
  migratePersistedCart({ version: CART_SCHEMA_VERSION, products, ...extra }, EDGE_MAX)

describe('toPersistedLine with sparse products', () => {
  it('fills what the product lacks with neutral values', () => {
    const product = makeProduct({
      code: undefined,
      slug: undefined,
      pieceCount: undefined,
      isDiscountable: undefined,
      isLunchOnly: undefined,
      category: undefined,
      choices: undefined,
    })
    const line = toPersistedLine({ product, quantity: 1 })
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
    const product = makeProduct({ categoryId: 'cat-9', category: {} })
    expect(toPersistedLine({ product, quantity: 1 }).snapshot.category).toEqual({
      id: 'cat-9',
      name: '',
      slug: '',
    })
    const none = makeProduct({ categoryId: undefined, category: {} })
    expect(toPersistedLine({ product: none, quantity: 1 }).snapshot.category?.id).toBe('')
  })

  it('keeps only the selected choices, with their price modifiers in cents', () => {
    const a = makeChoice({ id: 'a', priceModifier: '1.50', choiceGroupId: 'g' })
    const b = makeChoice({ id: 'b', priceModifier: '2.00', choiceGroupId: null })
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
      choiceGroupId: undefined,
    })
    const legacyProduct = makeProduct({ choices: [] })
    const line = toPersistedLine({ product: legacyProduct, quantity: 1, selectedChoice: legacy })
    expect(line.snapshot.choices).toEqual([
      { id: 'legacy', groupId: '', priceModifierCents: 50, name: 'Choice' },
    ])
    // It survives the round trip and prices itself: the rebuilt line carries the choice with its modifier.
    const rebuilt = lineFromPersisted(line)
    expect(rebuilt.selectedChoice?.id).toBe('legacy')
    expect(lineTotalCents(rebuilt)).toBe(Math.round(Number(legacyProduct.price) * 100) + 50)
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
    const base = {
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
  it('an empty state serialises to an empty cart', () => {
    expect(JSON.parse(serializeCartState({})).products).toEqual([])
  })
})

describe('v2 lines are validated', () => {
  const ok = (line) => migrate([line]).state.products.length === 1
  const dropped = (line) => migrate([line]).dropped

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
    const quantity = (value) => migrate([v2Line({ quantity: value })]).state.products[0].quantity
    expect(quantity(0)).toBe(1)
    expect(quantity(-4)).toBe(1)
    expect(quantity(3.9)).toBe(3)
    expect(quantity(500)).toBe(EDGE_MAX)
  })

  it('missing selections or snapshot choices mean none', () => {
    const [line] = migrate([
      v2Line({ selections: undefined, snapshot: snapshot({ choices: undefined }) }),
    ]).state.products
    expect(line.selectedChoices).toEqual([])
    expect(line.product.choices).toEqual([])
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
    ]).state.products
    expect(line.product).toMatchObject({
      code: null,
      slug: '',
      pieceCount: 6,
      isDiscountable: false,
      isLunchOnly: false,
      categoryId: '',
    })
    expect(line.product.choices[0]).toMatchObject({
      id: 'c1',
      priceModifier: '0.00',
      name: '',
      choiceGroupId: '',
    })
    expect(line.selectedChoice).toBeNull()
  })

  it('a category that is a record keeps its parts, with empty strings for the missing ones', () => {
    const [line] = migrate([v2Line({ snapshot: snapshot({ category: { id: 'c' } }) })]).state
      .products
    expect(line.product.category).toMatchObject({ id: 'c', name: '', slug: '' })
  })
})

describe('carts written by other builds', () => {
  it('a missing products list is an empty cart', () => {
    const result = migratePersistedCart({ version: 2 }, EDGE_MAX)
    expect(result.state.products).toEqual([])
    expect(result.dropped).toBe(0)
  })

  describe('v0 / v1 lines (the whole product per line)', () => {
    const legacyProduct = (overrides = {}) => ({
      id: 'p1',
      name: 'Ramen',
      price: '12.00',
      choices: [],
      ...overrides,
    })
    const legacy = (overrides = {}) => ({
      product: legacyProduct(),
      quantity: 1,
      ...overrides,
    })
    const products = (line) => migrate([line]).state.products

    it('keeps a plain line, slimmed to its snapshot', () => {
      const [line] = products(legacy({ quantity: 3 }))
      expect(line).toMatchObject({ quantity: 3, selectedChoices: [], selectedChoice: null })
      expect(line.product).toMatchObject({ id: 'p1', name: 'Ramen', price: '12.00' })
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
      const choice = {
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
      expect(line.selectedChoices).toEqual([{ groupId: 'g', choiceId: 'c1', quantity: 2 }])
    })

    it('a legacy choice that never knew its group stays the single legacy choice', () => {
      const choice = { id: 'c1', priceModifier: '1.00', name: 'Spicy' }
      const [line] = products(
        legacy({ product: legacyProduct({ choices: [choice] }), selectedChoice: choice }),
      )
      expect(line.selectedChoices).toEqual([])
      expect(line.selectedChoice).toMatchObject({ id: 'c1' })
    })

    it('a legacy selectedChoice without an id is ignored', () => {
      const [line] = products(legacy({ selectedChoice: { name: 'x' } }))
      expect(line.selectedChoice).toBeNull()
    })

    it('valid selectedChoices are kept as they are', () => {
      const selection = { groupId: 'g', choiceId: 'c1', quantity: 2 }
      const [line] = products(legacy({ quantity: 2, selectedChoices: [selection] }))
      expect(line.selectedChoices).toEqual([selection])
    })

    it('duplicate legacy lines are merged', () => {
      expect(
        migrate([legacy({ quantity: 1 }), legacy({ quantity: 2 })]).state.products,
      ).toHaveLength(1)
    })

    it('legacy and v2 lines can live in the same cart', () => {
      const result = migrate([legacy(), v2Line({ productId: 'p2' })])
      expect(result.state.products.map((l) => l.product.id).sort()).toEqual(['p1', 'p2'])
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
