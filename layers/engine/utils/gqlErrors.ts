import { DEFAULT_ORDERING_POLICY, type OrderingPolicy, deliveryMaxKm } from './orderingPolicy.ts'
import { GQL_HTTP_ERROR, GQL_NETWORK_ERROR, unwrapGqlError } from './gqlError.ts'
import { centsToEuros } from './money.ts'

/*
 * The single code -> i18n key table for backend errors (tsb-service
 * internal/api/graphql/apperr/codes.go is the other half: add a code there, add it here).
 * All keys live in the engine locales (fr / en / nl / zh) under `notify.errors` and `cart`;
 * `gqlErrors.test.mjs` fails when a key is missing from a language.
 *
 * What is NOT here is shown as the generic fallback: the raw backend message is never displayed.
 */

export interface GqlErrorDescriptor {
  /** The vue-i18n key of the translated message. */
  key: string
  params?: Record<string, unknown>
}

/*
 * The numbers a message quotes (the delivery minimum, the radius) come from the ordering policy the backend
 * serves (`useOrderingPolicy()`), so a change made there reaches the copy; the caller passes it in, this file
 * stays plain TypeScript. The backend's own `extensions.minimum` wins for the minimum when it sends one.
 */
type Describe = (ext: Record<string, unknown>, policy: OrderingPolicy) => GqlErrorDescriptor

const key =
  (value: string): Describe =>
  () => ({ key: value })

/**
 * A line-level code: names the item when the caller resolved `extensions.productId` to the cart's
 * product name (`extensions.productName`), the generic sentence otherwise.
 */
const named =
  (generic: string, withName: string): Describe =>
  (ext) =>
    typeof ext.productName === 'string' && ext.productName !== ''
      ? { key: withName, params: { name: ext.productName } }
      : { key: generic }

const CODE_TABLE: Record<string, Describe> = {
  // Session
  UNAUTHENTICATED: key('notify.errors.sessionExpired'),
  FORBIDDEN: key('notify.errors.requestFailed'),
  NOT_FOUND: key('notify.errors.requestFailed'),
  USER_ERROR: key('notify.errors.requestFailed'),

  // Ordering availability and slot
  ORDERING_UNAVAILABLE: key('notify.errors.orderingUnavailable'),
  ORDERING_CLOSED_TODAY: key('notify.errors.orderingClosedToday'),
  SLOT_REQUIRED: key('notify.errors.fixedTimeRequiredWhileClosed'),
  SLOT_NOT_TODAY: key('notify.errors.slotNotToday'),
  SLOT_TOO_SOON: key('notify.errors.slotTooSoon'),
  SLOT_MISALIGNED: key('notify.errors.slotNotAligned'),
  SLOT_OUTSIDE_HOURS: key('notify.errors.slotOutsideHours'),
  LUNCH_SLOT_REQUIRED: key('notify.errors.lunchOnlyRequiresLunchSlot'),

  // Basket
  ORDER_EMPTY: key('notify.errors.cartEmpty'),
  ORDER_TOO_MANY_ITEMS: key('notify.errors.orderTooManyItems'),
  PRODUCT_NOT_FOUND: named('notify.errors.productNotFound', 'notify.errors.productNotFoundNamed'),
  PRODUCT_UNAVAILABLE: named(
    'notify.errors.productUnavailable',
    'notify.errors.productUnavailableNamed',
  ),
  INVALID_QUANTITY: key('notify.errors.invalidQuantity'),
  SELECTION_INVALID: named('notify.errors.selectionInvalid', 'notify.errors.selectionInvalidNamed'),
  INVALID_PRICE: key('notify.errors.orderCreationFailed'),
  PRICE_CHANGED: key('notify.errors.priceChanged'),

  // Delivery
  DELIVERY_MINIMUM_NOT_MET: (ext, policy) => ({
    key: 'cart.minimumDelivery',
    params: {
      amount:
        Number(ext.minimum) > 0 ? Number(ext.minimum) : centsToEuros(policy.deliveryMinimumCents),
    },
  }),
  ADDRESS_REQUIRED: key('notify.errors.addressRequired'),
  ADDRESS_UNRESOLVABLE: key('notify.errors.addressLookupFailed'),
  DELIVERY_OUT_OF_ZONE: (_ext, policy) => ({
    key: 'notify.errors.deliveryAddressTooFar',
    params: { distance: deliveryMaxKm(policy) },
  }),
  DELIVERY_AREA_EXCLUDED: key('notify.errors.deliveryAddressExcluded'),
  DELIVERY_UNAVAILABLE: key('notify.errors.deliveryUnavailable'),

  // Coupons
  COUPON_INVALID: key('coupon.invalid'),
  COUPON_EXHAUSTED: key('coupon.invalid'),
  COUPON_MIN_ORDER_NOT_MET: key('notify.errors.couponMinOrderNotMet'),
  COUPON_RATE_LIMITED: key('notify.errors.tooManyRequests'),
  COUPON_ALREADY_ACTIVE: key('notify.errors.couponAlreadyActive'),
  COUPON_RESERVE_FAILED: key('notify.errors.orderCreationFailed'),
  COUPON_CHECK_FAILED: key('notify.errors.couponCheckFailed'),

  // Payment and persistence
  CASH_AMOUNT_INVALID: key('notify.errors.cashAmountInvalid'),
  ORDER_CREATE_FAILED: key('notify.errors.orderCreationFailed'),
  PAYMENT_FAILED: key('notify.errors.paymentFailed'),
  INVALID_AMOUNT: key('notify.errors.requestFailed'),

  // Throttling of the API itself (the quote cycle treats it as a transient failure and falls back to the client's totals)
  RATE_LIMITED: key('notify.errors.tooManyRequests'),

  // Produced by the transport (plugins/gqlFetch.ts)
  [GQL_NETWORK_ERROR]: key('notify.errors.networkError'),
}

