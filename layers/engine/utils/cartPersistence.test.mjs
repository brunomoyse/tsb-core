// The persisted cart: slim versioned shape, migration of the v0 / v1 shapes, lines that cannot be recovered.
// Run: `vp test run layers/engine/utils/cartPersistence.test.mjs`.

import {
  CART_SCHEMA_VERSION,
  lineFromPersisted,
  migratePersistedCart,
  parsePersistedCart,
  serializeCartState,
  toPersistedLine,
} from './cartPersistence.ts'
import assert from 'node:assert/strict'
import { lineTotalCents } from './pricing.ts'
import { orderItemPayload } from './orderPayload.ts'
import { test } from 'vite-plus/test'

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
// Defensive paths: products and lines that are thinner than the menu query's, and hostile storage.
// ---------------------------------------------------------------------------------------------

test('a product without choices, code, slug, piece count or category persists with neutral defaults', () => {
  const thin = {
    id: 'thin',
    name: 'Thin',
    price: '2.00',
    isDiscountable: undefined,
    isLunchOnly: undefined,
  }
  const persisted = toPersistedLine({ product: thin, quantity: 1, selectedChoice: null })
  assert.deepEqual(persisted, {
    productId: 'thin',
    quantity: 1,
    selections: [],
    choiceId: null,
    snapshot: {
      name: 'Thin',
      code: null,
      slug: '',
      priceCents: 200,
      pieceCount: null,
      isDiscountable: false,
      isLunchOnly: false,
      category: null,
      choices: [],
    },
  })
})

test('a category missing its fields falls back to the product categoryId and empty strings', () => {
  const product = tea({ categoryId: 'cat-from-product', category: { order: 1 } })
  const { snapshot } = toPersistedLine(v1Line(product, 1, []))
  assert.deepEqual(snapshot.category, { id: 'cat-from-product', name: '', slug: '' })
  const noIds = tea({ categoryId: undefined, category: { order: 1 } })
  assert.equal(toPersistedLine(v1Line(noIds, 1, [])).snapshot.category.id, '')
})

test('a legacy single choice that is not among the product choices still persists, and prices itself', () => {
  const orphan = { id: 'old', productId: 'tea', priceModifier: '0.75', sortOrder: 0, name: 'Old' }
  const line = { product: tea(), quantity: 2, selectedChoices: undefined, selectedChoice: orphan }
  const persisted = toPersistedLine(line)
  assert.deepEqual(persisted.selections, [])
  assert.equal(persisted.choiceId, 'old')
  // The group is unknown: it is stored empty, never undefined.
  assert.deepEqual(persisted.snapshot.choices, [
    { id: 'old', groupId: '', priceModifierCents: 75, name: 'Old' },
  ])
  // And it survives the round trip: the rebuilt line carries the legacy choice with its price.
  const rebuilt = lineFromPersisted(persisted)
  assert.equal(rebuilt.selectedChoice.id, 'old')
  assert.equal(lineTotalCents(rebuilt), 2 * (350 + 75))
})

test('a legacy single choice that IS among the product choices is not stored twice', () => {
  const product = wholeProduct()
  const line = { product, quantity: 1, selectedChoices: [], selectedChoice: product.choices[1] }
  assert.deepEqual(
    toPersistedLine(line).snapshot.choices.map((c) => c.id),
    ['broth-b'],
  )
})

test('a persisted choiceId that the snapshot no longer holds rebuilds as no choice', () => {
  const persisted = toPersistedLine(v1Line(tea(), 1, []))
  const rebuilt = lineFromPersisted({ ...persisted, choiceId: 'gone' })
  assert.equal(rebuilt.selectedChoice, null)
})

