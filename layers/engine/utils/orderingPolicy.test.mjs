// The ordering policy the backend serves (RestaurantConfig.policy) and what the web derives from it.
// Run: `node --test layers/engine/utils/orderingPolicy.test.mjs`.

import {
  DEFAULT_ORDERING_POLICY,
  deliveryFeeRows,
  deliveryMaxKm,
  isPolicyUnsupportedError,
  orderingPolicyFromApi,
  pickupDiscountPercent,
} from './orderingPolicy.ts'
import { GqlError } from './gqlError.ts'
import assert from 'node:assert/strict'
import { computeCartTotals } from './cartTotals.ts'
import { test } from 'node:test'

// What tsb-service answers today (DefaultOrderingPolicy in restaurant/domain/policy.go).
const SERVED_TODAY = {
  deliveryEnabled: true,
  deliveryMinimum: '25.00',
  deliveryMaxDistanceKm: 9,
  deliveryFeeTiers: [3, 4, 5, 6, 7, 8, 9].map((upToKm, index) => ({ upToKm, fee: `${index}.00` })),
  excludedPostcodes: ['4610'],
  pickupDiscountRate: 0.1,
  pickupDiscountMinimum: '20.00',
  onlinePaymentFee: '0.30',
  totalRoundingStep: '0.10',
  slotIntervalMinutes: 15,
  minimumPreparationMinutes: 15,
}

test('what the backend serves today maps to the fallback, so nothing changes for the customer', () => {
  assert.deepEqual(orderingPolicyFromApi(SERVED_TODAY), DEFAULT_ORDERING_POLICY)
})

test('decimal strings become cents, km become meters, the rate becomes basis points', () => {
  const policy = orderingPolicyFromApi({
    ...SERVED_TODAY,
    deliveryMinimum: '30.00',
    onlinePaymentFee: '0.45',
    pickupDiscountMinimum: '17.50',
    totalRoundingStep: '0.05',
    pickupDiscountRate: 0.075,
    deliveryMaxDistanceKm: 7.5,
    slotIntervalMinutes: 10,
    minimumPreparationMinutes: 20,
  })
  assert.equal(policy.deliveryMinimumCents, 3000)
  assert.equal(policy.onlinePaymentFeeCents, 45)
  assert.equal(policy.pickupDiscountMinimumCents, 1750)
  assert.equal(policy.totalRoundingStepCents, 5)
  assert.equal(policy.pickupDiscountRateBp, 750)
  assert.equal(policy.deliveryMaxMeters, 7500)
  assert.equal(policy.slotIntervalMinutes, 10)
  assert.equal(policy.minimumPreparationMinutes, 20)
  // 0.1 + 0.2 style floats do not leak into the cents.
  assert.equal(orderingPolicyFromApi({ ...SERVED_TODAY, deliveryMinimum: '19.99' }).deliveryMinimumCents, 1999)
})

test('fee tiers are sorted, in meters and cents; a missing or empty list falls back', () => {
  const policy = orderingPolicyFromApi({
    ...SERVED_TODAY,
    deliveryFeeTiers: [{ upToKm: 5, fee: '2.50' }, { upToKm: 2, fee: '0.00' }],
    deliveryMaxDistanceKm: 5,
  })
  assert.deepEqual(policy.deliveryFeeTiers, [{ upToMeters: 2000, feeCents: 0 }, { upToMeters: 5000, feeCents: 250 }])
  assert.deepEqual(orderingPolicyFromApi({ ...SERVED_TODAY, deliveryFeeTiers: [] }).deliveryFeeTiers, DEFAULT_ORDERING_POLICY.deliveryFeeTiers)
  assert.deepEqual(orderingPolicyFromApi({ deliveryEnabled: false }).deliveryFeeTiers, DEFAULT_ORDERING_POLICY.deliveryFeeTiers)
})

