import type { MockControl } from '../mock/client'
import type { OrderStatus, PaymentStatus, SeedOrderInput } from '../mock/types'
import { deleteOrder, findUserIdByEmail, seedOrder, settleOrder } from './db'
import { waitForOtpFromZitadel } from './zitadel-otp'

/*
 * What a spec may do to the backend behind the app, whichever backend it is:
 *
 *  - real mode (apps/<brand>/playwright.config.ts): the test server; rows are written straight into its Postgres through
 *    the SSH tunnel (support/db.ts), for the e2e user.
 *  - mock mode (playwright.mock.config.ts): the mock tsb-service (e2e/mock); the same calls go to its control API.
 *
 * A spec that only needs "an order in this state" uses `seedOrder` / `settleOrder` / `deleteOrder` and runs in both. A
 * spec that needs more (a closed restaurant, a failing quote, a coupon...) uses `backend.mock`, which only exists in mock
 * mode; guard it with `test.skip(!backend.isMock, 'needs the mock')`.
 */
export interface Backend {
  readonly mode: 'mock' | 'real'
  readonly isMock: boolean
  /** The mock's control client. Throws in real mode: check `isMock` first. */
  readonly mock: MockControl
  /** An order in a given state, as the Mollie webhook would have left it. Returns its id. */
  seedOrder(input: SeedOrderInput): Promise<string>
  /** Simulates the webhook landing: the order moves to `status` and its payment to `paymentStatus`. */
  settleOrder(orderId: string, status: OrderStatus, paymentStatus: PaymentStatus): Promise<void>
  deleteOrder(orderId: string): Promise<void>
  /**
   * The sign-in code mailed to `email` since `after`: read from Zitadel's event store in real mode, the scenario's
   * `otp.code` in mock mode (the mock accepts exactly that code).
   */
  otpCode(email: string, after: Date): Promise<string>
}

export function mockBackend(control: MockControl): Backend {
  return {
    mode: 'mock',
    isMock: true,
    mock: control,
    seedOrder: (input) => control.seedOrder(input),
    settleOrder: (orderId, status, paymentStatus) =>
      control.settleOrder(orderId, status, paymentStatus),
    deleteOrder: (orderId) => control.deleteOrder(orderId),
    otpCode: async () => (await control.state()).scenario.otp.code,
  }
}

function realUserId(): string {
  const email = process.env.E2E_USER_EMAIL
  if (!email) throw new Error('E2E_USER_EMAIL must be set')
  return findUserIdByEmail(email)
}

export function realBackend(): Backend {
  return {
    mode: 'real',
    isMock: false,
    get mock(): MockControl {
      throw new Error(
        'mock control is not available against the real backend: guard with backend.isMock',
      )
    },
    seedOrder: async (input) =>
      seedOrder({
        userId: realUserId(),
        status: input.status,
        online: input.online,
        paymentStatus: input.paymentStatus,
        createdMinutesAgo: input.createdMinutesAgo,
        withItem: input.withItem,
      }),
    settleOrder: async (orderId, status, paymentStatus) => {
      settleOrder(orderId, status, paymentStatus)
    },
    deleteOrder: async (orderId) => {
      deleteOrder(orderId)
    },
    otpCode: (email, after) => waitForOtpFromZitadel(email, { after }),
  }
}
