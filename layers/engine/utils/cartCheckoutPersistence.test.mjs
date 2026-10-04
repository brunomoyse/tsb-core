// The cart across a reload and across the sign-in round trip (full page loads to Zitadel and back).
// Run: `vp test run layers/engine/utils/cartCheckoutPersistence.test.mjs`.

import { describe, test } from 'vite-plus/test'
import { parsePersistedCart, serializeCartState } from './cartPersistence.ts'
import assert from 'node:assert/strict'
import { buildCreateOrderInput } from './orderPayload.ts'
import { lineTotalCents } from './pricing.ts'

const MAX = 99
const product = (id, price, extra = {}) => ({
  id,
  categoryId: 'cat',
  code: id.toUpperCase(),
  slug: id,
  name: `Product ${id}`,
  description: null,
  price,
  pieceCount: null,
  choices: [],
  choiceGroups: [],
  isAvailable: true,
  isVisible: true,
  isDiscountable: true,
  isLunchOnly: false,
  isHalal: false,
  isSpicy: false,
  isVegetarian: false,
  category: { id: 'cat', name: 'Cat', order: 1, slug: 'cat', products: [] },
  ...extra,
})
const line = (p, quantity = 1) => ({
  product: p,
  quantity,
  selectedChoices: [],
  selectedChoice: null,
})
const state = (overrides = {}) => ({
  products: [line(product('bowl', '10.00'), 2), line(product('tea', '3.50'), 1)],
  collectionOption: 'DELIVERY',
  couponCode: 'TOKYO10',
  couponDiscountCents: 250,
  paymentOption: 'CASH',
  cashPaymentAmount: '40',
  address: {
    id: 'place-1',
    streetName: 'Rue X',
    houseNumber: '1',
    postcode: '4000',
    municipalityName: 'Liege',
    distance: 2.1,
  },
  addressExtra: 'floor 3',
  orderExtra: [{ name: 'chopsticks' }],
  orderNote: 'no onions',
  preferredReadyTime: '2026-10-03T19:30:00+02:00',
  pendingOrderId: null,
  ...overrides,
})
const roundTrip = (s) => parsePersistedCart(serializeCartState(s), MAX).state

describe('reload', () => {
  test('lines, quantities and totals are the same after a reload', () => {
    const before = state()
    const after = roundTrip(before)
    assert.deepEqual(
      after.products.map((l) => [l.product.id, l.quantity, lineTotalCents(l)]),
      before.products.map((l) => [l.product.id, l.quantity, lineTotalCents(l)]),
    )
  })

  test('every checkout choice survives: delivery, address, payment, cash amount, coupon, note, slot, extras', () => {
    const after = roundTrip(state())
    for (const key of [
      'collectionOption',
      'couponCode',
      'couponDiscountCents',
      'paymentOption',
      'cashPaymentAmount',
      'addressExtra',
      'orderNote',
      'preferredReadyTime',
    ])
      assert.equal(after[key], state()[key], key)
    assert.equal(after.address.id, 'place-1')
    assert.deepEqual(after.orderExtra, [{ name: 'chopsticks' }])
  })

  test('the order built after a reload is the order built before it', () => {
    const before = state()
    assert.deepEqual(buildCreateOrderInput(roundTrip(before)), buildCreateOrderInput(before))
  })

  test('the id of the order sent to Mollie survives the full-page redirect there and back', () => {
    const after = roundTrip(state({ pendingOrderId: 'order-42' }))
    assert.equal(after.pendingOrderId, 'order-42')
  })

  test('a cart written by the previous bundle has no pending id (the confirmation page handles it)', () => {
    const { pendingOrderId: _unused, ...legacy } = state()
    assert.equal(roundTrip(legacy).pendingOrderId, undefined)
  })

  test('reading and writing again changes nothing, so a reload loop cannot corrupt the cart', () => {
    const json = serializeCartState(state({ pendingOrderId: 'order-42' }))
    const once = parsePersistedCart(json, MAX).state
    assert.equal(serializeCartState(once), json)
  })

  test('unreadable storage restores nothing (the store keeps its defaults), not a broken checkout', () => {
    for (const junk of ['', 'not json', '[]', 'null', '"x"']) {
      const { state: s, dropped } = parsePersistedCart(junk, MAX)
      assert.deepEqual(s, {}, junk)
      assert.equal(dropped, 0)
    }
  })
})

describe('sign-in round trip', () => {
  test('the cart stored before the redirect to Zitadel is the cart read after the callback', () => {
    // Before: the checkout writes the state; after: /auth/callback reloads the app and hydrates from storage.
    const before = state({
      paymentOption: 'ONLINE',
      cashPaymentAmount: null,
      collectionOption: 'PICKUP',
    })
    const stored = serializeCartState(before)
    const after = parsePersistedCart(stored, MAX)
    assert.equal(after.dropped, 0)
    assert.equal(after.state.products.length, 2)
    assert.equal(after.state.collectionOption, 'PICKUP')
    assert.equal(after.state.paymentOption, 'ONLINE')
  })

  test('an SSR payload with an empty cart must not win over the stored one: the stored JSON still has the lines', () => {
    // The page hydrates from localStorage after mount ($hydrate); the persisted string itself is never replaced by SSR.
    const stored = serializeCartState(state())
    assert.equal(parsePersistedCart(stored, MAX).state.products.length, 2)
    // And an empty write is what would wipe it: it parses to an empty cart (the reason the page re-hydrates first).
    assert.equal(
      parsePersistedCart(serializeCartState(state({ products: [] })), MAX).state.products.length,
      0,
    )
  })

  test('a product deleted while the customer was away keeps its line, so the quote can flag it for removal', () => {
    const stored = serializeCartState(state({ products: [line(product('gone', '5.00'), 1)] }))
    const { state: s, dropped } = parsePersistedCart(stored, MAX)
    assert.equal(dropped, 0)
    assert.deepEqual(
      s.products.map((l) => l.product.id),
      ['gone'],
    )
  })

  test('a quantity written out of range is clamped, never sent as is', () => {
    const stored = serializeCartState(state({ products: [line(product('bowl', '10.00'), 500)] }))
    assert.equal(parsePersistedCart(stored, MAX).state.products[0].quantity, MAX)
  })
})
