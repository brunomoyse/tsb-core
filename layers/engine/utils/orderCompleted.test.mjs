// The payment return: every Mollie outcome, and when the cart is cleared.
// Run: `vp test run layers/engine/utils/orderCompleted.test.mjs`.

import {
  TRANSITIONAL_CHECKOUT_WINDOW_MS,
  isTransitionalCheckout,
  orderCompletedPhase,
  paymentOutcomeOf,
  shouldCommitCart,
} from './orderCompleted.ts'
import { describe, test } from 'vite-plus/test'
import { isPaymentProblem, outcomeFromPaymentStatus } from '../lib/paymentOutcome.ts'
import assert from 'node:assert/strict'

const online = (status, paymentStatus, extra = {}) => ({
  status,
  isOnlinePayment: true,
  payment: { status: paymentStatus },
  ...extra,
})
const cash = (status = 'PENDING') => ({ status, isOnlinePayment: false, payment: null })
const phaseOf = (order, extra = {}) =>
  orderCompletedPhase({ order, loadFailed: false, verifyExpired: false, ...extra })

describe('Mollie status to outcome', () => {
  test('paid and authorized are a confirmed payment', () => {
    assert.equal(outcomeFromPaymentStatus('paid'), 'paid')
    assert.equal(outcomeFromPaymentStatus('authorized'), 'paid')
  })

  test('canceled, failed and expired each have their own outcome', () => {
    assert.equal(outcomeFromPaymentStatus('canceled'), 'canceled')
    assert.equal(outcomeFromPaymentStatus('failed'), 'failed')
    assert.equal(outcomeFromPaymentStatus('expired'), 'expired')
  })

  test('open, pending, unknown, empty and missing are "not finalised" (abandoned)', () => {
    for (const status of ['open', 'pending', 'refunded', 'whatever', '', null, undefined])
      assert.equal(outcomeFromPaymentStatus(status), 'abandoned', String(status))
  })

  test('only a paid payment is not a problem', () => {
    assert.equal(isPaymentProblem('paid'), false)
    for (const outcome of ['canceled', 'failed', 'expired', 'abandoned'])
      assert.equal(isPaymentProblem(outcome), true, outcome)
  })
})

describe('outcome of the loaded order', () => {
  test('a cash order, a paid order and an order past PENDING never report a problem', () => {
    assert.equal(paymentOutcomeOf(cash()), null)
    assert.equal(paymentOutcomeOf(online('PENDING', 'paid')), null)
    assert.equal(paymentOutcomeOf(online('PENDING', 'authorized')), null)
    // The webhook confirmed the order: whatever the payment row says, it moved on.
    for (const status of ['CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED'])
      assert.equal(paymentOutcomeOf(online(status, 'open')), null, status)
    assert.equal(paymentOutcomeOf(null), null)
  })

  test('an unpaid online order reports the verdict of the payment', () => {
    assert.equal(paymentOutcomeOf(online('PENDING', 'canceled')), 'canceled')
    assert.equal(paymentOutcomeOf(online('PENDING', 'failed')), 'failed')
    assert.equal(paymentOutcomeOf(online('PENDING', 'expired')), 'expired')
    assert.equal(paymentOutcomeOf(online('PENDING', 'open')), 'abandoned')
    assert.equal(paymentOutcomeOf(online('CANCELLED', 'canceled')), 'canceled')
    assert.equal(paymentOutcomeOf(online('FAILED', 'failed')), 'failed')
    assert.equal(paymentOutcomeOf(online('CANCELLED', 'open')), 'abandoned')
    assert.equal(paymentOutcomeOf(online('PENDING', undefined)), 'abandoned')
  })
})

describe('page phase', () => {
  test('no order yet: loading, or the error card when the load failed', () => {
    assert.equal(phaseOf(null), 'loading')
    assert.equal(phaseOf(undefined), 'loading')
    assert.equal(phaseOf(null, { loadFailed: true }), 'error')
  })

  test('paid online and cash orders are confirmed', () => {
    assert.equal(phaseOf(online('PENDING', 'paid')), 'confirmed')
    assert.equal(phaseOf(online('CONFIRMED', 'paid')), 'confirmed')
    assert.equal(phaseOf(cash()), 'confirmed')
    assert.equal(phaseOf(cash('CONFIRMED')), 'confirmed')
  })

  test('canceled, failed, expired payments show the retry screen', () => {
    for (const status of ['canceled', 'failed', 'expired'])
      assert.equal(phaseOf(online('PENDING', status)), 'problem', status)
    assert.equal(phaseOf(online('CANCELLED', 'canceled')), 'problem')
    assert.equal(phaseOf(online('FAILED', 'failed')), 'problem')
  })

  test('an open payment on an already cancelled or failed order is a problem, not "verifying"', () => {
    assert.equal(phaseOf(online('CANCELLED', 'open')), 'problem')
    assert.equal(phaseOf(online('FAILED', 'pending')), 'problem')
  })

  test('an open payment on a PENDING order is verified, then awaiting confirmation: never the retry screen', () => {
    assert.equal(phaseOf(online('PENDING', 'open')), 'verifying')
    assert.equal(phaseOf(online('PENDING', 'pending')), 'verifying')
    assert.equal(
      phaseOf(online('PENDING', 'open'), { verifyExpired: true }),
      'awaiting-confirmation',
    )
    assert.equal(phaseOf(online('PENDING', null), { verifyExpired: true }), 'awaiting-confirmation')
  })

  test('the webhook landing during verification moves the page to confirmed', () => {
    assert.equal(phaseOf(online('PENDING', 'open')), 'verifying')
    assert.equal(phaseOf(online('CONFIRMED', 'paid')), 'confirmed')
    assert.equal(phaseOf(online('PENDING', 'paid'), { verifyExpired: true }), 'confirmed')
  })

  test('a later successful load recovers from a failed first one only through the order', () => {
    assert.equal(phaseOf(online('PENDING', 'paid'), { loadFailed: true }), 'confirmed')
  })
})

