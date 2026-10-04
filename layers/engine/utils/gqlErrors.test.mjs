// The code -> i18n map of utils/gqlErrors.ts (GqlError itself, the abort detection and the Sentry filter are in gqlError.test.ts).
// Run: `vp test run layers/engine/utils/gqlErrors.test.mjs`.

import { DEFAULT_ORDERING_POLICY, orderingPolicyFromApi } from './orderingPolicy.ts'
import {
  GQL_ERROR_KEYS,
  GQL_KNOWN_CODES,
  describeCouponRefusal,
  describeErrorCode,
  describeGqlError,
} from './gqlErrors.ts'
import { GqlError } from './gqlError.ts'
import { existsSync, readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { test } from 'vite-plus/test'

const POLICY = DEFAULT_ORDERING_POLICY

const response = (code, message = 'raw backend text', extra = {}) =>
  new GqlError(
    [{ message, path: ['createOrder'], extensions: { ...(code ? { code } : {}), ...extra } }],
    { operationName: 'CreateOrder' },
  )

test('every known code maps to a translated key, never to the raw message', () => {
  for (const code of GQL_KNOWN_CODES) {
    const described = describeGqlError(response(code, 'SHOULD NEVER BE SHOWN'), POLICY)
    assert.ok(described?.key, `${code} has no key`)
    assert.ok(!JSON.stringify(described).includes('SHOULD NEVER'), `${code} leaks the message`)
  }
})

test('parameters of the backend flow into the message', () => {
  assert.deepEqual(
    describeGqlError(response('DELIVERY_MINIMUM_NOT_MET', 'x', { minimum: '30' }), POLICY),
    {
      key: 'cart.minimumDelivery',
      params: { amount: 30 },
    },
  )
  assert.deepEqual(describeGqlError(response('DELIVERY_MINIMUM_NOT_MET'), POLICY).params, {
    amount: 25,
  })
  assert.deepEqual(describeGqlError(response('DELIVERY_OUT_OF_ZONE'), POLICY).params, {
    distance: 9,
  })
})

test('the delivery minimum and radius quoted come from the policy passed in, not from constants', () => {
  const served = orderingPolicyFromApi({
    deliveryMinimum: '30.00',
    deliveryMaxDistanceKm: 7.5,
    deliveryFeeTiers: [{ upToKm: 7.5, fee: '1.00' }],
  })
  assert.deepEqual(describeGqlError(response('DELIVERY_MINIMUM_NOT_MET'), served).params, {
    amount: 30,
  })
  assert.deepEqual(describeGqlError(response('DELIVERY_OUT_OF_ZONE'), served).params, {
    distance: 7.5,
  })
  // The backend's own figure still wins for the minimum.
  assert.deepEqual(
    describeGqlError(response('DELIVERY_MINIMUM_NOT_MET', 'x', { minimum: '35' }), served).params,
    { amount: 35 },
  )
  assert.deepEqual(describeErrorCode('DELIVERY_OUT_OF_ZONE', served), {
    key: 'notify.errors.deliveryAddressTooFar',
    params: { distance: 7.5 },
  })
})

test('a line-level error names the cart item when the caller knows it', () => {
  const err = response('PRODUCT_NOT_FOUND', 'product p1 not found', { productId: 'p1' })
  assert.deepEqual(describeGqlError(err, POLICY, { productName: 'Plateau 42 pièces' }), {
    key: 'notify.errors.productNotFoundNamed',
    params: { name: 'Plateau 42 pièces' },
  })
  assert.deepEqual(describeGqlError(err, POLICY), { key: 'notify.errors.productNotFound' })
  assert.deepEqual(describeErrorCode('PRODUCT_UNAVAILABLE', POLICY, { productName: 'Gyoza' }), {
    key: 'notify.errors.productUnavailableNamed',
    params: { name: 'Gyoza' },
  })
  assert.deepEqual(describeErrorCode('PRODUCT_UNAVAILABLE', POLICY), {
    key: 'notify.errors.productUnavailable',
  })
})

test('a bare code (an issue of a quote) is described like the error that carries it', () => {
  assert.deepEqual(describeErrorCode('DELIVERY_MINIMUM_NOT_MET', POLICY, { minimum: '30' }), {
    key: 'cart.minimumDelivery',
    params: { amount: 30 },
  })
  assert.deepEqual(describeErrorCode('PRICE_CHANGED', POLICY), {
    key: 'notify.errors.priceChanged',
  })
  assert.deepEqual(describeErrorCode('LUNCH_SLOT_REQUIRED', POLICY), {
    key: 'notify.errors.lunchOnlyRequiresLunchSlot',
  })
  assert.equal(describeErrorCode('SOMETHING_NEW', POLICY), null)
})

test('an unknown code or a non GqlError has no specific message (the caller shows its generic one)', () => {
  assert.equal(
    describeGqlError(response('SOMETHING_NEW_FROM_A_NEWER_BACKEND', 'English text'), POLICY),
    null,
  )
  assert.equal(describeGqlError(new Error('plain'), POLICY), null)
  assert.equal(describeGqlError(undefined, POLICY), null)
})

test('transport errors: offline, rate limit, server error', () => {
  assert.equal(
    describeGqlError(GqlError.fromTransport(new TypeError('Failed to fetch')), POLICY).key,
    'notify.errors.networkError',
  )
  assert.equal(
    describeGqlError(GqlError.fromTransport({ status: 503, message: 'x' }), POLICY).key,
    'notify.errors.serverError',
  )
  assert.equal(
    describeGqlError(GqlError.fromTransport({ status: 429, message: 'x' }), POLICY).key,
    'notify.errors.tooManyRequests',
  )
  assert.equal(
    describeGqlError(GqlError.fromTransport({ status: 400, message: 'x' }), POLICY),
    null,
  )
  // An HTTP error without a status, and a 4xx other than the throttle, say nothing specific.
  const http = (status) =>
    new GqlError([{ message: 'x', extensions: { code: 'HTTP_ERROR' } }], status ? { status } : {})
  assert.equal(describeGqlError(http(undefined), POLICY), null)
  assert.equal(describeGqlError(http(404), POLICY), null)
})

test('rollout fallback: an old backend sends English text without a code', () => {
  const cases = [
    ['minimum order amount for delivery is 25', 'cart.minimumDelivery'],
    ['ordering is currently unavailable', 'notify.errors.orderingUnavailable'],
    ['address not eligible for delivery: excluded area', 'notify.errors.deliveryAddressExcluded'],
    ['address too far for delivery', 'notify.errors.deliveryAddressTooFar'],
    ['you already have an active order using a coupon', 'notify.errors.couponAlreadyActive'],
    ['invalid coupon: invalid or expired coupon', 'coupon.invalid'],
    ['invalid coupon: minimum order amount of 30 not met', 'notify.errors.couponMinOrderNotMet'],
    [
      'preferred ready time is no longer available — it is within the minimum preparation window',
      'notify.errors.slotTooSoon',
    ],
    [
      'product "Salmon" is only available for a weekday lunch slot',
      'notify.errors.lunchOnlyRequiresLunchSlot',
    ],
    ['order must contain at least one item', 'notify.errors.cartEmpty'],
    ['product 1234 not found', 'notify.errors.productNotFound'],
    ['Product Maki Saumon not found', 'notify.errors.productNotFound'],
    ['choice Tomate not found', 'notify.errors.selectionInvalid'],
    ['Choice Spicy mayo not found', 'notify.errors.selectionInvalid'],
    ['Failed to create order: db down', 'notify.errors.orderCreationFailed'],
    [
      'invalid number of selections for group Broth on product Ramen: expected between 1 and 1, got 0',
      'notify.errors.selectionInvalid',
    ],
    ['failed to create payment: mollie said no', 'notify.errors.paymentFailed'],
  ]
  for (const [message, key] of cases) {
    assert.equal(describeGqlError(response(null, message), POLICY).key, key, message)
  }
  // A code always wins over the text.
  assert.equal(
    describeGqlError(response('PAYMENT_FAILED', 'product 1 not found'), POLICY).key,
    'notify.errors.paymentFailed',
  )
})

test('coupon refusals: code first, old-backend text second, generic last', () => {
  assert.equal(
    describeCouponRefusal(
      { valid: false, errorCode: 'COUPON_MIN_ORDER_NOT_MET', errorMessage: 'x' },
      POLICY,
    ).key,
    'notify.errors.couponMinOrderNotMet',
  )
  assert.equal(
    describeCouponRefusal({ valid: false, errorCode: 'COUPON_RATE_LIMITED' }, POLICY).key,
    'notify.errors.tooManyRequests',
  )
  assert.equal(
    describeCouponRefusal(
      { valid: false, errorMessage: 'minimum order amount of 30 not met' },
      POLICY,
    ).key,
    'notify.errors.couponMinOrderNotMet',
  )
  assert.equal(
    describeCouponRefusal(
      { valid: false, errorMessage: 'too many attempts, please try again in a minute' },
      POLICY,
    ).key,
    'notify.errors.tooManyRequests',
  )
  assert.equal(
    describeCouponRefusal({ valid: false, errorMessage: 'invalid or expired coupon' }, POLICY).key,
    'coupon.invalid',
  )
  assert.equal(describeCouponRefusal({ valid: false }, POLICY).key, 'coupon.invalid')
  assert.equal(
    describeCouponRefusal(
      { valid: false, errorCode: 'NEW_UNKNOWN_CODE', errorMessage: 'English' },
      POLICY,
    ).key,
    'coupon.invalid',
  )
})

test('RATE_LIMITED and COUPON_CHECK_FAILED have messages; the throttle is not an error to report', () => {
  assert.equal(
    describeGqlError(response('RATE_LIMITED'), POLICY).key,
    'notify.errors.tooManyRequests',
  )
  assert.equal(
    describeGqlError(response('COUPON_CHECK_FAILED'), POLICY).key,
    'notify.errors.couponCheckFailed',
  )
  assert.equal(
    describeCouponRefusal({ valid: false, errorCode: 'COUPON_CHECK_FAILED' }, POLICY).key,
    'notify.errors.couponCheckFailed',
  )
})

// ---------------------------------------------------------------------------------------------
// Locales: every key the table can produce exists in all four languages.
// ---------------------------------------------------------------------------------------------
const flatten = (node, prefix = '', out = {}) => {
  for (const [k, v] of Object.entries(node)) {
    const full = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object') flatten(v, full, out)
    else out[full] = v
  }
  return out
}

for (const lang of ['fr', 'en', 'nl', 'zh']) {
  test(`every error message key exists in the ${lang} locale`, () => {
    const messages = flatten(
      JSON.parse(readFileSync(new URL(`../locales/${lang}.json`, import.meta.url), 'utf8')),
    )
    for (const key of GQL_ERROR_KEYS) {
      assert.equal(typeof messages[key], 'string', `${lang}: missing ${key}`)
      assert.notEqual(messages[key].trim(), '', `${lang}: empty ${key}`)
    }
  })
}

// ---------------------------------------------------------------------------------------------
// Parity with the backend: every code of tsb-service's apperr/codes.go is known here.
// Only runs in the workspace layout (tsb-core next to tsb-service), skipped in a lone checkout.
// ---------------------------------------------------------------------------------------------
// Codes only the dashboard's assistant can raise: the customer app never calls that API, so they have no
// Customer message on purpose (a translation here would be dead copy).
const DASHBOARD_ONLY_CODES = ['ASSISTANT_DISABLED', 'ASSISTANT_UNAVAILABLE']
const goCodes = new URL(
  '../../../../tsb-service/internal/api/graphql/apperr/codes.go',
  import.meta.url,
)
test(
  'the code table covers every code of tsb-service apperr/codes.go',
  { skip: !existsSync(goCodes) },
  () => {
    const source = readFileSync(goCodes, 'utf8')
    const codes = [...source.matchAll(/Code\w+\s+Code = "(?<code>[A-Z_]+)"/gu)].map(
      (m) => m.groups.code,
    )
    assert.ok(codes.length > 20, 'codes.go not parsed')
    const missing = codes.filter(
      (code) => !GQL_KNOWN_CODES.includes(code) && !DASHBOARD_ONLY_CODES.includes(code),
    )
    assert.deepEqual(missing, [], 'codes the backend sends that the web does not translate')
  },
)
