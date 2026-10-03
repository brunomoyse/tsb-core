import { evaluateCashAmount } from './cashPayment.ts'

/*
 * The decisions of the checkout page, pure: which steps the customer sees, what stops a click on
 * Pay before anything is sent, and which fields are still wrong. useCheckout feeds them the live
 * state and turns the results into toasts, scrolling and analytics events.
 */

// ── Steps ──

export type CheckoutStepKey = 'address' | 'auth' | 'phone' | 'review' | 'payment'

export interface CheckoutStepsInput {
  isDelivery: boolean
  signedIn: boolean
  needsPhone: boolean
  needsDeliveryGate: boolean
}

/** The steps shown above the page, in order: each appears only while it applies. */
export function checkoutStepKeys(
  input: Pick<CheckoutStepsInput, 'isDelivery' | 'signedIn' | 'needsPhone'>,
): CheckoutStepKey[] {
  const steps: CheckoutStepKey[] = []
  if (input.isDelivery) steps.push('address')
  if (!input.signedIn) steps.push('auth')
  if (input.needsPhone) steps.push('phone')
  steps.push('review', 'payment')
  return steps
}

/** The step the customer is on: the first gate not cleared yet, else the review. */
export function currentCheckoutStep(input: CheckoutStepsInput): CheckoutStepKey {
  if (input.needsDeliveryGate) return 'address'
  if (!input.signedIn) return 'auth'
  if (input.needsPhone) return 'phone'
  return 'review'
}

// ── What stops a click on Pay before the checks on the form ──

export interface CheckoutPreflightInput {
  orderingAvailable: boolean
  /** The server has not priced the cart, or reports something that would fail the order. */
  orderBlocked: boolean
  quotePending: boolean
  /** Open right now (ASAP is possible); while closed an order needs a fixed slot. */
  openNow: boolean
  preferredReadyTime: string | null | undefined
  cartEmpty: boolean
  cartHasLunchOnly: boolean
  /** The chosen slot is allowed for lunch-only products (null when no slot is chosen / known). */
  slotAllowsLunchOnly: boolean | null
}

export interface CheckoutBlock {
  messageKey: string
  /** Fallback copy when the key is missing from a locale. */
  fallback?: string
  variant: 'error' | 'warning'
  duration: number
  /** Analytics event, when this block is worth counting. */
  event?: string
}

/** The first reason the order cannot go out, or null. The order of the checks is the order of the rules. */
export function checkoutPreflight(input: CheckoutPreflightInput): CheckoutBlock | null {
  if (!input.orderingAvailable) {
    return { messageKey: 'notify.errors.orderingUnavailable', variant: 'error', duration: 5000 }
  }
  // The pay button is disabled in this state; this covers Enter keys and double taps.
  if (input.orderBlocked) {
    return {
      messageKey: input.quotePending ? 'cart.quoteUpdating' : 'checkout.quoteLineIssues',
      variant: 'warning',
      duration: 3000,
    }
  }
  if (!input.openNow && !input.preferredReadyTime) {
    return {
      messageKey: 'notify.errors.fixedTimeRequiredWhileClosed',
      variant: 'error',
      duration: 5000,
    }
  }
  // Lunch-only products require a slot in the weekday lunch window.
  if (input.cartHasLunchOnly && !(input.preferredReadyTime && input.slotAllowsLunchOnly)) {
    return {
      messageKey: 'notify.errors.lunchOnlyRequiresLunchSlot',
      variant: 'error',
      duration: 5000,
    }
  }
  if (input.cartEmpty) {
    return {
      messageKey: 'notify.errors.cartEmpty',
      fallback: 'Your cart is empty.',
      variant: 'error',
      duration: 5000,
      event: 'checkout_error_cart_empty',
    }
  }
  return null
}

// ── The error summary ──

export type DeliveryZone = 'ok' | 'excluded' | 'tooFar'

export interface CheckoutValidationInput {
  isDelivery: boolean
  hasAddress: boolean
  zone: DeliveryZone
  minimumReached: boolean
  /** The delivery minimum in euros, for the message. */
  minimumAmount: string | number
  /** The delivery radius in km, for the "too far" message (`deliveryMaxKm(policy)`). */
  maxDistanceKm: number
  /** A number typed in the phone card but not saved (it could not be committed). */
  phoneUnsaved: boolean
  hasPhone: boolean
  paymentOption: 'ONLINE' | 'CASH'
  cashAcknowledged: boolean
  cashAmount: string | number | null | undefined
  payableCents: number
  /** The formatted payable total, for the "amount too low" message. */
  totalLabel: string
}

export interface CheckoutValidationIssue {
  messageKey: string
  params?: Record<string, unknown>
  /** Fallback copy when the key is missing from a locale. */
  fallback?: string
  /** Id of the field the summary entry scrolls to and focuses. */
  targetId: string
  event: string
}

/** Every field still wrong, in the order the summary lists them (the first one gets the focus). */
export function checkoutValidationIssues(
  input: CheckoutValidationInput,
): CheckoutValidationIssue[] {
  const issues: CheckoutValidationIssue[] = []

  if (!input.minimumReached) {
    issues.push({
      messageKey: 'cart.minimumDelivery',
      params: { amount: input.minimumAmount },
      targetId: 'checkout-minimum-order-banner',
      event: 'checkout_error_minimum_not_reached',
    })
  }

  if (input.phoneUnsaved) {
    // Typed but not saved (Pay commits it first, so this is an invalid number or a failed save): the field shows why.
    issues.push({
      messageKey: 'checkout.phoneCapture.unsaved',
      targetId: 'checkout-phone-input',
      event: 'checkout_error_phone_unsaved',
    })
  } else if (!input.hasPhone) {
    issues.push({
      messageKey: 'checkout.phoneCapture.requiredBeforeOrder',
      targetId: 'checkout-phone-capture',
      event: 'checkout_error_phone_required',
    })
  }

  if (input.isDelivery && !input.hasAddress) {
    issues.push({
      messageKey: 'notify.errors.addressRequired',
      fallback: 'Delivery address is required.',
      targetId: 'checkout-delivery-address',
      event: 'checkout_error_address_required',
    })
  }

  if (input.paymentOption === 'CASH' && !input.cashAcknowledged) {
    issues.push({
      messageKey: 'checkout.cashAcknowledgeMissing',
      targetId: 'cash-acknowledge-row',
      event: 'checkout_error_cash_not_acknowledged',
    })
  }

  if (
    input.paymentOption === 'CASH' &&
    evaluateCashAmount(input.cashAmount, input.payableCents).kind === 'short'
  ) {
    issues.push({
      messageKey: 'checkout.cashAmountTooLow',
      params: { total: input.totalLabel },
      targetId: 'cash-payment-amount',
      event: 'checkout_error_cash_amount_too_low',
    })
  }

  if (input.zone === 'excluded') {
    issues.push({
      messageKey: 'notify.errors.deliveryAddressExcluded',
      targetId: 'checkout-delivery-address',
      event: 'checkout_error_address_excluded',
    })
  } else if (input.zone === 'tooFar') {
    issues.push({
      messageKey: 'notify.errors.deliveryAddressTooFar',
      params: { distance: input.maxDistanceKm },
      targetId: 'checkout-delivery-address',
      event: 'checkout_error_address_too_far',
    })
  }

  return issues
}

/** Whether the unchecked cash acknowledgement is among the issues (it is highlighted on the field). */
export const hasCashAckIssue = (issues: readonly { targetId: string }[]): boolean =>
  issues.some((issue) => issue.targetId === 'cash-acknowledge-row')
