import { roundCentsToNearest10 } from './money.ts'

/*
 * The amount the customer is actually charged, in integer cents. Mirror of what the backend
 * stores in `orders.total_price` (tsb-service `order/infrastructure/repository.go` CreateOrder
 * and `api/graphql/resolver/order.go` CreateOrder), which is also what Mollie is asked for:
 *
 *   discounts are each snapped to 0,10 € and may never exceed subtotal + delivery fee
 *   total = round10( max(subtotal + deliveryFee − pickupDiscount − couponDiscount, 0) + onlineFee )
 *
 * The online (transaction) fee is added AFTER the discount clamp: the backend scales the
 * discounts down to the goods + delivery amount, so a coupon bigger than the basket leaves
 * exactly the online fee to pay, never less.
 *
 * Every cart / checkout surface shows this one number (audit finding M3).
 */
export interface PayableInput {
    subtotalCents: number
    /** Already rounded to 0,10 € by the caller or not: it is snapped here as the backend does. */
    pickupDiscountCents?: number
    couponDiscountCents?: number
    /** 0 for pickup, or for delivery while the fee is still unknown. Never negative. */
    deliveryFeeCents?: number
    /** The PSP surcharge, only when paying online. */
    onlineFeeCents?: number
}

export function computePayableCents(input: PayableInput): number {
    const goodsAndDelivery = input.subtotalCents + Math.max(input.deliveryFeeCents ?? 0, 0)
    const discounts =
        roundCentsToNearest10(Math.max(input.pickupDiscountCents ?? 0, 0)) +
        roundCentsToNearest10(Math.max(input.couponDiscountCents ?? 0, 0))
    const afterDiscounts = Math.max(goodsAndDelivery - discounts, 0)
    return roundCentsToNearest10(afterDiscounts + Math.max(input.onlineFeeCents ?? 0, 0))
}

/** What is still missing for the delivery minimum, in cents (0 once reached). */
export function amountToMinimumCents(subtotalCents: number, minimumCents: number): number {
    return Math.max(minimumCents - subtotalCents, 0)
}
