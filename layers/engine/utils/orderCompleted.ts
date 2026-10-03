import {
  type PaymentOutcome,
  isPaymentProblem,
  outcomeFromPaymentStatus,
} from '../lib/paymentOutcome.ts'

/*
 * The decisions of the /order-completed/[orderId] page (composables/useOrderCompleted.ts), kept pure so
 * `orderCompleted.test.mjs` pins every Mollie outcome and the rule for clearing the cart. The composable owns
 * the query, the polling and the subscription; the contract is described there.
 */

export type OrderCompletedPhase =
  | 'loading'
  | 'error'
  | 'verifying'
  | 'awaiting-confirmation'
  | 'problem'
  | 'confirmed'

export interface CompletedOrderView {
  status: string
  isOnlinePayment: boolean
  createdAt?: string | null
  payment?: { status?: string | null } | null
}

/*
 * Payment.status (set by the webhook) is the truth. null = nothing to report: a cash order, a paid order, or an
 * order that has progressed past PENDING (the webhook confirmed it). Only surface a problem while the order is
 * still unpaid: an online order is PENDING until paid, and CANCELLED/FAILED once payment fails/cancels/expires.
 */
export function paymentOutcomeOf(
  order: CompletedOrderView | null | undefined,
): PaymentOutcome | null {
  if (!order || !order.isOnlinePayment) return null // Cash orders never have a payment problem
  const out = outcomeFromPaymentStatus(order.payment?.status)
  if (out === 'paid') return null
  if (order.status !== 'PENDING' && order.status !== 'CANCELLED' && order.status !== 'FAILED')
    return null
  return out
}

/*
 * Still PENDING with an open/unknown payment: only a late webhook explains it, so after the verify window show a
 * neutral "awaiting confirmation" state, NEVER the retry screen (a second payment would double-charge a customer
 * whose first one is just not confirmed yet). The retry screen needs a definitive verdict: canceled/failed/expired,
 * or an order that is already CANCELLED/FAILED.
 */
export function orderCompletedPhase(input: {
  order: CompletedOrderView | null | undefined
  loadFailed: boolean
  verifyExpired: boolean
}): OrderCompletedPhase {
  const { order, loadFailed, verifyExpired } = input
  if (!order) return loadFailed ? 'error' : 'loading'
  const out = paymentOutcomeOf(order)
  if (out === null) return 'confirmed'
  if (out === 'abandoned' && order.status === 'PENDING')
    return verifyExpired ? 'awaiting-confirmation' : 'verifying'
  return isPaymentProblem(out) ? 'problem' : 'confirmed'
}

/*
 * TODO(remove after 2026-11-15): transitional fallback for customers whose checkout ran on the PREVIOUS web bundle.
 * That bundle never stored `pendingOrderId`, so they come back from Mollie with `pendingOrderId === null` and would
 * keep a full cart for an order that is already placed (and could place it twice). For a short window we therefore
 * also commit a cart with no `pendingOrderId` when the order was created minutes ago. A cart checked out for a
 * DIFFERENT order (non-null id) is never touched. By the date above every cart in the wild has been written by a
 * bundle that sets the id: delete this window and the `createdAt` source of the watch.
 */
export const TRANSITIONAL_CHECKOUT_WINDOW_MS = 30 * 60 * 1000

export const isTransitionalCheckout = (
  pendingOrderId: string | null | undefined,
  createdAt: string | null | undefined,
  now: number = Date.now(),
): boolean => {
  if (typeof pendingOrderId === 'string' || !createdAt) return false
  const age = now - Date.parse(createdAt)
  return Number.isFinite(age) && age >= 0 && age < TRANSITIONAL_CHECKOUT_WINDOW_MS
}

/*
 * Clear the cart only once the order is known to be committed (phase `confirmed`: a paid online order or a cash
 * order), and only the cart that was checked out for THIS order (`pendingOrderId`): revisiting an old confirmation
 * later (history, an email link) must not wipe whatever the customer has in the cart by then.
 */
export function shouldCommitCart(input: {
  phase: OrderCompletedPhase
  alreadyCommitted: boolean
  isClient: boolean
  orderId: string
  pendingOrderId: string | null | undefined
  createdAt: string | null | undefined
  now?: number
}): boolean {
  const { phase, alreadyCommitted, isClient, orderId, pendingOrderId, createdAt, now } = input
  if (phase !== 'confirmed' || alreadyCommitted || !isClient) return false
  return pendingOrderId === orderId || isTransitionalCheckout(pendingOrderId, createdAt, now)
}
