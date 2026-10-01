// The pure side of the server quote: totals, blocking, coupon verdict, line issues by key.
// Run: `node --test layers/engine/utils/orderQuote.test.mjs`.

import {
  blockingOrderIssues,
  couponVerdict,
  hasLineIssues,
  isQuoteBlocking,
  isQuoteUnsupportedError,
  isQuoteUsableForTotals,
  lineIssuesByKey,
  quoteLineByKey,
  quoteRequestKey,
  recheckQuote,
  totalsFromQuote,
} from './orderQuote.ts'
import { GqlError } from './gqlError.ts'
import assert from 'node:assert/strict'
import { buildQuoteInput } from './orderPayload.ts'
import { computeCartTotals } from './cartTotals.ts'
import { test } from 'node:test'

const line = (overrides = {}) => ({
  productId: 'p1', quantity: 1, selections: [], productPrice: '12.50', unitPrice: '12.50', lineTotal: '12.50', issues: [], ...overrides,
})
const quote = (overrides = {}) => ({
  lines: [line()], subtotal: '12.50', deliveryFee: '0.00', pickupDiscount: '0.00', couponDiscount: '0.00',
  onlineFee: '0.00', total: '12.50', coupon: null, issues: [], ...overrides,
})

test('totals: the server numbers in the shape every cart surface reads', () => {
  const totals = totalsFromQuote(quote({
    subtotal: '28.50', pickupDiscount: '2.50', couponDiscount: '2.90', onlineFee: '0.30', total: '23.40',
  }), 'PICKUP')
  assert.deepEqual(totals, {
    subtotalCents: 2850, pickupDiscountCents: 250, deliveryFeeCents: 0, couponDiscountCents: 290, onlineFeeCents: 30,
    payableCents: 2340, hasBreakdown: true, isMinimumReached: true, amountToDeliveryMinimumCents: 0,
  })
})

test('totals agree with the client maths on a cart both can price', () => {
  const lines = [
    { quantity: 2, product: { price: '12.50', isDiscountable: true, choices: [] }, selectedChoices: [] },
    { quantity: 1, product: { price: '3.50', isDiscountable: false, choices: [] }, selectedChoices: [] },
  ]
  const client = computeCartTotals({ lines, collectionOption: 'PICKUP', paymentOption: 'ONLINE', couponDiscountCents: 0 })
  const server = totalsFromQuote(quote({ subtotal: '28.50', pickupDiscount: '2.50', onlineFee: '0.30', total: '26.30' }), 'PICKUP')
  assert.deepEqual(server, client)
})

test('delivery: the fee, the minimum from the issue, and the out-of-zone sentinel', () => {
  const near = totalsFromQuote(quote({ subtotal: '30.00', deliveryFee: '2.00', total: '32.00' }), 'DELIVERY')
  assert.equal(near.deliveryFeeCents, 200)
  assert.equal(near.isMinimumReached, true)

  const short = totalsFromQuote(quote({
    subtotal: '18.00', total: '18.00', issues: [{ code: 'DELIVERY_MINIMUM_NOT_MET', minimum: '25' }],
  }), 'DELIVERY')
  assert.equal(short.isMinimumReached, false)
  assert.equal(short.amountToDeliveryMinimumCents, 700)

  const far = totalsFromQuote(quote({ issues: [{ code: 'DELIVERY_OUT_OF_ZONE', minimum: null }] }), 'DELIVERY')
  assert.equal(far.deliveryFeeCents, -1)
  assert.equal(totalsFromQuote(quote({ issues: [{ code: 'DELIVERY_AREA_EXCLUDED', minimum: null }] }), 'DELIVERY').deliveryFeeCents, -1)

  // The minimum never applies to pickup, whatever the issues say.
  assert.equal(totalsFromQuote(quote({ issues: [{ code: 'DELIVERY_MINIMUM_NOT_MET', minimum: '25' }] }), 'PICKUP').isMinimumReached, true)
})

