import { type MoneyLike, toCents } from './money.ts'

/*
 * The money breakdown of a placed order for the confirmation page (audit M24), in integer cents.
 * Built from what the order query exposes: the item totals, the delivery fee, `discountAmount`
 * (pickup discount + coupon, the API does not split them), the online fee (`transactionFee`) and the
 * stored total. Pure, so it is covered by a node test.
 *
 * The stored total is rounded once to 0,10 € after summing (see payable.ts); when that rounding moves
 * the sum the receipt shows it as its own line, so the rows always add up to the total shown.
 */
export interface ReceiptOrder {
    type: string
    isOnlinePayment: boolean
    items: { totalPrice: MoneyLike }[]
    deliveryFee?: MoneyLike
    discountAmount?: MoneyLike
    transactionFee?: MoneyLike
    totalPrice: MoneyLike
    couponCode?: string | null
    cashPaymentAmount?: MoneyLike
}

export interface OrderReceipt {
    subtotalCents: number
    /** Delivery orders only (0 = free); null for pickup. */
    deliveryFeeCents: number | null
    /** Pickup discount + coupon discount, as a positive amount. */
    discountCents: number
    couponCode: string | null
    onlineFeeCents: number
    /** The 0,10 € rounding of the total, signed (0 when none). */
    roundingCents: number
    totalCents: number
    paymentMethod: 'ONLINE' | 'CASH'
    /** Cash orders where the customer said what they will pay with. */
    cashPaymentCents: number | null
    /** What the courier / the counter gives back; null unless a cash amount above the total was given. */
    changeDueCents: number | null
}

export function buildOrderReceipt(order: ReceiptOrder): OrderReceipt {
    const subtotalCents = order.items.reduce((sum, item) => sum + toCents(item.totalPrice), 0)
    const deliveryFeeCents = order.type === 'DELIVERY' ? Math.max(toCents(order.deliveryFee), 0) : null
    const discountCents = Math.max(toCents(order.discountAmount), 0)
    const onlineFeeCents = Math.max(toCents(order.transactionFee), 0)
    const totalCents = toCents(order.totalPrice)

    const unrounded = Math.max(subtotalCents + (deliveryFeeCents ?? 0) - discountCents, 0) + onlineFeeCents
    const cashPaymentCents = !order.isOnlinePayment && toCents(order.cashPaymentAmount) > 0 ? toCents(order.cashPaymentAmount) : null

    return {
        subtotalCents,
        deliveryFeeCents,
        discountCents,
        couponCode: order.couponCode ?? null,
        onlineFeeCents,
        roundingCents: totalCents - unrounded,
        totalCents,
        paymentMethod: order.isOnlinePayment ? 'ONLINE' : 'CASH',
        cashPaymentCents,
        changeDueCents: cashPaymentCents !== null && cashPaymentCents > totalCents ? cashPaymentCents - totalCents : null,
    }
}