/** Every i18n key the table can produce (the locale test checks them in all four languages). */
export const GQL_ERROR_KEYS: string[] = [
  ...new Set([
    ...Object.values(CODE_TABLE).map((describe) => describe({}, DEFAULT_ORDERING_POLICY).key),
    'notify.errors.serverError',
  ]),
]

/** The codes the table knows, for the tsb-service parity test. */
export const GQL_KNOWN_CODES: string[] = Object.keys(CODE_TABLE)

/*
 * ROLLOUT FALLBACK, remove once tsb-service with extensions.code runs in production (and old web
 * tabs are gone): backends before audit PR 2.3 send no code, only English text. The messages are
 * unchanged on the new backend, so these substrings keep working for both. Only used when the
 * error carries NO code.
 */
const LEGACY_MESSAGE_CODES: [needle: string, code: string][] = [
  ['minimum order amount for delivery', 'DELIVERY_MINIMUM_NOT_MET'],
  ['ordering is currently unavailable', 'ORDERING_UNAVAILABLE'],
  ['not eligible for delivery', 'DELIVERY_AREA_EXCLUDED'],
  ['address too far', 'DELIVERY_OUT_OF_ZONE'],
  ['coupon is no longer valid', 'COUPON_EXHAUSTED'],
  ['you already have an active order using a coupon', 'COUPON_ALREADY_ACTIVE'],
  ['minimum order amount of', 'COUPON_MIN_ORDER_NOT_MET'],
  ['too many', 'COUPON_RATE_LIMITED'],
  ['invalid coupon', 'COUPON_INVALID'],
  ['invalid or expired coupon', 'COUPON_INVALID'],
  ['preferred ready time is no longer available', 'SLOT_TOO_SOON'],
  ['preferred ready time must be at least', 'SLOT_TOO_SOON'],
  ['preferred ready time is outside allowed', 'SLOT_OUTSIDE_HOURS'],
  ['preferred ready time must be on the same day', 'SLOT_NOT_TODAY'],
  ['preferred ready time must be aligned', 'SLOT_MISALIGNED'],
  ['ordering is closed today', 'ORDERING_CLOSED_TODAY'],
  ['fixed time is required while the restaurant is closed', 'SLOT_REQUIRED'],
  ['is only available for a weekday lunch slot', 'LUNCH_SLOT_REQUIRED'],
  ['order must contain at least one item', 'ORDER_EMPTY'],
  ['more than 50 different items', 'ORDER_TOO_MANY_ITEMS'],
  ['invalid quantity for', 'INVALID_QUANTITY'],
  ['invalid number of selections', 'SELECTION_INVALID'],
  ['does not belong to', 'SELECTION_INVALID'],
  ['failed to retrieve choice', 'SELECTION_INVALID'],
  ['addressplaceid required', 'ADDRESS_REQUIRED'],
  ['failed to create payment', 'PAYMENT_FAILED'],
  ['failed to create order', 'ORDER_CREATE_FAILED'],
  ['cashpaymentamount', 'CASH_AMOUNT_INVALID'],
  ['UNAUTHENTICATED', 'UNAUTHENTICATED'],
]

const legacyCodeOf = (message: string): string | null => {
  const lower = message.toLowerCase()
  // "product … not found" and "choice … not found" interpolate names, so match the shape.
  if (/^product .* not found$/u.test(lower)) return 'PRODUCT_NOT_FOUND'
  if (/^choice .* not found$/u.test(lower)) return 'SELECTION_INVALID'
  return LEGACY_MESSAGE_CODES.find(([needle]) => lower.includes(needle.toLowerCase()))?.[1] ?? null
}

/**
 * The translated message to show for a failed GraphQL call, or null when nothing specific is
 * known: the caller then shows its own generic text for the action (never the backend message).
 * `policy` is the ordering policy (`useOrderingPolicy().policy`) the numbers of the message come from;
 * `context` adds parameters the backend cannot know, e.g. `{ productName }` from the cart.
 */
export function describeGqlError(
  raw: unknown,
  policy: OrderingPolicy,
  context: Record<string, unknown> = {},
): GqlErrorDescriptor | null {
  const err = unwrapGqlError(raw)
  if (!err) return null

  if (err.code === GQL_HTTP_ERROR) {
    if (err.status === 429) return { key: 'notify.errors.tooManyRequests' }
    return (err.status ?? 0) >= 500 ? { key: 'notify.errors.serverError' } : null
  }

  const code = err.code ?? legacyCodeOf(err.message)
  return code ? describeErrorCode(code, policy, { ...err.extensions, ...context }) : null
}

/**
 * The translated message for a bare backend code, e.g. one of the issues of a `quoteOrder` answer
 * (`extensions` carries its parameters: `{ minimum: '25' }`). Null for a code the table does not know.
 */
export function describeErrorCode(
  code: string,
  policy: OrderingPolicy,
  extensions: Record<string, unknown> = {},
): GqlErrorDescriptor | null {
  const describe = CODE_TABLE[code]
  return describe ? describe(extensions, policy) : null
}

export interface CouponValidationResult {
  valid: boolean
  errorMessage?: string | null
  errorCode?: string | null
}

/** The message for a coupon the backend refused (`valid: false`), same rules as `describeGqlError`. */
export function describeCouponRefusal(
  result: CouponValidationResult,
  policy: OrderingPolicy,
): GqlErrorDescriptor {
  const code = result.errorCode ?? (result.errorMessage ? legacyCodeOf(result.errorMessage) : null)
  const describe = code ? CODE_TABLE[code] : undefined
  return describe ? describe({}, policy) : { key: 'coupon.invalid' }
}
