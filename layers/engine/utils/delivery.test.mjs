// Run: `node --test layers/engine/utils/delivery.test.mjs`.

import { deliveryZoneStatus, isDeliverable } from '../lib/delivery.ts'
import assert from 'node:assert/strict'
import { test } from 'node:test'

test('an address inside the zone is deliverable', () => {
  assert.equal(isDeliverable(4200, '4000'), true)
  assert.equal(deliveryZoneStatus({ distance: 4200, postcode: '4000' }), 'ok')
})

test('the excluded postcode is refused even when the distance passes', () => {
  assert.equal(isDeliverable(5000, '4610'), false)
  assert.equal(deliveryZoneStatus({ distance: 5000, postcode: '4610' }), 'excluded')
  assert.equal(deliveryZoneStatus({ distance: 5000, postcode: ' 4610 ' }), 'excluded')
})

test('distance at or beyond the zone is too far', () => {
  assert.equal(deliveryZoneStatus({ distance: 9000, postcode: '4000' }), 'tooFar')
  assert.equal(deliveryZoneStatus({ distance: 12000, postcode: '4000' }), 'tooFar')
})

test('excluded is reported in preference to too far; a missing distance counts as 0', () => {
  assert.equal(deliveryZoneStatus({ distance: 20000, postcode: '4610' }), 'excluded')
  assert.equal(deliveryZoneStatus({ postcode: '4000' }), 'ok')
})