test('v2 lines: missing selections / choices mean none, malformed ones drop the line', () => {
  const base = { productId: 'p', quantity: 1, snapshot: { name: 'x', priceCents: 100 } }
  const keep = migratePersistedCart({ version: 2, products: [base] }, MAX)
  assert.equal(keep.dropped, 0)
  assert.deepEqual(keep.state.products[0].selectedChoices, [])
  assert.deepEqual(keep.state.products[0].product.choices, [])
  const nullish = migratePersistedCart(
    {
      version: 2,
      products: [{ ...base, selections: null, snapshot: { ...base.snapshot, choices: null } }],
    },
    MAX,
  )
  assert.equal(nullish.dropped, 0)

  const broken = [
    { ...base, snapshot: { ...base.snapshot, choices: 'nope' } }, // Choices not a list
    { ...base, snapshot: { ...base.snapshot, choices: ['str'] } }, // A choice that is not an object
    { ...base, snapshot: { ...base.snapshot, choices: [{ name: 'no id' }] } }, // A choice without id
    { ...base, selections: ['str'] }, // A selection that is not an object
    { ...base, snapshot: { priceCents: 100 } }, // No name
    { ...base, snapshot: { name: 7, priceCents: 100 } }, // Name of the wrong type
  ]
  const result = migratePersistedCart({ version: 2, products: broken }, MAX)
  assert.equal(result.dropped, broken.length)
  assert.deepEqual(result.state.products, [])
})

test('v2 snapshot fields of the wrong type fall back instead of failing the line', () => {
  const line = {
    productId: 'p',
    quantity: 3,
    selections: [],
    choiceId: '',
    snapshot: {
      name: 'x',
      priceCents: 100,
      code: '',
      slug: 12,
      pieceCount: 'eight',
      isDiscountable: 'yes',
      isLunchOnly: 1,
      category: { id: 5, name: null, slug: undefined },
      choices: [{ id: 'c', groupId: 4, priceModifierCents: 1.5, name: undefined }],
    },
  }
  const { state, dropped } = migratePersistedCart({ version: 2, products: [line] }, MAX)
  assert.equal(dropped, 0)
  const item = state.products[0]
  const persisted = toPersistedLine(item)
  assert.equal(persisted.choiceId, null)
  assert.deepEqual(persisted.snapshot, {
    name: 'x',
    code: null,
    slug: '',
    priceCents: 100,
    pieceCount: null,
    isDiscountable: false,
    isLunchOnly: false,
    category: { id: '', name: '', slug: '' },
    choices: [],
  })
  // The malformed choice is kept in the snapshot with a zero modifier (it was never selected, so toPersistedLine slims it).
  assert.deepEqual(item.product.choices, [
    { ...item.product.choices[0], id: 'c', choiceGroupId: '', priceModifier: '0.00', name: '' },
  ])
})

test('v2 piece counts that are numbers are kept', () => {
  const { state } = migratePersistedCart(
    {
      version: 2,
      products: [
        { productId: 'p', quantity: 1, snapshot: { name: 'x', priceCents: 100, pieceCount: 8 } },
      ],
    },
    MAX,
  )
  assert.equal(state.products[0].product.pieceCount, 8)
})

test('a v0 line whose product has no name cannot be recovered', () => {
  const { dropped, state } = migratePersistedCart(
    { products: [{ product: { id: 'x', price: '1.00' }, quantity: 1, selectedChoices: [] }] },
    MAX,
  )
  assert.equal(dropped, 1)
  assert.deepEqual(state.products, [])
})

test('a selected choice of a pre-group product (no choiceGroupId) is stored with an empty group', () => {
  const product = {
    id: 'old',
    name: 'Old',
    price: '5.00',
    choices: [{ id: 'c', priceModifier: '1.00', name: 'C' }],
  }
  const line = {
    product,
    quantity: 1,
    selectedChoices: [{ groupId: '', choiceId: 'c', quantity: 1 }],
    selectedChoice: null,
  }
  assert.deepEqual(toPersistedLine(line).snapshot.choices, [
    { id: 'c', groupId: '', priceModifierCents: 100, name: 'C' },
  ])
})
