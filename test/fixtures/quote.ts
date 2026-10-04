// A `quoteOrder` answer builder for the unit tests: every field defaults to "nothing special", override what matters.
import type { OrderQuote, QuoteLine } from '../../layers/engine/utils/orderQuote'

export function makeQuoteLine(overrides: Partial<QuoteLine> = {}): QuoteLine {
  return {
    productId: 'product-1',
    quantity: 1,
    selections: [],
    productPrice: '10.00',
    unitPrice: '10.00',
    lineTotal: '10.00',
    issues: [],
    ...overrides,
  }
}

export function makeQuote(overrides: Partial<OrderQuote> = {}): OrderQuote {
  return {
    lines: [makeQuoteLine()],
    subtotal: '10.00',
    deliveryFee: '0.00',
    pickupDiscount: '0.00',
    couponDiscount: '0.00',
    onlineFee: '0.00',
    total: '10.00',
    coupon: null,
    issues: [],
    ...overrides,
  }
}
