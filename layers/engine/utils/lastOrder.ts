import type { Order, OrderStatus } from '../types/index.ts'
import { countUnits, planReorder } from './reorder.ts'

/*
 * Which past order the "your last order" bar offers to order again (components/cart/ReorderBar.vue). Pure: the
 * composable (useLastOrder.ts) loads the orders, this decides.
 *
 *   - An order still in progress wins over everything: the customer is waiting for food, not ordering again, so
 *     nothing is offered.
 *   - Otherwise the most recent order that reached the customer (delivered or picked up). Cancelled and failed
 *     orders are passed over, never offered.
 *   - It must still give at least one cart line (planReorder): an order whose every product is gone is not offered.
 */

const IN_PROGRESS: ReadonlySet<OrderStatus> = new Set<OrderStatus>([
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'AWAITING_PICK_UP',
  'OUT_FOR_DELIVERY',
])
const COMPLETED: ReadonlySet<OrderStatus> = new Set<OrderStatus>(['DELIVERED', 'PICKED_UP'])

type ReorderCandidate = Pick<Order, 'createdAt' | 'status' | 'items'>

const newestFirst = (a: ReorderCandidate, b: ReorderCandidate): number =>
  Date.parse(b.createdAt) - Date.parse(a.createdAt)

/** The order to offer again, or null when there is none (or one is still in progress). */
export function pickReorderableOrder<T extends ReorderCandidate>(orders: readonly T[]): T | null {
  const sorted = orders.toSorted(newestFirst)
  if (sorted.some((order) => IN_PROGRESS.has(order.status))) return null
  return (
    sorted.find(
      (order) => COMPLETED.has(order.status) && planReorder(order.items).lines.length > 0,
    ) ?? null
  )
}

export interface LastOrderSummary {
  /** The names of the first lines, in order. */
  names: string[]
  /** How many more lines the names leave out. */
  more: number
  /** Units in the order (2 × maki + 1 × soup = 3). */
  units: number
}

/** A one-line description of the order: its first `maxNames` product names, how many lines are left, and the units. */
export function summarizeOrder(order: Pick<Order, 'items'>, maxNames = 2): LastOrderSummary {
  const names = order.items.slice(0, maxNames).map((item) => item.product.name)
  return {
    names,
    more: order.items.length - names.length,
    units: countUnits(order.items),
  }
}