test('a quote that could not evaluate the coupon or resolve the address is not used for totals', () => {
  assert.equal(isQuoteUsableForTotals(quote()), true)
  assert.equal(isQuoteUsableForTotals(quote({ coupon: { code: 'X', valid: true, errorCode: null } })), true)
  assert.equal(isQuoteUsableForTotals(quote({ coupon: { code: 'X', valid: false, errorCode: 'UNAUTHENTICATED' } })), false)
  assert.equal(isQuoteUsableForTotals(quote({ issues: [{ code: 'ADDRESS_UNRESOLVABLE', minimum: null }] })), false)
  // A refused coupon is usable: the totals are simply without it (and the cart drops the code).
  assert.equal(isQuoteUsableForTotals(quote({ coupon: { code: 'X', valid: false, errorCode: 'COUPON_INVALID' } })), true)
  // Too many different products: the server prices nothing (zeros), so those zeros are never shown as totals.
  assert.equal(isQuoteUsableForTotals(quote({ total: '0.00', issues: [{ code: 'ORDER_TOO_MANY_ITEMS', minimum: null }] })), false)
})

test('the recheck right before ordering: blocked, changed (the total moved) or ok', () => {
  assert.equal(recheckQuote(quote(), 1250), 'ok')
  assert.equal(recheckQuote(quote({ total: '13.00' }), 1250), 'changed')
  assert.equal(recheckQuote(quote({ lines: [line({ issues: [{ code: 'PRODUCT_UNAVAILABLE', currentPrice: null }] })] }), 1250), 'blocked')
  // A blocking issue wins over a moved total.
  assert.equal(recheckQuote(quote({ total: '99.00', issues: [{ code: 'ORDERING_UNAVAILABLE', minimum: null }] }), 1250), 'blocked')
  // A quote the totals cannot use (anonymous coupon, unresolved address) has nothing comparable: it only blocks (an unresolved address does).
  assert.equal(recheckQuote(quote({ total: '0.00', coupon: { code: 'X', valid: false, errorCode: 'UNAUTHENTICATED' } }), 1250), 'ok')
  assert.equal(recheckQuote(quote({ total: '0.00', issues: [{ code: 'ADDRESS_UNRESOLVABLE', minimum: null }] }), 1250), 'blocked')
  // The page handles a missing address itself.
  assert.equal(recheckQuote(quote({ issues: [{ code: 'ADDRESS_REQUIRED', minimum: null }] }), 1250), 'ok')
})

test('blocking: any line issue, or an order issue the page does not already handle', () => {
  assert.equal(isQuoteBlocking(quote()), false)
  assert.equal(isQuoteBlocking(quote({ lines: [line({ issues: [{ code: 'PRODUCT_UNAVAILABLE', currentPrice: '12.50' }] })] })), true)
  assert.equal(isQuoteBlocking(quote({ lines: [line({ issues: [{ code: 'PRICE_CHANGED', currentPrice: '13.00' }] })] })), true)
  assert.equal(isQuoteBlocking(quote({ issues: [{ code: 'ORDERING_UNAVAILABLE', minimum: null }] })), true)
  assert.equal(isQuoteBlocking(quote({ issues: [{ code: 'SLOT_TOO_SOON', minimum: null }] })), true)
  assert.equal(isQuoteBlocking(quote({ issues: [{ code: 'COUPON_INVALID', minimum: null }] })), true)
  // The checkout's own validation scrolls to the missing address: it does not additionally disable the button.
  assert.equal(isQuoteBlocking(quote({ issues: [{ code: 'ADDRESS_REQUIRED', minimum: null }] })), false)
  assert.deepEqual(
    blockingOrderIssues(quote({ issues: [{ code: 'ADDRESS_REQUIRED', minimum: null }, { code: 'ORDERING_CLOSED_TODAY', minimum: null }] })).map((i) => i.code),
    ['ORDERING_CLOSED_TODAY'],
  )
  assert.equal(hasLineIssues(quote()), false)
})

test('line issues are matched to cart lines by the keys of the request, not by position now', () => {
  const q = quote({
    lines: [line(), line({ productId: 'p2', issues: [{ code: 'PRODUCT_NOT_FOUND', currentPrice: null }] }), line({ productId: 'p3', issues: [{ code: 'PRICE_CHANGED', currentPrice: '9.00' }] })],
  })
  const keys = ['k1', 'k2', 'k3']
  assert.deepEqual(lineIssuesByKey(q, keys), {
    k2: [{ code: 'PRODUCT_NOT_FOUND', currentPrice: null }],
    k3: [{ code: 'PRICE_CHANGED', currentPrice: '9.00' }],
  })
  assert.equal(quoteLineByKey(q, keys, 'k3').productId, 'p3')
  assert.equal(quoteLineByKey(q, keys, 'gone'), null)
  // Fewer keys than lines (the cart moved on): the unknown ones are skipped.
  assert.deepEqual(Object.keys(lineIssuesByKey(q, ['k1'])), [])
})

