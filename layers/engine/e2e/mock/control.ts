import type { MockState } from './state.ts'
import { findPlace } from './restaurant.ts'
import { findProduct } from './catalog/index.ts'
import type { MockUser, Scenario, SeedOrderInput } from './types.ts'

/*
 * The control API (`/__mock/*`): what a spec uses to put the mock in the situation it wants to test. JSON in, JSON out.
 * The typed client for it is `MockControl` (client.ts); this file is the server side.
 *
 *   GET    /__mock/health
 *   GET    /__mock/state                 snapshot: scenario, user, orders, operations the app made, gaps
 *   POST   /__mock/reset                 back to the defaults (the fixture does this before every test)
 *   POST   /__mock/scenario              merge a partial Scenario (coupons and operationFailures are merged per key; a null failure clears it)
 *   POST   /__mock/user                  merge a partial user; `address` is a place id (see restaurant.ts PLACES) or null
 *   POST   /__mock/orders                seed an order (SeedOrderInput) -> { id }
 *   POST   /__mock/orders/:id            change an order (OrderPatch), pushed to its subscribers
 *   DELETE /__mock/orders/:id
 *   POST   /__mock/products/:id          patch a catalog product ({ price, isAvailable, ... }), pushed as productUpdated
 */

export interface ControlResult {
  status: number
  body: unknown
}

const ok = (body: unknown = { ok: true }): ControlResult => ({ status: 200, body })
const bad = (message: string, status = 400): ControlResult => ({ status, body: { error: message } })

export function handleControl(
  state: MockState,
  method: string,
  path: string,
  body: Record<string, unknown>,
): ControlResult | null {
  if (!path.startsWith('/__mock/')) return null
  const route = path.slice('/__mock'.length)

  if (route === '/health') return ok()
  if (route === '/state' && method === 'GET') return ok(state.snapshot())
  if (route === '/reset' && method === 'POST') {
    state.reset()
    return ok()
  }

  if (route === '/scenario' && method === 'POST') {
    const patch = body as Partial<Omit<Scenario, 'operationFailures'>> & {
      operationFailures?: Record<string, Scenario['operationFailures'][string] | null>
    }
    const before = state.scenario.restaurant
    const operationFailures = { ...state.scenario.operationFailures }
    for (const [operation, failure] of Object.entries(patch.operationFailures ?? {})) {
      if (failure === null) delete operationFailures[operation]
      else operationFailures[operation] = failure
    }
    state.scenario = {
      ...state.scenario,
      ...patch,
      coupons: { ...state.scenario.coupons, ...patch.coupons },
      operationFailures,
    }
    if (state.scenario.restaurant !== before) state.publish('restaurantConfigUpdated', null)
    return ok(state.scenario)
  }

  if (route === '/user' && method === 'POST') {
    const { address, ...rest } = body as Partial<Omit<MockUser, 'address'>> & {
      address?: string | null
    }
    Object.assign(state.user, rest)
    if (address !== undefined) {
      const place = findPlace(address)
      if (address && !place) return bad(`unknown place ${address}`)
      state.user.address = place ?? null
    }
    return ok(state.user)
  }

  if (route === '/orders' && method === 'POST') {
    return ok({ id: state.seedOrder(body as unknown as SeedOrderInput).id })
  }

  const orderRoute = /^\/orders\/([^/]+)$/u.exec(route)
  if (orderRoute) {
    const id = orderRoute[1] ?? ''
    if (method === 'DELETE') {
      state.orders.delete(id)
      return ok()
    }
    if (method === 'POST') {
      if (!state.orders.has(id)) return bad(`no such order ${id}`, 404)
      state.patchOrder(id, body)
      return ok()
    }
  }

  const productRoute = /^\/products\/([^/]+)$/u.exec(route)
  if (productRoute && method === 'POST') {
    const product = findProduct(state.catalog, productRoute[1] ?? '')
    if (!product) return bad(`no such product ${productRoute[1]}`, 404)
    Object.assign(product, body)
    state.publish('productUpdated', product)
    return ok()
  }

  return bad(`no control route ${method} ${path}`, 404)
}
