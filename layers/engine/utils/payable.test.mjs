// Mirrors the backend total: `tsb-service/internal/modules/order/infrastructure/repository.go`
// (CreateOrder) and `internal/api/graphql/resolver/order.go` (discount clamp).
// Run: `node --test layers/engine/utils/payable.test.mjs`.

import { amountToMinimumCents, computePayableCents } from './payable.ts'
import assert from 'node:assert/strict'
import { roundCentsToNearest10 } from './money.ts'
import { test } from 'node:test'

test('roundCentsToNearest10 matches the euro helper rule', () => {
  const cases = [
    [2440, 2440], [2441, 2440], [2444, 2440], [2445, 2450], [2449, 2450],
    [1295, 1300], [9995, 10000], [0, 0], [3, 0], [-268, -270], [-1, 0],
  ]
  for (const [input, expected] of cases) {
    assert.strictEqual(roundCentsToNearest10(input), expected, `round(${input})`)
  }
})

test('pickup, no discount, cash: just the subtotal', () => {
  assert.strictEqual(computePayableCents({ subtotalCents: 1850 }), 1850)
})

test('pickup with the 10% discount, online fee on top', () => {
  // 50.00 − 5.00 + 0.30 = 45.30
  assert.strictEqual(
    computePayableCents({ subtotalCents: 5000, pickupDiscountCents: 500, onlineFeeCents: 30 }),
    4530,
  )
})

test('delivery adds the fee, and the online fee on top of it', () => {
  // 30.00 + 3.00 + 0.30 = 33.30
  assert.strictEqual(
    computePayableCents({ subtotalCents: 3000, deliveryFeeCents: 300, onlineFeeCents: 30 }),
    3330,
  )
  // Cash: no online fee
  assert.strictEqual(computePayableCents({ subtotalCents: 3000, deliveryFeeCents: 300 }), 3300)
})

test('delivery fee still unknown (or out of zone, -1 mapped to 0) counts as 0', () => {
  assert.strictEqual(computePayableCents({ subtotalCents: 3000, onlineFeeCents: 30 }), 3030)
  assert.strictEqual(computePayableCents({ subtotalCents: 3000, deliveryFeeCents: -100 }), 3000)
})

test('coupon stacks with the pickup discount', () => {
  // 40.00 − 4.00 − 5.00 + 0.30 = 31.30
  assert.strictEqual(
    computePayableCents({ subtotalCents: 4000, pickupDiscountCents: 400, couponDiscountCents: 500, onlineFeeCents: 30 }),
    3130,
  )
})

test('a coupon larger than the basket leaves exactly the online fee, never less', () => {
  assert.strictEqual(
    computePayableCents({ subtotalCents: 800, couponDiscountCents: 2000, onlineFeeCents: 30 }),
    30,
  )
  // A cash order fully covered by the coupon is free
  assert.strictEqual(computePayableCents({ subtotalCents: 800, couponDiscountCents: 2000 }), 0)
})

test('the discount may eat the delivery fee too (backend clamps against subtotal + fee)', () => {
  // 25.00 + 2.00 = 27.00 total, coupon 30.00 → clamped to 0, + 0.30
  assert.strictEqual(
    computePayableCents({ subtotalCents: 2500, deliveryFeeCents: 200, couponDiscountCents: 3000, onlineFeeCents: 30 }),
    30,
  )
})

test('the total is snapped to 0,10 € like the backend (.x5 ties go up)', () => {
  assert.strictEqual(computePayableCents({ subtotalCents: 1245 }), 1250)
  assert.strictEqual(computePayableCents({ subtotalCents: 1242, onlineFeeCents: 30 }), 1270)
})

test('discounts are snapped individually before they are subtracted', () => {
  // A raw 4.55 coupon → 4.60 (tie up), as the backend does with money.RoundToNearest10Cents
  assert.strictEqual(computePayableCents({ subtotalCents: 3000, couponDiscountCents: 455 }), 2540)
})

test('amountToMinimumCents', () => {
  assert.strictEqual(amountToMinimumCents(1800, 2500), 700)
  assert.strictEqual(amountToMinimumCents(2500, 2500), 0)
  assert.strictEqual(amountToMinimumCents(4000, 2500), 0)
})
