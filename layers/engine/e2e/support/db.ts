/*
 * Minimal psql helpers for specs that need to seed or mutate rows the UI cannot
 * reach (e.g. an order whose Mollie payment was cancelled). Same mechanism as
 * global-setup.ts / global-teardown.ts: shell out to psql with the e2e DB env.
 *
 * SQL is passed inside double quotes to the shell, so statements must not
 * contain double quotes or `$`. Values are interpolated into the statement:
 * only ever pass test-controlled input (uuids, fixed enums, the e2e email).
 */
import { getDbEnv } from './db-env'
import { execSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'

export function psql(sql: string): string {
  const dbEnv = getDbEnv()
  return execSync(
    `PGPASSWORD='${dbEnv.DB_PASS}' psql -h ${dbEnv.DB_HOST} -p ${dbEnv.DB_PORT} -U ${dbEnv.DB_USER} -d ${dbEnv.DB_NAME} -t -A -c "${sql.replace(/"/gu, '\\"')}"`,
    { encoding: 'utf-8' },
  ).trim()
}

const sqlString = (value: string): string => `'${value.replace(/'/gu, "''")}'`

/** Id of the application `users` row for an e2e account (matched by email). */
export function findUserIdByEmail(email: string): string {
  const id = psql(`SELECT id FROM users WHERE lower(email) = lower(${sqlString(email)}) LIMIT 1`)
  if (!id) throw new Error(`No users row for ${email} — log in once so the backend provisions it`)
  return id
}

export type SeededOrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'AWAITING_PICK_UP'
  | 'PICKED_UP'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'FAILED'

export interface SeedOrderInput {
  userId: string
  status: SeededOrderStatus
  /** True = Mollie order (a mollie_payments row is created); false = cash. */
  online: boolean
  /** Payment status for online orders (mollie_payments.status): open | pending | paid | canceled | failed | expired. */
  paymentStatus?: string
  /** Backdates `created_at` (minutes ago); default = now. */
  createdMinutesAgo?: number
  /**
   * Adds one 25,00 € `order_product` row (any existing product), so the receipt's subtotal is the items and
   * the stored total is consistent with them (25,00 cash, 25,30 online with its 0,30 € fee). Without it the
   * order has no items and the receipt shows the stored total only.
   */
  withItem?: boolean
}

/*
 * Inserts a PICKUP order (no items unless `withItem`, no address) flagged `is_test` (so it never reaches the
 * kitchen, revenue figures or customer mailings if cleanup fails) plus, for online orders, its
 * mollie_payments row — exactly the rows the Mollie webhook would have left
 * behind. Returns the order id. Columns follow tsb-service/migrations; keep in
 * sync if NOT NULL columns are added to `orders` / `mollie_payments`.
 */
export function seedOrder(input: SeedOrderInput): string {
  const id = randomUUID()
  const fee = input.online ? 0.3 : 0
  const total = input.withItem ? (25 + fee).toFixed(2) : '25.00'
  psql(
    `INSERT INTO orders (id, user_id, order_status, order_type, is_online_payment, total_price, takeaway_discount, coupon_discount, transaction_fee, language, is_test, created_at) ` +
      `VALUES ('${id}', '${input.userId}', '${input.status}', 'PICKUP', ${input.online ? 'TRUE' : 'FALSE'}, ${total}, 0, 0, ${fee.toFixed(2)}, 'fr', TRUE, NOW() - INTERVAL '${Math.trunc(input.createdMinutesAgo ?? 0)} minutes')`,
  )
  if (input.withItem) {
    // Table `order_product` (singular). `vat_rate_applied` is NOT NULL since 20260425120000; the id defaults.
    psql(
      `INSERT INTO order_product (order_id, product_id, unit_price, quantity, total_price, vat_rate_applied) ` +
        `SELECT '${id}', id, 12.50, 2, 25.00, 6.00 FROM products ORDER BY created_at LIMIT 1`,
    )
  }
  if (input.online) {
    psql(
      `INSERT INTO mollie_payments (mollie_payment_id, status, order_id, amount, method, mode) ` +
        `VALUES ('tr_e2e_${id.replace(/-/gu, '')}', '${input.paymentStatus ?? 'open'}', '${id}', 25.30, 'bancontact', 'test')`,
    )
  }
  return id
}

/** Simulates the Mollie webhook landing: order moves to `status`, payment to `paymentStatus`. */
export function settleOrder(
  orderId: string,
  status: SeededOrderStatus,
  paymentStatus: string,
): void {
  psql(`UPDATE mollie_payments SET status = '${paymentStatus}' WHERE order_id = '${orderId}'`)
  psql(`UPDATE orders SET order_status = '${status}', updated_at = NOW() WHERE id = '${orderId}'`)
}

/** Removes a seeded order; payments, items and status history cascade. */
export function deleteOrder(orderId: string): void {
  psql(`DELETE FROM orders WHERE id = '${orderId}'`)
}