test('coupon verdict: it follows the basket, is dropped when refused, and is left alone when not evaluated', () => {
  const withCoupon = (coupon, couponDiscount = '2.90') => quote({ coupon, couponDiscount })
  assert.deepEqual(couponVerdict(withCoupon({ code: 'T10', valid: true, errorCode: null }), 'T10'), { kind: 'applied', discountCents: 290 })
  assert.deepEqual(couponVerdict(withCoupon({ code: 'T10', valid: false, errorCode: 'COUPON_MIN_ORDER_NOT_MET' }, '0.00'), 'T10'), { kind: 'refused', errorCode: 'COUPON_MIN_ORDER_NOT_MET' })
  assert.deepEqual(couponVerdict(withCoupon({ code: 'T10', valid: false, errorCode: 'UNAUTHENTICATED' }), 'T10'), { kind: 'unchanged' })
  // An answer about another code (the customer changed it meanwhile), or no coupon on the cart.
  assert.deepEqual(couponVerdict(withCoupon({ code: 'OLD', valid: false, errorCode: 'COUPON_INVALID' }), 'NEW'), { kind: 'unchanged' })
  assert.deepEqual(couponVerdict(quote(), 'T10'), { kind: 'unchanged' })
  assert.deepEqual(couponVerdict(withCoupon({ code: 'T10', valid: true, errorCode: null }), null), { kind: 'unchanged' })
})

test('an old backend without quoteOrder is recognised from its validation error, a network error is not', () => {
  const validation = new GqlError([{ message: 'Cannot query field "quoteOrder" on type "Query".', extensions: { code: 'GRAPHQL_VALIDATION_FAILED' } }])
  assert.equal(isQuoteUnsupportedError(validation), true)
  assert.equal(isQuoteUnsupportedError(Object.assign(new Error('wrapped'), { cause: validation })), true)
  assert.equal(isQuoteUnsupportedError(new GqlError([{ message: 'Cannot query field "errorCode" on type "CouponValidation".', extensions: { code: 'GRAPHQL_VALIDATION_FAILED' } }])), false)
  assert.equal(isQuoteUnsupportedError(GqlError.fromTransport(new TypeError('Failed to fetch'))), false)
  assert.equal(isQuoteUnsupportedError(GqlError.fromTransport({ status: 500, message: 'x' })), false)
  assert.equal(isQuoteUnsupportedError(new Error('plain')), false)
})

test('gqlgen answers a failed validation with HTTP 422: the body errors are kept, so the check above works on the wire', () => {
  const fetchError = Object.assign(new Error('[POST] "/graphql": 422 Unprocessable Entity'), {
    status: 422,
    data: { errors: [{ message: 'Cannot query field "quoteOrder" on type "Query".', extensions: { code: 'GRAPHQL_VALIDATION_FAILED' } }] },
  })
  assert.equal(isQuoteUnsupportedError(GqlError.fromTransport(fetchError, 'QuoteOrder')), true)
})

test('the request key changes with everything that is priced, and with the session', () => {
  const base = {
    products: [{ product: { id: 'p', price: '5.00', choices: [] }, quantity: 1, selectedChoices: [], selectedChoice: null }],
    collectionOption: 'PICKUP', paymentOption: 'CASH', address: null, couponCode: null, preferredReadyTime: null,
  }
  const key = (cart, signedIn = true) => quoteRequestKey(buildQuoteInput({ ...base, ...cart }), signedIn)
  const reference = key({})
  assert.equal(key({}), reference)
  assert.notEqual(key({ collectionOption: 'DELIVERY' }), reference)
  assert.notEqual(key({ paymentOption: 'ONLINE' }), reference)
  assert.notEqual(key({ couponCode: 'T10' }), reference)
  assert.notEqual(key({ preferredReadyTime: '2026-05-13T12:30:00+02:00' }), reference)
  assert.notEqual(key({ products: [{ ...base.products[0], quantity: 2 }] }), reference)
  assert.notEqual(key({}, false), reference)
  // What is NOT priced does not re-quote: the note and the extras.
  assert.equal(key({ orderNote: 'x', addressExtra: 'y', orderExtra: [{ name: 'chopsticks' }] }), reference)
})
