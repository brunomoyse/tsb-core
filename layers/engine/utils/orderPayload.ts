import type { CreateOrderRequest, ProductChoiceSelection } from '../types/index.ts'
import { type PriceableLine, lineTotalCents } from './pricing.ts'
import { centsToDecimalString } from './money.ts'

/*
 * The ONE place the cart becomes an API payload. `createOrder` (checkout.vue) and `quoteOrder`
 * (useOrderQuote) both call it, so the basket that is priced is exactly the basket that is ordered.
 * Pure: it only reads the cart state it is handed.
 */

export interface PayloadLine extends PriceableLine {
  product: PriceableLine['product'] & { id: string }
  selectedChoices?: ProductChoiceSelection[] | null
  selectedChoice?: { id: string; priceModifier: string | number | null | undefined } | null
}

/** The slice of the cart store the payload is built from (the store satisfies it as it is). */
export interface PayloadSource {
  products: PayloadLine[]
  collectionOption: 'PICKUP' | 'DELIVERY'
  paymentOption: 'ONLINE' | 'CASH'
  address?: { id: string } | null
  addressExtra?: string | null
  couponCode?: string | null
  orderNote?: string | null
  orderExtra?: { name: string; options?: string[] }[] | null
  preferredReadyTime?: string | null
  cashPaymentAmount?: string | number | null
}

export type OrderItemPayload = CreateOrderRequest['items'][number]

/** One order line: its selections, or the legacy single choice when it has none. */
export function orderItemPayload(line: PayloadLine): OrderItemPayload {
  const hasSelections = (line.selectedChoices?.length ?? 0) > 0
  return {
    productId: line.product.id,
    quantity: line.quantity,
    ...(hasSelections
      ? { selections: line.selectedChoices ?? [] }
      : line.selectedChoice
        ? { choiceId: line.selectedChoice.id }
        : {}),
  }
}

/** The address place id of a delivery order, null for pickup. */
const addressPlaceIdOf = (source: PayloadSource): string | null =>
  source.collectionOption === 'DELIVERY' ? (source.address?.id ?? null) : null

/** The `createOrder` input for the cart. */
export function buildCreateOrderInput(source: PayloadSource): CreateOrderRequest {
  // Fixed slots are RFC3339 values; ASAP is null.
  const cashAmount =
    source.paymentOption === 'CASH' ? String(source.cashPaymentAmount ?? '').trim() || null : null
  return {
    orderType: source.collectionOption,
    isOnlinePayment: source.paymentOption === 'ONLINE',
    addressPlaceId: addressPlaceIdOf(source),
    addressExtra: source.addressExtra ?? null,
    couponCode: source.couponCode ?? null,
    orderNote: source.orderNote?.trim() || null,
    orderExtra: source.orderExtra ?? null,
    items: source.products.map(orderItemPayload),
    preferredReadyTime: source.preferredReadyTime || null,
    cashPaymentAmount: cashAmount,
  }
}

export interface QuoteOrderInput {
  orderType: 'PICKUP' | 'DELIVERY'
  isOnlinePayment: boolean
  addressPlaceId: string | null
  preferredReadyTime: string | null
  couponCode: string | null
  items: (OrderItemPayload & { expectedLineTotal: string })[]
}

/**
 * The `quoteOrder` input: the same basket as `buildCreateOrderInput` (same item builder), without
 * the fields that only matter once the order is placed (note, extras, cash amount). Each line also
 * carries the total the cart currently shows for it, so the server can answer PRICE_CHANGED.
 */
export function buildQuoteInput(source: PayloadSource): QuoteOrderInput {
  return {
    orderType: source.collectionOption,
    isOnlinePayment: source.paymentOption === 'ONLINE',
    addressPlaceId: addressPlaceIdOf(source),
    preferredReadyTime: source.preferredReadyTime || null,
    couponCode: source.couponCode || null,
    items: source.products.map((line) => ({
      ...orderItemPayload(line),
      expectedLineTotal: centsToDecimalString(lineTotalCents(line)),
    })),
  }
}