test('an old backend (no policy) gets the fallback; a partial or malformed answer falls back field by field', () => {
  assert.equal(orderingPolicyFromApi(undefined), DEFAULT_ORDERING_POLICY)
  assert.equal(orderingPolicyFromApi(null), DEFAULT_ORDERING_POLICY)
  const partial = orderingPolicyFromApi({ deliveryEnabled: false, deliveryMinimum: 'abc', onlinePaymentFee: '', slotIntervalMinutes: -3 })
  assert.equal(partial.deliveryEnabled, false)
  assert.equal(partial.deliveryMinimumCents, 2500)
  assert.equal(partial.onlinePaymentFeeCents, 30)
  assert.equal(partial.slotIntervalMinutes, 15)
  assert.deepEqual(partial.excludedPostcodes, ['4610'])
})

test('a malformed fee tier never becomes a free delivery: the whole grid falls back', () => {
  const grid = (deliveryFeeTiers) => orderingPolicyFromApi({ ...SERVED_TODAY, deliveryFeeTiers }).deliveryFeeTiers
  for (const bad of [
    [{ upToKm: 3, fee: '0.00' }, { upToKm: 5, fee: 'abc' }],
    [{ upToKm: 3, fee: '' }, { upToKm: 5, fee: '2.00' }],
    [{ upToKm: 3, fee: '-1.00' }, { upToKm: 5, fee: '2.00' }],
    [{ upToKm: 3, fee: null }, { upToKm: 5, fee: '2.00' }],
    [{ upToKm: 0, fee: '1.00' }, { upToKm: 5, fee: '2.00' }],
    [{ upToKm: 'x', fee: '1.00' }, { upToKm: 5, fee: '2.00' }],
  ]) assert.deepEqual(grid(bad), DEFAULT_ORDERING_POLICY.deliveryFeeTiers, JSON.stringify(bad))
  // A well-formed free tier is still free.
  assert.deepEqual(grid([{ upToKm: 3, fee: '0.00' }, { upToKm: 5, fee: '2.00' }]), [{ upToMeters: 3000, feeCents: 0 }, { upToMeters: 5000, feeCents: 200 }])
})

test('a pickup discount outside [0, 1] is malformed and falls back to the default, the preparation floor is taken as served', () => {
  const def = DEFAULT_ORDERING_POLICY.pickupDiscountRateBp
  assert.equal(orderingPolicyFromApi({ ...SERVED_TODAY, pickupDiscountRate: 5 }).pickupDiscountRateBp, def)
  assert.equal(orderingPolicyFromApi({ ...SERVED_TODAY, pickupDiscountRate: 1.0001 }).pickupDiscountRateBp, def)
  assert.equal(orderingPolicyFromApi({ ...SERVED_TODAY, pickupDiscountRate: Number.NaN }).pickupDiscountRateBp, def)
  assert.equal(orderingPolicyFromApi({ ...SERVED_TODAY, pickupDiscountRate: Number.POSITIVE_INFINITY }).pickupDiscountRateBp, def)
  assert.equal(orderingPolicyFromApi({ ...SERVED_TODAY, pickupDiscountRate: 1 }).pickupDiscountRateBp, 10_000)
  assert.equal(orderingPolicyFromApi({ ...SERVED_TODAY, pickupDiscountRate: 0 }).pickupDiscountRateBp, 0)
  assert.equal(orderingPolicyFromApi({ ...SERVED_TODAY, pickupDiscountRate: -0.1 }).pickupDiscountRateBp, 1000)
  assert.equal(orderingPolicyFromApi({ ...SERVED_TODAY, minimumPreparationMinutes: 0 }).minimumPreparationMinutes, 0)
  assert.equal(orderingPolicyFromApi({ ...SERVED_TODAY, minimumPreparationMinutes: 20 }).minimumPreparationMinutes, 20)
  assert.equal(orderingPolicyFromApi({ ...SERVED_TODAY, minimumPreparationMinutes: -1 }).minimumPreparationMinutes, 15)
  assert.equal(orderingPolicyFromApi({ ...SERVED_TODAY, minimumPreparationMinutes: null }).minimumPreparationMinutes, 15)
})

