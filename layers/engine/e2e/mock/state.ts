import { type MockCategory, catalogFor, findProduct } from './catalog/index.ts'
import type {
  MockAddress,
  MockBrand,
  MockOrderSummary,
  MockStateSnapshot,
  MockUser,
  OperationLog,
  OrderPatch,
  OrderStatus,
  PaymentStatus,
  RestLog,
  Scenario,
  SeedOrderInput,
} from './types.ts'
import { money } from './pricing.ts'

/*
 * All the mock's mutable state, in one object per server process (one brand per process). `reset()` brings it back to
 * the defaults; the Playwright `backend` fixture calls it before every test.
 */

export interface MockPayment {
  id: string
  status: PaymentStatus
  createdAt: string
  links: { checkout: { href: string } } | null
}

export interface MockOrderLine {
  productId: string
  quantity: number
  unitPrice: string
  lineTotal: string
  selections: { groupId: string; choiceId: string; quantity: number }[]
}

export interface MockOrder {
  id: string
  createdAt: string
  updatedAt: string
  status: OrderStatus
  type: 'PICKUP' | 'DELIVERY'
  isOnlinePayment: boolean
  discountAmount: string
  deliveryFee: string
  transactionFee: string
  totalPrice: string
  couponCode: string | null
  cashPaymentAmount: string | null
  estimatedReadyTime: string | null
  addressExtra: string | null
  orderNote: string | null
  orderExtra: unknown
  cancellationReason: OrderPatch['cancellationReason']
  address: MockAddress | null
  payment: MockPayment | null
  items: MockOrderLine[]
  /** The `createOrder` input, for assertions. Absent on seeded orders. */
  input?: Record<string, unknown>
  /** Where the fake Mollie page sends the customer back to (origin + locale of the createOrder request). */
  returnTo?: { origin: string; locale: string }
}

export const defaultScenario = (): Scenario => ({
  restaurant: 'open',
  latencyMs: 0,
  quoteDelayMs: 0,
  quoteFailure: null,
  createOrderFailure: null,
  createOrderDelayMs: 0,
  mollie: 'ask',
  rejectSession: false,
  otp: {
    code: '123456',
    newAccount: false,
    requestFailure: null,
    codeExpired: false,
    resendFailure: null,
    verifyFailure: null,
  },
  invoiceFailure: false,
  coupons: {
    WELCOME10: { kind: 'percent', value: 10, minOrder: 15 },
    FIVEOFF: { kind: 'fixed', value: 5 },
    EXPIRED: { kind: 'fixed', value: 5, refusal: 'COUPON_INVALID' },
    BIGSPENDER: { kind: 'fixed', value: 10, minOrder: 200 },
  },
})

export const defaultUser = (): MockUser => ({
  id: '00000000-0000-4000-8000-00000000e2e0',
  email: 'e2e@example.test',
  firstName: 'Eva',
  lastName: 'Mock',
  phoneNumber: null,
  notifyMarketing: false,
  notifyOrderUpdates: true,
  deletionRequestedAt: null,
  address: null,
})

type Listener = (payload: unknown) => void

/** An OTP login in progress (`POST /auth/session/otp/request` created it). */
export interface OtpSession {
  id: string
  /** Rotated by every verify, as Zitadel's session token is. */
  token: string
  loginName: string
  verified: boolean
  /** A new account whose name has not been sent yet: `finalize` refuses until `complete-profile`. */
  needsProfile: boolean
}

/** An OIDC authorize request the app started (the login page shows its id as `?authRequest=`). */
export interface AuthRequest {
  id: string
  redirectUri: string
  state: string
  nonce: string | null
  codeChallenge: string | null
}

export class AuthState {
  sessions = new Map<string, OtpSession>()
  requests = new Map<string, AuthRequest>()
  /** Authorization codes handed out by `finalize`, waiting for the token exchange. */
  codes = new Map<string, AuthRequest>()
  /** Refresh tokens issued: the refresh grant accepts only these. */
  refreshTokens = new Set<string>()
  private seq = 0

  next(prefix: string): string {
    this.seq += 1
    return `${prefix}-${this.seq}`
  }

  /** Remembers an authorize request (its query string) and returns the id the login page carries as `?authRequest=`. */
  startRequest(params: URLSearchParams): string {
    const id = this.next('authreq')
    this.requests.set(id, {
      id,
      redirectUri: params.get('redirect_uri') ?? '',
      state: params.get('state') ?? '',
      nonce: params.get('nonce'),
      codeChallenge: params.get('code_challenge'),
    })
    return id
  }
}

export class MockState {
  readonly brand: MockBrand
  scenario: Scenario = defaultScenario()
  user: MockUser = defaultUser()
  catalog: MockCategory[]
  orders = new Map<string, MockOrder>()
  operations: OperationLog[] = []
  rest: RestLog[] = []
  /** Sign-in state (auth.ts, zitadel.ts): OTP sessions, pending authorize requests, issued codes and refresh tokens. */
  auth = new AuthState()
  gaps = new Set<string>()
  private readonly listeners = new Map<string, Set<Listener>>()
  private orderSeq = 0
  private paymentSeq = 0