describe('when the cart is cleared', () => {
  const base = {
    phase: 'confirmed',
    alreadyCommitted: false,
    isClient: true,
    orderId: 'o1',
    pendingOrderId: 'o1',
    createdAt: null,
  }

  test('a confirmed order clears the cart that was checked out for it', () => {
    assert.equal(shouldCommitCart(base), true)
  })

  test('never before the order is confirmed: loading, error, verifying, awaiting, problem keep the cart', () => {
    for (const phase of ['loading', 'error', 'verifying', 'awaiting-confirmation', 'problem'])
      assert.equal(shouldCommitCart({ ...base, phase }), false, phase)
  })

  test('only once, and only on the client', () => {
    assert.equal(shouldCommitCart({ ...base, alreadyCommitted: true }), false)
    assert.equal(shouldCommitCart({ ...base, isClient: false }), false)
  })

  test('a cart checked out for another order is never touched', () => {
    assert.equal(shouldCommitCart({ ...base, pendingOrderId: 'o2' }), false)
    // Not even for a freshly created order: a non-null id is authoritative.
    assert.equal(
      shouldCommitCart({
        ...base,
        pendingOrderId: 'o2',
        createdAt: new Date().toISOString(),
      }),
      false,
    )
  })

  test('a late hydration: the pending id arriving later is what releases the clearing', () => {
    assert.equal(shouldCommitCart({ ...base, pendingOrderId: null }), false)
    assert.equal(shouldCommitCart({ ...base, pendingOrderId: 'o1' }), true)
  })

  test('an old confirmation revisited later does not wipe a cart without a pending id', () => {
    const now = Date.parse('2026-10-03T12:00:00Z')
    const old = new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString()
    assert.equal(shouldCommitCart({ ...base, pendingOrderId: null, createdAt: old, now }), false)
  })

  test('transitional window: a cart with no pending id, order placed minutes ago, is cleared', () => {
    const now = Date.parse('2026-10-03T12:00:00Z')
    const recent = new Date(now - 5 * 60 * 1000).toISOString()
    assert.equal(shouldCommitCart({ ...base, pendingOrderId: null, createdAt: recent, now }), true)
    assert.equal(
      shouldCommitCart({ ...base, pendingOrderId: undefined, createdAt: recent, now }),
      true,
    )
  })

  test('the transitional window edges: just inside, exactly at the limit, future and unparseable dates', () => {
    const now = Date.parse('2026-10-03T12:00:00Z')
    const at = (ms) => new Date(now - ms).toISOString()
    assert.equal(isTransitionalCheckout(null, at(TRANSITIONAL_CHECKOUT_WINDOW_MS - 1), now), true)
    assert.equal(isTransitionalCheckout(null, at(TRANSITIONAL_CHECKOUT_WINDOW_MS), now), false)
    assert.equal(isTransitionalCheckout(null, at(-60_000), now), false)
    assert.equal(isTransitionalCheckout(null, 'not a date', now), false)
    assert.equal(isTransitionalCheckout(null, null, now), false)
    assert.equal(isTransitionalCheckout('o9', at(1000), now), false)
  })
})

describe('end to end: the return from Mollie', () => {
  // The page re-evaluates on every update of the order; the cart is cleared the first time it says so.
  const walk = (steps, pendingOrderId = 'o1') => {
    let committed = false
    let cleared = false
    for (const order of steps) {
      const phase = phaseOf(order)
      const commit = shouldCommitCart({
        phase,
        alreadyCommitted: committed,
        isClient: true,
        orderId: 'o1',
        pendingOrderId,
        createdAt: order?.createdAt,
      })
      if (commit) {
        committed = true
        cleared = true
      }
    }
    return cleared
  }

  test('cancelled payment: cart kept, even after several refreshes', () => {
    assert.equal(
      walk([null, online('PENDING', 'canceled'), online('CANCELLED', 'canceled')]),
      false,
    )
  })

  test('failed and expired payments keep the cart', () => {
    assert.equal(walk([online('PENDING', 'failed')]), false)
    assert.equal(walk([online('PENDING', 'expired')]), false)
  })

  test('late webhook: verifying keeps the cart, the paid update clears it', () => {
    assert.equal(walk([null, online('PENDING', 'open'), online('PENDING', 'open')]), false)
    assert.equal(walk([null, online('PENDING', 'open'), online('CONFIRMED', 'paid')]), true)
  })

  test('paid and cash orders clear the cart, but only for the matching pending id', () => {
    assert.equal(walk([online('PENDING', 'paid')]), true)
    assert.equal(walk([cash()]), true)
    assert.equal(walk([online('PENDING', 'paid')], 'other-order'), false)
  })
})
