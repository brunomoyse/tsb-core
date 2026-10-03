// Run: `vp test run layers/engine/utils/checkoutRules.test.mjs`.

import {
  checkoutPreflight,
  checkoutStepKeys,
  checkoutValidationIssues,
  currentCheckoutStep,
  hasCashAckIssue,
} from './checkoutRules.ts'
import assert from 'node:assert/strict'
import { test } from 'vite-plus/test'

test('steps: delivery adds the address, an anonymous customer the sign-in, a missing phone the phone', () => {
  assert.deepEqual(checkoutStepKeys({ isDelivery: false, signedIn: true, needsPhone: false }), [
    'review',
    'payment',
  ])
  assert.deepEqual(checkoutStepKeys({ isDelivery: true, signedIn: false, needsPhone: false }), [
    'address',
    'auth',
    'review',
    'payment',
  ])
  assert.deepEqual(checkoutStepKeys({ isDelivery: false, signedIn: true, needsPhone: true }), [
    'phone',
    'review',
    'payment',
  ])
})

test('the current step is the first gate not cleared', () => {
  const base = { isDelivery: true, signedIn: false, needsPhone: false, needsDeliveryGate: true }
  assert.equal(currentCheckoutStep(base), 'address')
  assert.equal(currentCheckoutStep({ ...base, needsDeliveryGate: false }), 'auth')
  assert.equal(
    currentCheckoutStep({ ...base, needsDeliveryGate: false, signedIn: true, needsPhone: true }),
    'phone',
  )
  assert.equal(currentCheckoutStep({ ...base, needsDeliveryGate: false, signedIn: true }), 'review')
})

const ready = {
  orderingAvailable: true,
  orderBlocked: false,
  quotePending: false,
  openNow: true,
  preferredReadyTime: null,
  cartEmpty: false,
  cartHasLunchOnly: false,
  slotAllowsLunchOnly: null,
}

test('preflight: a ready checkout is not blocked', () => {
  assert.equal(checkoutPreflight(ready), null)
})

test('preflight: the rules apply in order, first match wins', () => {
  assert.equal(
    checkoutPreflight({ ...ready, orderingAvailable: false, orderBlocked: true, cartEmpty: true })
      ?.messageKey,
    'notify.errors.orderingUnavailable',
  )
  assert.equal(
    checkoutPreflight({ ...ready, orderBlocked: true, quotePending: true })?.messageKey,
    'cart.quoteUpdating',
  )
  assert.equal(
    checkoutPreflight({ ...ready, orderBlocked: true })?.messageKey,
    'checkout.quoteLineIssues',
  )
  assert.equal(checkoutPreflight({ ...ready, orderBlocked: true })?.variant, 'warning')
  assert.equal(
    checkoutPreflight({ ...ready, openNow: false })?.messageKey,
    'notify.errors.fixedTimeRequiredWhileClosed',
  )
  assert.equal(
    checkoutPreflight({ ...ready, openNow: false, preferredReadyTime: '2026-01-01T19:00:00Z' }),
    null,
  )
  const empty = checkoutPreflight({ ...ready, cartEmpty: true })
  assert.equal(empty?.messageKey, 'notify.errors.cartEmpty')
  assert.equal(empty?.event, 'checkout_error_cart_empty')
})

test('preflight: lunch-only products need a fixed slot that allows them', () => {
  const lunch = { ...ready, cartHasLunchOnly: true }
  assert.equal(checkoutPreflight(lunch)?.messageKey, 'notify.errors.lunchOnlyRequiresLunchSlot')
  assert.equal(
    checkoutPreflight({ ...lunch, preferredReadyTime: 'x', slotAllowsLunchOnly: null })?.messageKey,
    'notify.errors.lunchOnlyRequiresLunchSlot',
  )
  assert.equal(
    checkoutPreflight({ ...lunch, preferredReadyTime: 'x', slotAllowsLunchOnly: false })
      ?.messageKey,
    'notify.errors.lunchOnlyRequiresLunchSlot',
  )
  assert.equal(
    checkoutPreflight({ ...lunch, preferredReadyTime: 'x', slotAllowsLunchOnly: true }),
    null,
  )
})

