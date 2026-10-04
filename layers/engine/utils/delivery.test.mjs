// Run: `vp test run layers/engine/utils/delivery.test.mjs`.

import {
  OUT_OF_ZONE,
  deliveryFeeCentsForDistance,
  deliveryZoneStatus,
  isDeliverable,
  isExcludedPostcode,
} from '../lib/delivery.ts'
import { orderingPolicyFromApi, DEFAULT_ORDERING_POLICY as policy } from './orderingPolicy.ts'
import assert from 'node:assert/strict'
import { test } from 'vite-plus/test'

test('an address inside the zone is deliverable', () => {
  assert.equal(isDeliverable(policy, 4200, '4000'), true)
  assert.equal(deliveryZoneStatus(policy, { distance: 4200, postcode: '4000' }), 'ok')
})

test('the excluded postcode is refused even when the distance passes', () => {
  assert.equal(isDeliverable(policy, 5000, '4610'), false)
  assert.equal(deliveryZoneStatus(policy, { distance: 5000, postcode: '4610' }), 'excluded')
  assert.equal(deliveryZoneStatus(policy, { distance: 5000, postcode: ' 4610 ' }), 'excluded')
})

test('distance at or beyond the zone is too far', () => {
  assert.equal(deliveryZoneStatus(policy, { distance: 9000, postcode: '4000' }), 'tooFar')
  assert.equal(deliveryZoneStatus(policy, { distance: 12000, postcode: '4000' }), 'tooFar')
})

test('excluded is reported in preference to too far; a missing distance counts as 0', () => {
  assert.equal(deliveryZoneStatus(policy, { distance: 20000, postcode: '4610' }), 'excluded')
  assert.equal(deliveryZoneStatus(policy, { postcode: '4000' }), 'ok')
})

test('the default fee grid: free under 3 km, +1 EUR per km, out of zone from 9 km', () => {
  const fee = (meters) => deliveryFeeCentsForDistance(policy, meters)
  assert.equal(fee(0), 0)
  assert.equal(fee(2999), 0)
  // On a bound, the next tier
  assert.equal(fee(3000), 100)
  assert.equal(fee(3999), 100)
  assert.equal(fee(4000), 200)
  assert.equal(fee(8999), 600)
  assert.equal(fee(9000), OUT_OF_ZONE)
  assert.equal(fee(15000), OUT_OF_ZONE)
})

test('a different policy drives the zone, the grid and the excluded postcodes', () => {
  const other = orderingPolicyFromApi({
    deliveryMaxDistanceKm: 6,
    deliveryFeeTiers: [
      { upToKm: 2, fee: '0.00' },
      { upToKm: 6, fee: '3.50' },
    ],
    excludedPostcodes: ['4000', '4020'],
  })
  assert.equal(deliveryFeeCentsForDistance(other, 1999), 0)
  assert.equal(deliveryFeeCentsForDistance(other, 2000), 350)
  assert.equal(deliveryFeeCentsForDistance(other, 5999), 350)
  assert.equal(deliveryFeeCentsForDistance(other, 6000), OUT_OF_ZONE)
  assert.equal(deliveryZoneStatus(other, { distance: 7000, postcode: '4100' }), 'tooFar')
  assert.equal(deliveryZoneStatus(other, { distance: 1000, postcode: '4000' }), 'excluded')
  // The postcode 4610 is only excluded by the default policy.
  assert.equal(deliveryZoneStatus(other, { distance: 1000, postcode: '4610' }), 'ok')
  assert.equal(isExcludedPostcode(other, '4020'), true)
})

test('a distance past the last tier is out of zone even when the radius is larger (as the backend)', () => {
  const gap = orderingPolicyFromApi({
    deliveryMaxDistanceKm: 10,
    deliveryFeeTiers: [{ upToKm: 5, fee: '1.00' }],
  })
  assert.equal(deliveryFeeCentsForDistance(gap, 7000), OUT_OF_ZONE)
})

test('an excluded postcode matches once trimmed', () => {
  const excluding = { ...policy, excludedPostcodes: ['4020'] }
  assert.equal(isExcludedPostcode(excluding, ' 4020 '), true)
  assert.equal(isExcludedPostcode(excluding, '4000'), false)
})

test('a missing postcode is never excluded', () => {
  assert.equal(isExcludedPostcode(policy, null), false)
  assert.equal(isExcludedPostcode(policy, undefined), false)
  assert.equal(isExcludedPostcode(policy, ''), false)
})
