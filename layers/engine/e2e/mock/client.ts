import type {
  CouponRule,
  GqlFailure,
  MockAddress,
  MockStateSnapshot,
  MockUser,
  OperationLog,
  OrderPatch,
  OrderStatus,
  PaymentStatus,
  RestaurantMode,
  Scenario,
  SeedOrderInput,
} from './types.ts'

/*
 * Test-side handle on the mock's control API (control.ts). Specs reach it as `backend.mock` (support/backend.ts), which
 * only exists in mock mode; the Playwright `backend` fixture resets the mock before every test, so a spec only states
 * what differs from the defaults:
 *
 *   await backend.mock.restaurant('closed')
 *   await backend.mock.scenario({ quoteDelayMs: 2_000, mollie: 'paid' })
 *   await backend.mock.user({ phoneNumber: '+32470123456', address: 'place-home' })
 *   const id = await backend.mock.seedOrder({ status: 'PENDING', online: true, paymentStatus: 'open' })
 *   await backend.mock.settleOrder(id, 'CONFIRMED', 'paid')      // pushed to the page over the WebSocket
 */
export class MockControl {
  readonly url: string

  constructor(url: string) {
    this.url = url.replace(/\/+$/u, '')
  }

  private async call<T>(method: string, path: string, body?: unknown): Promise<T> {
    const response = await fetch(`${this.url}/__mock${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    if (!response.ok)
      throw new Error(`mock ${method} ${path}: ${response.status} ${await response.text()}`)
    return (await response.json()) as T
  }

  state(): Promise<MockStateSnapshot> {
    return this.call('GET', '/state')
  }

  async reset(): Promise<void> {
    await this.call('POST', '/reset', {})
  }

  /** Merges a partial scenario (see `Scenario` in types.ts). */
  async scenario(patch: Partial<Scenario>): Promise<void> {
    await this.call('POST', '/scenario', patch)
  }

  /** Makes one root operation of the app (`validateCoupon`, `restaurantConfig`...) fail with a GraphQL error; null repairs it. */
  async failOperation(op: string, failure: GqlFailure | null): Promise<void> {
    await this.call('POST', '/scenario', { operationFailures: { [op]: failure } })
  }

  /** Open | scheduled-only (closed now, today's slots bookable) | closed | disabled. Pushed to open pages. */
  restaurant(mode: RestaurantMode): Promise<void> {
    return this.scenario({ restaurant: mode })
  }

  /** Defines (or overrides) a promo code. Unknown codes are refused with COUPON_INVALID. */
  coupon(code: string, rule: CouponRule): Promise<void> {
    return this.scenario({ coupons: { [code.toUpperCase()]: rule } })
  }

  /** Merges profile fields; `address` is a place id from PLACES (restaurant.ts) or null. */
  async user(
    patch: Partial<Omit<MockUser, 'address'>> & { address?: MockAddress['id'] | null },
  ): Promise<void> {
    await this.call('POST', '/user', patch)
  }

  async seedOrder(input: SeedOrderInput): Promise<string> {
    return (await this.call<{ id: string }>('POST', '/orders', input)).id
  }

  async patchOrder(id: string, patch: OrderPatch): Promise<void> {
    await this.call('POST', `/orders/${id}`, patch)
  }

  /** What the Mollie webhook does: order and payment move, and the change is pushed to `myOrderUpdated` subscribers. */
  settleOrder(id: string, status: OrderStatus, paymentStatus?: PaymentStatus): Promise<void> {
    return this.patchOrder(id, { status, paymentStatus })
  }

  async deleteOrder(id: string): Promise<void> {
    await this.call('DELETE', `/orders/${id}`)
  }

  /** Patches a catalog product ({ price: '5.00', isAvailable: false }); pushed to open menus as `productUpdated`. */
  async product(id: string, patch: Record<string, unknown>): Promise<void> {
    await this.call('POST', `/products/${id}`, patch)
  }

  // ── what the app did ──

  /** The GraphQL root fields the app called, oldest first, optionally only `op`. */
  async operations(op?: string): Promise<OperationLog[]> {
    const { operations } = await this.state()
    return op ? operations.filter((entry) => entry.op === op) : operations
  }

  /** The `CreateOrderInput`s the app sent that the mock accepted, oldest first. */
  async createdOrders(): Promise<MockStateSnapshot['orders']> {
    return (await this.state()).orders.filter((order) => order.input !== undefined)
  }

  /** Polls until `predicate` holds for the state (the app calls the API on its own schedule). */
  async waitFor(
    predicate: (state: MockStateSnapshot) => boolean,
    { timeout = 10_000, message = 'mock state never matched' } = {},
  ): Promise<MockStateSnapshot> {
    const deadline = Date.now() + timeout
    for (;;) {
      const state = await this.state()
      if (predicate(state)) return state
      if (Date.now() > deadline) throw new Error(message)
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }
}
