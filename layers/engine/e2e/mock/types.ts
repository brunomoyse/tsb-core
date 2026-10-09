/*
 * Shapes shared by the mock server and the test-side control client. Types only (plus the brand list): this file is
 * imported by Playwright specs (through support/backend.ts) as well as by the Node server, so it stays free of
 * anything that needs a runtime.
 */

export type MockBrand = 'tokyosushi' | 'ygfliege'

/** What the restaurant looks like to the customer. See `restaurantConfigFor` (restaurant.ts). */
export type RestaurantMode =
  /** Ordering enabled, open now: orders as soon as possible. */
  | 'open'
  /** Ordering enabled but closed right now, with today's slots still bookable ("preorder"). */
  | 'scheduled-only'
  /** Ordering enabled, closed, nothing bookable. */
  | 'closed'
  /** Ordering switched off by the restaurant. */
  | 'disabled'

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'AWAITING_PICK_UP'
  | 'PICKED_UP'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'FAILED'

/** Mollie payment statuses the app distinguishes. */
export type PaymentStatus = 'open' | 'pending' | 'paid' | 'canceled' | 'failed' | 'expired'

/** What the fake Mollie page does with the customer. `ask` shows buttons; the others answer on their own. */
export type MollieBehavior = 'ask' | PaymentStatus

export interface GqlFailure {
  /** `extensions.code` of the GraphQL error. */
  code: string
  message?: string
  /** `extensions.productId`, for line-level createOrder errors. */
  productId?: string
}

/** A promo code the mock knows. Unknown codes are refused with COUPON_INVALID. */
export interface CouponRule {
  kind: 'percent' | 'fixed'
  /** Percent (10 = 10 %) or euros ("5.00"), as a number. */
  value: number
  /** Euros of goods needed. */
  minOrder?: number
  /** When set the code is refused with this `COUPON_*` error code (expired, exhausted, rate limited...). */
  refusal?: string
}

/** How the sign-in endpoints (`/auth/session/otp/*`, auth.ts) behave. `POST /__mock/scenario` merges a partial of it. */
export interface OtpScenario {
  /** The one code `otp/verify` accepts; any other is refused with 400. */
  code: string
  /** The address is new: `verify` answers `requiresProfile` and the name must be completed before `finalize`. */
  newAccount: boolean
  /** `otp/request` fails: 422 `invalid_email` (address cannot receive mail), 429 or 500. */
  requestFailure: 'invalid_email' | 'rate_limited' | 'server' | null
  /** The code in the mailbox is past its lifetime: `verify` refuses it (400) until a `resend` issued a fresh one. */
  codeExpired: boolean
  /** `otp/resend` fails with 429 or 500. */
  resendFailure: 'rate_limited' | 'server' | null
  /** `otp/verify` fails with 429 or 500 whatever the code. */
  verifyFailure: 'rate_limited' | 'server' | null
}

/** Everything a spec can flip, in one object: `POST /__mock/scenario` merges a partial of it. */
export interface Scenario {
  restaurant: RestaurantMode
  /** Added to every GraphQL answer. */
  latencyMs: number
  /** `quoteOrder` waits this long before answering. */
  quoteDelayMs: number
  /** `quoteOrder` fails with this GraphQL error (the app falls back to its own maths). */
  quoteFailure: GqlFailure | null
  /** `createOrder` fails with this GraphQL error. */
  createOrderFailure: GqlFailure | null
  /** `createOrder` waits this long before answering. */
  createOrderDelayMs: number
  /**
   * Any root operation of the app, by name (`validateCoupon`, `restaurantConfig`, `myOrders`, ...), fails with this
   * GraphQL error. Set per operation through `MockControl.failOperation`; a `null` value takes the failure away.
   */
  operationFailures: Record<string, GqlFailure>
  /** Where the fake Mollie page sends the customer. */
  mollie: MollieBehavior
  /** Tokens are refused (UNAUTHENTICATED) even when the request carries one: an expired session. */
  rejectSession: boolean
  /** The sign-in endpoints (OTP) and the order invoice download. */
  otp: OtpScenario
  /** `GET /orders/:id/invoice` answers 500. */
  invoiceFailure: boolean
  /** `POST /feedback` (contact form) is refused: 400 invalid input, 400 captcha_failed, 429 or 500. */
  feedbackFailure: 'invalid' | 'captcha_failed' | 'rate_limited' | 'server' | null
  /** Promo codes by (upper-case) code. */
  coupons: Record<string, CouponRule>
  /**
   * What `popularProducts` answers (the menu's "most ordered" row), most ordered first. Empty by default, so the row
   * only shows in the specs that ask for it.
   */
  popularProducts: { productId: string; orderCount: number }[]
}