test('the policy handed out never shares an array with the frozen default', () => {
  const policy = orderingPolicyFromApi({ deliveryEnabled: true })
  assert.notEqual(policy.deliveryFeeTiers, DEFAULT_ORDERING_POLICY.deliveryFeeTiers)
  assert.notEqual(policy.excludedPostcodes, DEFAULT_ORDERING_POLICY.excludedPostcodes)
  policy.deliveryFeeTiers.push({ upToMeters: 1, feeCents: 1 })
  policy.excludedPostcodes.push('0000')
  assert.equal(DEFAULT_ORDERING_POLICY.deliveryFeeTiers.length, 7)
  assert.deepEqual(DEFAULT_ORDERING_POLICY.excludedPostcodes, ['4610'])
})

test('the fallback is frozen and has exactly today\'s constants', () => {
  assert.equal(Object.isFrozen(DEFAULT_ORDERING_POLICY), true)
  assert.equal(Object.isFrozen(DEFAULT_ORDERING_POLICY.deliveryFeeTiers), true)
  assert.equal(Object.isFrozen(DEFAULT_ORDERING_POLICY.deliveryFeeTiers[0]), true)
  assert.equal(Object.isFrozen(DEFAULT_ORDERING_POLICY.excludedPostcodes), true)
  assert.equal(DEFAULT_ORDERING_POLICY.deliveryMinimumCents, 2500)
  assert.equal(DEFAULT_ORDERING_POLICY.onlinePaymentFeeCents, 30)
  assert.equal(DEFAULT_ORDERING_POLICY.pickupDiscountMinimumCents, 2000)
  assert.equal(DEFAULT_ORDERING_POLICY.pickupDiscountRateBp, 1000)
  assert.equal(DEFAULT_ORDERING_POLICY.deliveryMaxMeters, 9000)
})

test('labels: the discount percentage and fold, the radius, the fee rows', () => {
  assert.equal(pickupDiscountPercent(DEFAULT_ORDERING_POLICY), 10)
  assert.equal(pickupDiscountPercent(orderingPolicyFromApi({ ...SERVED_TODAY, pickupDiscountRate: 0.075 })), 7.5)
  assert.equal(deliveryMaxKm(DEFAULT_ORDERING_POLICY), 9)
  const rows = deliveryFeeRows(DEFAULT_ORDERING_POLICY)
  assert.equal(rows.length, 7)
  assert.deepEqual(rows[0], { fromKm: null, toKm: 3, feeCents: 0 })
  assert.deepEqual(rows[6], { fromKm: 8, toKm: 9, feeCents: 600 })
  // A tier beyond the radius is not listed.
  const short = orderingPolicyFromApi({ ...SERVED_TODAY, deliveryMaxDistanceKm: 4 })
  assert.deepEqual(deliveryFeeRows(short).map((row) => row.toKm), [3, 4])
})

test('an old backend is recognised by the validation error that names `policy`', () => {
  const validation = (message) => new GqlError([{ message, extensions: { code: 'GRAPHQL_VALIDATION_FAILED' } }])
  assert.equal(isPolicyUnsupportedError(validation('Cannot query field "policy" on type "RestaurantConfig".')), true)
  assert.equal(isPolicyUnsupportedError(validation('Cannot query field "foo" on type "RestaurantConfig".')), false)
  assert.equal(isPolicyUnsupportedError(new GqlError([{ message: 'policy', extensions: { code: 'INTERNAL_SERVER_ERROR' } }])), false)
  // The useAsyncData composable wraps what the handler throws.
  assert.equal(isPolicyUnsupportedError(Object.assign(new Error('wrapped'), { cause: validation('Cannot query field "policy"') })), true)
  assert.equal(isPolicyUnsupportedError(new Error('network')), false)
})

// ---- The cart maths follows the policy -------------------------------------------------------------------------

