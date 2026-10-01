// GqlError, the code -> i18n map and the Sentry filter.
// Run: `node --test layers/engine/utils/gqlErrors.test.mjs`.

import {
  GQL_ERROR_KEYS,
  GQL_KNOWN_CODES,
  describeCouponRefusal,
  describeGqlError,
} from './gqlErrors.ts'
import {
  GqlError,
  isAbortError,
  isReportableError,
  operationNameOf,
  toGqlError,
  unwrapGqlError,
} from './gqlError.ts'
import { existsSync, readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { test } from 'node:test'

const response = (code, message = 'raw backend text', extra = {}) =>
  new GqlError([{ message, path: ['createOrder'], extensions: { ...(code ? { code } : {}), ...extra } }], { operationName: 'CreateOrder' })

test('GqlError is a real Error carrying code, extensions, errors and operation', () => {
  const err = response('PRODUCT_NOT_FOUND', 'product Salmon not found', { productId: 'p1' })
  assert.ok(err instanceof Error)
  assert.ok(err instanceof GqlError)
  assert.equal(err.name, 'GqlError')
  assert.equal(err.code, 'PRODUCT_NOT_FOUND')
  assert.deepEqual(err.extensions, { code: 'PRODUCT_NOT_FOUND', productId: 'p1' })
  assert.equal(err.operationName, 'CreateOrder')
  assert.equal(err.errors.length, 1)
  assert.equal(err.message, 'product Salmon not found')
  assert.ok(err.stack?.includes('GqlError'))
  assert.ok(err.hasCode('PRODUCT_NOT_FOUND'))
})

test('an error without extensions has a null code (old backend)', () => {
  const err = response(null, 'product X not found')
  assert.equal(err.code, null)
})

test('transport failures become GqlErrors that keep the status and the cause', () => {
  const http = GqlError.fromTransport(Object.assign(new Error('502 Bad Gateway'), { status: 502 }), 'Menu')
  assert.equal(http.code, 'HTTP_ERROR')
  assert.equal(http.status, 502)
  assert.equal(http.operationName, 'Menu')
  assert.ok(http.cause instanceof Error)

  const offline = GqlError.fromTransport(new TypeError('Failed to fetch'))
  assert.equal(offline.code, 'NETWORK_ERROR')
  assert.equal(offline.status, null)
})

test('unwrapGqlError finds the error behind a NuxtError-style cause', () => {
  const inner = response('COUPON_INVALID')
  assert.equal(unwrapGqlError(inner), inner)
  assert.equal(unwrapGqlError(Object.assign(new Error('wrapped'), { cause: inner })), inner)
  assert.equal(unwrapGqlError(new Error('plain')), null)
  assert.equal(unwrapGqlError(null), null)
})

test('toGqlError turns the graphql-ws array into a GqlError', () => {
  const err = toGqlError([{ message: 'boom', extensions: { code: 'FORBIDDEN' } }])
  assert.ok(err instanceof GqlError)
  assert.equal(err.code, 'FORBIDDEN')
  assert.ok(toGqlError('x') instanceof Error)
})

test('operationNameOf', () => {
  assert.equal(operationNameOf('mutation CreateOrder($input: X!) { createOrder }'), 'CreateOrder')
  assert.equal(operationNameOf('query ValidateCoupon { a }'), 'ValidateCoupon')
  assert.equal(operationNameOf('{ me { id } }'), null)
})

test('every known code maps to a translated key, never to the raw message', () => {
  for (const code of GQL_KNOWN_CODES) {
    const described = describeGqlError(response(code, 'SHOULD NEVER BE SHOWN'))
    assert.ok(described?.key, `${code} has no key`)
    assert.ok(!JSON.stringify(described).includes('SHOULD NEVER'), `${code} leaks the message`)
  }
})

test('parameters of the backend flow into the message', () => {
  assert.deepEqual(describeGqlError(response('DELIVERY_MINIMUM_NOT_MET', 'x', { minimum: '30' })), {
    key: 'cart.minimumDelivery',
    params: { amount: 30 },
  })
  assert.deepEqual(describeGqlError(response('DELIVERY_MINIMUM_NOT_MET')).params, { amount: 25 })
  assert.deepEqual(describeGqlError(response('DELIVERY_OUT_OF_ZONE')).params, { distance: 9 })
})

test('an unknown code or a non GqlError has no specific message (the caller shows its generic one)', () => {
  assert.equal(describeGqlError(response('SOMETHING_NEW_FROM_A_NEWER_BACKEND', 'English text')), null)
  assert.equal(describeGqlError(new Error('plain')), null)
  assert.equal(describeGqlError(undefined), null)
})

test('transport errors: offline, rate limit, server error', () => {
  assert.equal(describeGqlError(GqlError.fromTransport(new TypeError('Failed to fetch'))).key, 'notify.errors.networkError')
  assert.equal(describeGqlError(GqlError.fromTransport({ status: 503, message: 'x' })).key, 'notify.errors.serverError')
  assert.equal(describeGqlError(GqlError.fromTransport({ status: 429, message: 'x' })).key, 'notify.errors.tooManyRequests')
  assert.equal(describeGqlError(GqlError.fromTransport({ status: 400, message: 'x' })), null)
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
    ['preferred ready time is no longer available — it is within the minimum preparation window', 'notify.errors.slotTooSoon'],
    ['product "Salmon" is only available for a weekday lunch slot', 'notify.errors.lunchOnlyRequiresLunchSlot'],
    ['product 1234 not found', 'notify.errors.productNotFound'],
    ['invalid number of selections for group Broth on product Ramen: expected between 1 and 1, got 0', 'notify.errors.selectionInvalid'],
    ['failed to create payment: mollie said no', 'notify.errors.paymentFailed'],
  ]
  for (const [message, key] of cases) {
    assert.equal(describeGqlError(response(null, message)).key, key, message)
  }
  // A code always wins over the text.
  assert.equal(describeGqlError(response('PAYMENT_FAILED', 'product 1 not found')).key, 'notify.errors.paymentFailed')
})