/** What `POST /__mock/scenario` takes: every field optional, the nested `otp` and `coupons` merged key by key. */
export type ScenarioPatch = Partial<Omit<Scenario, 'otp' | 'coupons' | 'operationFailures'>> & {
  otp?: Partial<OtpScenario>
  coupons?: Record<string, CouponRule>
  /** A `null` value lifts the failure of that operation. */
  operationFailures?: Record<string, GqlFailure | null>
}

export interface MockAddress {
  id: string
  streetName: string
  houseNumber: string
  boxNumber: string | null
  postcode: string
  municipalityName: string
  /** Metres from the restaurant. */
  distance: number
  lat: number
  lng: number
  duration: number
}

export interface MockUser {
  id: string
  email: string
  firstName: string
  lastName: string
  phoneNumber: string | null
  notifyMarketing: boolean
  notifyOrderUpdates: boolean
  deletionRequestedAt: string | null
  /** The saved delivery address (its id is a place id the quote resolves). */
  address: MockAddress | null
}

/** A row of the seed helpers: the state an order is in when the page opens (what the Mollie webhook left behind). */
export interface SeedOrderInput {
  status: OrderStatus
  /** True = online payment (a Mollie payment is attached); false = cash. */
  online: boolean
  /** Payment status of an online order. Default `open`. */
  paymentStatus?: PaymentStatus
  /** Backdates `createdAt` (minutes ago). */
  createdMinutesAgo?: number
  /** One 25,00 EUR line (2 x 12,50): the receipt's subtotal is the items and the total is consistent with them. */
  withItem?: boolean
  /**
   * Mock only: the exact lines of the order (replaces `withItem`), priced from the catalog (product price + the price
   * modifier of every selection). What a re-order or the receipt shows comes from here.
   */
  items?: { productId: string; quantity: number; selections?: OrderSelection[] }[]
  /** The product of that line (default: the first of the catalog, which may carry choice groups a reorder cannot rebuild). */
  productId?: string
  type?: 'PICKUP' | 'DELIVERY'
}

export interface OrderSelection {
  groupId: string
  choiceId: string
  quantity: number
}

export interface OrderPatch {
  status?: OrderStatus
  paymentStatus?: PaymentStatus
  estimatedReadyTime?: string | null
  cancellationReason?:
    | 'OUT_OF_STOCK'
    | 'KITCHEN_CLOSED'
    | 'DELIVERY_AREA'
    | 'DUPLICATE'
    | 'OTHER'
    | null
}

/** One GraphQL root field the app asked for, as the mock logged it (`GET /__mock/state`). */
export interface OperationLog {
  at: string
  op: string
  kind: 'query' | 'mutation' | 'subscription'
  args: Record<string, unknown>
  /** Whether the request carried a bearer token. */
  authenticated: boolean
}

/** One REST call (everything that is not GraphQL: sign-in, invoice), as the mock logged it. */
export interface RestLog {
  at: string
  method: string
  /** Path without the `/api/v1` prefix, e.g. `/auth/session/otp/verify`. */
  path: string
  /** Parsed JSON body, for assertions (codes, names...). */
  body: Record<string, unknown>
  authenticated: boolean
}

export interface MockOrderSummary {
  id: string
  type: string
  status: OrderStatus
  total: string
  paymentStatus: PaymentStatus | null
  /** The `CreateOrderInput` the app sent (undefined for seeded orders). */
  input?: Record<string, unknown>
}

export interface MockStateSnapshot {
  brand: MockBrand
  scenario: Scenario
  user: MockUser
  orders: MockOrderSummary[]
  operations: OperationLog[]
  /** REST calls the app made (sign-in endpoints, invoice download), oldest first. */
  rest: RestLog[]
  /** Fields or root operations the app asked for and the mock has no answer for (the mock lags the app). */
  gaps: string[]
  /** Live GraphQL subscriptions: `myOrderUpdated:<orderId>`, `restaurantConfigUpdated`... */
  subscriptions: string[]
}