  constructor(brand: MockBrand) {
    this.brand = brand
    this.catalog = catalogFor(brand)
  }

  reset(): void {
    this.scenario = defaultScenario()
    this.user = defaultUser()
    this.catalog = catalogFor(this.brand)
    this.orders.clear()
    this.operations.length = 0
    this.rest.length = 0
    this.auth = new AuthState()
    this.gaps.clear()
    // Live sockets stay connected across a reset: only the data is forgotten.
  }

  log(entry: OperationLog): void {
    this.operations.push(entry)
    if (this.operations.length > 500) this.operations.shift()
  }

  logRest(entry: RestLog): void {
    this.rest.push(entry)
    if (this.rest.length > 500) this.rest.shift()
  }

  noteGap(gap: string): void {
    if (!this.gaps.has(gap)) console.warn(`[mock] GAP ${gap}`)
    this.gaps.add(gap)
  }

  // ── pub/sub: the WebSocket endpoint subscribes, state changes publish ──

  subscribe(topic: string, listener: Listener): () => void {
    let set = this.listeners.get(topic)
    if (!set) this.listeners.set(topic, (set = new Set()))
    set.add(listener)
    return () => {
      set.delete(listener)
      if (set.size === 0) this.listeners.delete(topic)
    }
  }

  publish(topic: string, payload: unknown): void {
    for (const listener of this.listeners.get(topic) ?? []) listener(payload)
  }

  topics(): string[] {
    return [...this.listeners.entries()].flatMap(([topic, set]) => Array(set.size).fill(topic))
  }

  // ── orders ──

  nextOrderId(): string {
    this.orderSeq += 1
    return `00000000-0000-4000-8000-${String(this.orderSeq).padStart(12, '0')}`
  }

  nextPaymentId(): string {
    this.paymentSeq += 1
    return `tr_mock_${String(this.paymentSeq).padStart(6, '0')}`
  }

  /**
   * An order in the state the Mollie webhook (or the kitchen) left it in, without going through `createOrder`.
   * The counterpart of the real-backend `seedOrder` (support/db.ts): same inputs, same resulting rows.
   */
  seedOrder(input: SeedOrderInput): MockOrder {
    const id = this.nextOrderId()
    const created = new Date(Date.now() - (input.createdMinutesAgo ?? 0) * 60_000).toISOString()
    const fee = input.online ? 30 : 0
    const itemsCents = input.withItem ? 2500 : 0
    const product = this.catalog.flatMap((category) => category.products)[0]
    const order: MockOrder = {
      id,
      createdAt: created,
      updatedAt: created,
      status: input.status,
      type: input.type ?? 'PICKUP',
      isOnlinePayment: input.online,
      discountAmount: '0.00',
      deliveryFee: '0.00',
      transactionFee: money(fee),
      totalPrice: money(input.withItem ? itemsCents + fee : 2500),
      couponCode: null,
      cashPaymentAmount: null,
      estimatedReadyTime: null,
      addressExtra: null,
      orderNote: null,
      orderExtra: null,
      cancellationReason: null,
      address: null,
      payment: input.online
        ? {
            id: this.nextPaymentId(),
            status: input.paymentStatus ?? 'open',
            createdAt: created,
            links: null,
          }
        : null,
      items:
        input.withItem && product
          ? [
              {
                productId: product.id,
                quantity: 2,
                unitPrice: '12.50',
                lineTotal: '25.00',
                selections: [],
              },
            ]
          : [],
    }
    this.orders.set(id, order)
    return order
  }

  /** Changes an order the way the webhook or the kitchen would, and pushes it to its `myOrderUpdated` subscribers. */
  patchOrder(id: string, patch: OrderPatch): MockOrder {
    const order = this.orders.get(id)
    if (!order) throw new Error(`no such order: ${id}`)
    if (patch.status) order.status = patch.status
    if (patch.paymentStatus && order.payment) order.payment.status = patch.paymentStatus
    if (patch.estimatedReadyTime !== undefined) order.estimatedReadyTime = patch.estimatedReadyTime
    if (patch.cancellationReason !== undefined) order.cancellationReason = patch.cancellationReason
    order.updatedAt = new Date().toISOString()
    this.publish(`myOrderUpdated:${id}`, order)
    return order
  }

  /** Orders, newest first, as `myOrders` lists them. */
  ordersNewestFirst(): MockOrder[] {
    return [...this.orders.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  productName(id: string): string | undefined {
    return findProduct(this.catalog, id)?.name
  }

  snapshot(): MockStateSnapshot {
    const orders: MockOrderSummary[] = [...this.orders.values()].map((order) => ({
      id: order.id,
      type: order.type,
      status: order.status,
      total: order.totalPrice,
      paymentStatus: order.payment?.status ?? null,
      input: order.input,
    }))
    return {
      brand: this.brand,
      scenario: this.scenario,
      user: this.user,
      orders,
      operations: this.operations,
      rest: this.rest,
      gaps: [...this.gaps],
      subscriptions: this.topics(),
    }
  }
}
