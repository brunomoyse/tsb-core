// Takeaway-only mode (audit PR 4.4).
// Run: `node --test layers/engine/utils/deliveryMode.test.mjs`.

import { brandOffersDelivery, defaultCollectionOption, enforcedCollectionOption } from './deliveryMode.ts'
import assert from 'node:assert/strict'
import { test } from 'node:test'

test('delivery is offered unless the brand turns it off', () => {
  assert.equal(brandOffersDelivery(undefined), true)
  assert.equal(brandOffersDelivery(true), true)
  assert.equal(brandOffersDelivery(false), false)
})

test('a fresh cart starts on delivery, or on pickup in takeaway-only mode', () => {
  assert.equal(defaultCollectionOption(true), 'DELIVERY')
  assert.equal(defaultCollectionOption(false), 'PICKUP')
})

test('delivery is snapped back to pickup only while it is not offered', () => {
  assert.equal(enforcedCollectionOption('DELIVERY', false), 'PICKUP')
  assert.equal(enforcedCollectionOption('DELIVERY', true), 'DELIVERY')
  assert.equal(enforcedCollectionOption('PICKUP', false), 'PICKUP')
  assert.equal(enforcedCollectionOption('PICKUP', true), 'PICKUP')
})