const valid = {
  isDelivery: false,
  hasAddress: false,
  zone: 'ok',
  minimumReached: true,
  minimumAmount: 25,
  maxDistanceKm: 9,
  phoneUnsaved: false,
  hasPhone: true,
  paymentOption: 'ONLINE',
  cashAcknowledged: false,
  cashAmount: null,
  payableCents: 3000,
  totalLabel: '30,00 €',
}
const keys = (input) => checkoutValidationIssues(input).map((issue) => issue.messageKey)

test('validation: a complete online pickup order has no issue', () => {
  assert.deepEqual(keys(valid), [])
})

test('validation: phone, unsaved draft first', () => {
  assert.deepEqual(keys({ ...valid, hasPhone: false }), [
    'checkout.phoneCapture.requiredBeforeOrder',
  ])
  assert.deepEqual(keys({ ...valid, hasPhone: false, phoneUnsaved: true }), [
    'checkout.phoneCapture.unsaved',
  ])
  assert.equal(
    checkoutValidationIssues({ ...valid, phoneUnsaved: true })[0].targetId,
    'checkout-phone-input',
  )
})

test('validation: delivery needs an address in the zone', () => {
  assert.deepEqual(keys({ ...valid, isDelivery: true }), ['notify.errors.addressRequired'])
  assert.deepEqual(keys({ ...valid, isDelivery: true, hasAddress: true, zone: 'excluded' }), [
    'notify.errors.deliveryAddressExcluded',
  ])
  assert.deepEqual(keys({ ...valid, isDelivery: true, hasAddress: true, zone: 'tooFar' }), [
    'notify.errors.deliveryAddressTooFar',
  ])
  // The radius quoted in the message is the policy's.
  const tooFar = checkoutValidationIssues({
    ...valid,
    isDelivery: true,
    hasAddress: true,
    zone: 'tooFar',
    maxDistanceKm: 6.5,
  })
  assert.deepEqual(tooFar[0].params, { distance: 6.5 })
})

test('validation: cash needs the acknowledgement and an amount that covers the total', () => {
  const cash = { ...valid, paymentOption: 'CASH' }
  assert.deepEqual(keys(cash), ['checkout.cashAcknowledgeMissing'])
  assert.deepEqual(keys({ ...cash, cashAcknowledged: true }), [])
  assert.deepEqual(keys({ ...cash, cashAcknowledged: true, cashAmount: '20' }), [
    'checkout.cashAmountTooLow',
  ])
  assert.deepEqual(keys({ ...cash, cashAcknowledged: true, cashAmount: '30' }), [])
  assert.deepEqual(keys({ ...cash, cashAcknowledged: true, cashAmount: '50' }), [])
  // Online payment ignores both cash rules.
  assert.deepEqual(keys({ ...valid, cashAmount: '1' }), [])
})

test('validation: messages carry their parameters and the summary order is stable', () => {
  const issues = checkoutValidationIssues({
    ...valid,
    minimumReached: false,
    hasPhone: false,
    isDelivery: true,
    paymentOption: 'CASH',
    cashAmount: '1',
  })
  assert.deepEqual(
    issues.map((issue) => issue.targetId),
    [
      'checkout-minimum-order-banner',
      'checkout-phone-capture',
      'checkout-delivery-address',
      'cash-acknowledge-row',
      'cash-payment-amount',
    ],
  )
  assert.deepEqual(issues[0].params, { amount: 25 })
  assert.deepEqual(issues[4].params, { total: '30,00 €' })
  assert.equal(hasCashAckIssue(issues), true)
  assert.equal(hasCashAckIssue(issues.slice(0, 2)), false)
})
