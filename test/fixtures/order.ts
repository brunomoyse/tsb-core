// Builders for a placed order (what `myOrder` / `myOrders` return), shared by the order-flow tests. Every builder takes
// Overrides, so a test states only what it cares about. Money is a decimal string as the API sends it.
import type { MolliePayment, Order, OrderProduct, User } from '../../layers/engine/types'
import { makeProduct } from './catalog'

export function makeOrderItem(overrides: Partial<OrderProduct> = {}): OrderProduct {
  return {
    quantity: 1,
    totalPrice: '10.00',
    unitPrice: '10.00',
    product: makeProduct(),
    choice: null,
    selections: [],
    ...overrides,
  }
}

export function makePayment(overrides: Partial<MolliePayment> = {}): MolliePayment {
  return {
    createdAt: '2026-10-04T10:00:00Z',
    id: 'tr_1',
    links: null,
    orderId: 'order-1',
    paidAt: null,
    status: 'open',
    ...overrides,
  }
}

/** A pickup order, paid online, still pending. */
export function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    addressExtra: null,
    addressId: null,
    cancellationReason: null,
    couponCode: null,
    createdAt: '2026-10-04T10:00:00Z',
    deliveryFee: null,
    discountAmount: '0.00',
    transactionFee: '0.30',
    estimatedReadyTime: null,
    id: 'order-1',
    isOnlinePayment: true,
    orderExtra: null,
    orderNote: null,
    paymentID: null,
    status: 'PENDING',
    totalPrice: '10.30',
    cashPaymentAmount: null,
    type: 'PICKUP',
    updatedAt: '2026-10-04T10:00:00Z',
    userId: 'user-1',
    address: null,
    customer: null,
    items: [makeOrderItem()],
    payment: makePayment(),
    ...overrides,
  }
}

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    deletionRequestedAt: null,
    email: 'ada@example.test',
    firstName: 'Ada',
    id: 'user-1',
    lastName: 'Lovelace',
    notifyMarketing: false,
    notifyOrderUpdates: true,
    phoneNumber: null,
    address: null,
    ...overrides,
  }
}
