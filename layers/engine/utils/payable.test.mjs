// Mirrors the backend total: `tsb-service/internal/modules/order/infrastructure/repository.go`
// (CreateOrder) and `internal/api/graphql/resolver/order.go` (discount clamp).
// Run: `vp test run layers/engine/utils/payable.test.mjs`.

import { amountToMinimumCents, computePayableCents, pickupDiscountCents } from './payable.ts'
import assert from 'node:assert/strict'
import { DEFAULT_ORDERING_POLICY as policy } from './orderingPolicy.ts'
import { roundCentsToNearest10 } from './money.ts'
import { test } from 'vite-plus/test'

const step = { roundingStepCents: policy.totalRoundingStepCents }

test('roundCentsToNearest10 matches the euro helper rule', () => {
  const cases = [
    [2440, 2440],
    [2441, 2440],
    [2444, 2440],
    [2445, 2450],
    [2449, 2450],
    [1295, 1300],
    [9995, 10000],
    [0, 0],
    [3, 0],
    [-268, -270],
    [-1, 0],
  ]
  for (const [input, expected] of cases) {
    assert.strictEqual(roundCentsToNearest10(input), expected, `round(${input})`)
  }
})

test('pickup, no discount, cash: just the subtotal', () => {
  assert.strictEqual(computePayableCents({ subtotalCents: 1850, ...step }), 1850)
})

test('pickup with the 10% discount, online fee on top', () => {
  // 50.00 − 5.00 + 0.30 = 45.30
  assert.strictEqual(
    computePayableCents({
      subtotalCents: 5000,
      pickupDiscountCents: 500,
      onlineFeeCents: 30,
      ...step,
    }),
    4530,
  )
})

test('delivery adds the fee, and the online fee on top of it', () => {
  // 30.00 + 3.00 + 0.30 = 33.30
  assert.strictEqual(
    computePayableCents({
      subtotalCents: 3000,
      deliveryFeeCents: 300,
      onlineFeeCents: 30,
      ...step,
    }),
    3330,
  )
  // Cash: no online fee
  assert.strictEqual(
    computePayableCents({ subtotalCents: 3000, deliveryFeeCents: 300, ...step }),
    3300,
  )
})

test('delivery fee still unknown (or out of zone, -1 mapped to 0) counts as 0', () => {
  assert.strictEqual(
    computePayableCents({ subtotalCents: 3000, onlineFeeCents: 30, ...step }),
    3030,
  )
  assert.strictEqual(
    computePayableCents({ subtotalCents: 3000, deliveryFeeCents: -100, ...step }),
    3000,
  )
})

test('coupon stacks with the pickup discount', () => {
  // 40.00 − 4.00 − 5.00 + 0.30 = 31.30
  assert.strictEqual(
    computePayableCents({
      subtotalCents: 4000,
      pickupDiscountCents: 400,
      couponDiscountCents: 500,
      onlineFeeCents: 30,
      ...step,
    }),
    3130,
  )
})

test('a coupon larger than the basket leaves exactly the online fee, never less', () => {
  assert.strictEqual(
    computePayableCents({
      subtotalCents: 800,
      couponDiscountCents: 2000,
      onlineFeeCents: 30,
      ...step,
    }),
    30,
  )
  // A cash order fully covered by the coupon is free
  assert.strictEqual(
    computePayableCents({ subtotalCents: 800, couponDiscountCents: 2000, ...step }),
    0,
  )
})

test('the discount may eat the delivery fee too (backend clamps against subtotal + fee)', () => {
  // 25.00 + 2.00 = 27.00 total, coupon 30.00 → clamped to 0, + 0.30
  assert.strictEqual(
    computePayableCents({
      subtotalCents: 2500,
      deliveryFeeCents: 200,
      couponDiscountCents: 3000,
      onlineFeeCents: 30,
      ...step,
    }),
    30,
  )
})

test('the total is snapped to 0,10 € like the backend (.x5 ties go up)', () => {
  assert.strictEqual(computePayableCents({ subtotalCents: 1245, ...step }), 1250)
  assert.strictEqual(
    computePayableCents({ subtotalCents: 1242, onlineFeeCents: 30, ...step }),
    1270,
  )
})

test('discounts are snapped individually before they are subtracted', () => {
  // A raw 4.55 coupon → 4.60 (tie up), as the backend does with money.RoundToNearest10Cents
  assert.strictEqual(
    computePayableCents({ subtotalCents: 3000, couponDiscountCents: 455, ...step }),
    2540,
  )
})

test('amountToMinimumCents', () => {
  assert.strictEqual(amountToMinimumCents(1800, 2500), 700)
  assert.strictEqual(amountToMinimumCents(2500, 2500), 0)
  assert.strictEqual(amountToMinimumCents(4000, 2500), 0)
})

test('pickupDiscountCents: below 20 € there is no discount, from 20 € it is 10 % rounded to 0,10 €', () => {
  const line = (totalCents, isDiscountable = true) => ({ totalCents, isDiscountable })
  assert.strictEqual(pickupDiscountCents([line(1995)], 1995, policy), 0)
  assert.strictEqual(pickupDiscountCents([line(2000)], 2000, policy), 200)
  assert.strictEqual(pickupDiscountCents([line(5000)], 5000, policy), 500)
  assert.strictEqual(pickupDiscountCents([], 0, policy), 0)
})

test('pickupDiscountCents: only discountable lines count, but the threshold uses the whole basket', () => {
  const line = (totalCents, isDiscountable) => ({ totalCents, isDiscountable })
  // 15 € discountable + 10 € not: basket 25 € reaches the threshold, discount = 10 % of 15 € = 1,50 €
  assert.strictEqual(pickupDiscountCents([line(1500, true), line(1000, false)], 2500, policy), 150)
  // Discountable part alone is under 20 € but the basket is over: still discounted.
  assert.strictEqual(pickupDiscountCents([line(1000, true), line(1500, false)], 2500, policy), 100)
  // Basket under 20 €: nothing, whatever is discountable.
  assert.strictEqual(pickupDiscountCents([line(1900, true)], 1900, policy), 0)
})

test('pickupDiscountCents: 160,45 € gives 16,10 € like the backend (the float maths gave 16,00 €)', () => {
  assert.strictEqual(
    pickupDiscountCents([{ totalCents: 16045, isDiscountable: true }], 16045, policy),
    1610,
  )
  // The same basket split over several lines (the backend sums 10 % of each line exactly).
  assert.strictEqual(
    pickupDiscountCents(
      [
        { totalCents: 8000, isDiscountable: true },
        { totalCents: 8045, isDiscountable: true },
      ],
      16045,
      policy,
    ),
    1610,
  )
  // 10 % of 24,42 € = 2,442 € -> 2,44 -> 2,40 ; 24,45 € -> 2,445 -> 2,45 (half up) -> 2,50 (tie to the restaurant).
  assert.strictEqual(
    pickupDiscountCents([{ totalCents: 2442, isDiscountable: true }], 2442, policy),
    240,
  )
  assert.strictEqual(
    pickupDiscountCents([{ totalCents: 2445, isDiscountable: true }], 2445, policy),
    250,
  )
})