test('coupon refusals: code first, old-backend text second, generic last', () => {
  assert.equal(describeCouponRefusal({ valid: false, errorCode: 'COUPON_MIN_ORDER_NOT_MET', errorMessage: 'x' }).key, 'notify.errors.couponMinOrderNotMet')
  assert.equal(describeCouponRefusal({ valid: false, errorCode: 'COUPON_RATE_LIMITED' }).key, 'notify.errors.tooManyRequests')
  assert.equal(describeCouponRefusal({ valid: false, errorMessage: 'minimum order amount of 30 not met' }).key, 'notify.errors.couponMinOrderNotMet')
  assert.equal(describeCouponRefusal({ valid: false, errorMessage: 'too many attempts, please try again in a minute' }).key, 'notify.errors.tooManyRequests')
  assert.equal(describeCouponRefusal({ valid: false, errorMessage: 'invalid or expired coupon' }).key, 'coupon.invalid')
  assert.equal(describeCouponRefusal({ valid: false }).key, 'coupon.invalid')
  assert.equal(describeCouponRefusal({ valid: false, errorCode: 'NEW_UNKNOWN_CODE', errorMessage: 'English' }).key, 'coupon.invalid')
})

test('what Sentry gets: our faults only, never the customer’s input, offline or aborts', () => {
  assert.equal(isReportableError(response('PRODUCT_NOT_FOUND')), false)
  assert.equal(isReportableError(response('COUPON_ALREADY_ACTIVE')), false)
  assert.equal(isReportableError(response('UNAUTHENTICATED')), false)
  assert.equal(isReportableError(response('PAYMENT_FAILED')), true)
  assert.equal(isReportableError(response('ORDER_CREATE_FAILED')), true)
  assert.equal(isReportableError(response(null, 'something unexpected')), true)
  assert.equal(isReportableError(GqlError.fromTransport(new TypeError('Failed to fetch'))), false)
  assert.equal(isReportableError(GqlError.fromTransport({ status: 500, message: 'x' })), true)
  assert.equal(isReportableError(GqlError.fromTransport({ status: 404, message: 'x' })), false)
  assert.equal(isReportableError(new TypeError('x is not a function')), true)
  // REST failures: 4xx is the customer's input, 5xx is ours, a FetchError without status is offline.
  assert.equal(isReportableError(Object.assign(new Error('401'), { statusCode: 401 })), false)
  assert.equal(isReportableError(Object.assign(new Error('x'), { response: { status: 422 } })), false)
  assert.equal(isReportableError(Object.assign(new Error('x'), { status: 503 })), true)
  assert.equal(isReportableError(Object.assign(new Error('x'), { name: 'FetchError' })), false)
  const abort = Object.assign(new Error('aborted'), { name: 'AbortError' })
  assert.ok(isAbortError(abort))
  assert.equal(isReportableError(abort), false)
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
    const messages = flatten(JSON.parse(readFileSync(new URL(`../locales/${lang}.json`, import.meta.url), 'utf8')))
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
const goCodes = new URL('../../../../tsb-service/internal/api/graphql/apperr/codes.go', import.meta.url)
test('the code table covers every code of tsb-service apperr/codes.go', { skip: !existsSync(goCodes) }, () => {
  const source = readFileSync(goCodes, 'utf8')
  const codes = [...source.matchAll(/Code\w+\s+Code = "(?<code>[A-Z_]+)"/gu)].map((m) => m.groups.code)
  assert.ok(codes.length > 20, 'codes.go not parsed')
  const missing = codes.filter((code) => !GQL_KNOWN_CODES.includes(code))
  assert.deepEqual(missing, [], 'codes the backend sends that the web does not translate')
})