const lines = (cents, isDiscountable = true) => [{ quantity: 1, product: { price: (cents / 100).toFixed(2), isDiscountable, choices: [] }, selectedChoices: [] }]
const other = orderingPolicyFromApi({
  ...SERVED_TODAY,
  deliveryMinimum: '30.00',
  deliveryMaxDistanceKm: 6,
  deliveryFeeTiers: [{ upToKm: 2, fee: '1.50' }, { upToKm: 6, fee: '4.00' }],
  excludedPostcodes: ['4000'],
  pickupDiscountRate: 0.2,
  pickupDiscountMinimum: '40.00',
  onlinePaymentFee: '0.50',
})

test('delivery minimum, fee grid and zone come from the policy', () => {
  const delivery = (cents, distance, { postcode = '4020', usedPolicy = other } = {}) => computeCartTotals({
    lines: lines(cents), collectionOption: 'DELIVERY', address: { distance, postcode }, paymentOption: 'CASH', policy: usedPolicy,
  })
  // 27 EUR: enough under the default minimum (25), not under 30.
  assert.equal(delivery(2700, 1000, { usedPolicy: DEFAULT_ORDERING_POLICY }).isMinimumReached, true)
  const short = delivery(2700, 1000)
  assert.equal(short.isMinimumReached, false)
  assert.equal(short.amountToDeliveryMinimumCents, 300)
  // Tiers: 1 km pays 1,50 EUR, 3 km pays 4 EUR (the default grid says 0 and 1 EUR), 6 km is out of zone.
  assert.equal(delivery(3500, 1000).deliveryFeeCents, 150)
  assert.equal(delivery(3500, 3000).deliveryFeeCents, 400)
  assert.equal(delivery(3500, 6000).deliveryFeeCents, -1)
  assert.equal(delivery(3500, 3000, { postcode: '4000' }).deliveryFeeCents, -1, 'the policy\'s excluded postcode')
  assert.equal(delivery(3500, 3000, { postcode: '4610' }).deliveryFeeCents, 400, '4610 is not excluded by this policy')
  // 35 + 4 delivery = 39 -> 39,00 (cash)
  assert.equal(delivery(3500, 3000).payableCents, 3900)
})

test('pickup discount (rate and threshold) and the online fee come from the policy', () => {
  const pickup = (cents, policy, paymentOption = 'CASH') => computeCartTotals({ lines: lines(cents), collectionOption: 'PICKUP', paymentOption, policy })
  // 30 EUR: discounted by default (>= 20, 10 %), not by this policy (threshold 40).
  assert.equal(pickup(3000, DEFAULT_ORDERING_POLICY).pickupDiscountCents, 300)
  assert.equal(pickup(3000, other).pickupDiscountCents, 0)
  // 50 EUR at 20 %: 10 EUR.
  assert.equal(pickup(5000, other).pickupDiscountCents, 1000)
  // Online fee 0,50: 50 - 10 + 0,50 = 40,50
  const online = pickup(5000, other, 'ONLINE')
  assert.equal(online.onlineFeeCents, 50)
  assert.equal(online.payableCents, 4050)
  // Non-discountable products never count towards the discount, but they do reach the threshold.
  const mixed = computeCartTotals({
    lines: [...lines(3000, false), ...lines(2000, true)], collectionOption: 'PICKUP', paymentOption: 'CASH', policy: other,
  })
  assert.equal(mixed.pickupDiscountCents, 400)
})

test('the rounding step comes from the policy', () => {
  const rounded = orderingPolicyFromApi({ ...SERVED_TODAY, totalRoundingStep: '0.05' })
  const totals = computeCartTotals({ lines: lines(1243), collectionOption: 'PICKUP', paymentOption: 'CASH', policy: rounded })
  assert.equal(totals.payableCents, 1245)
  const standard = computeCartTotals({ lines: lines(1243), collectionOption: 'PICKUP', paymentOption: 'CASH', policy: DEFAULT_ORDERING_POLICY })
  assert.equal(standard.payableCents, 1240)
})
