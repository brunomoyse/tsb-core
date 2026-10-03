import { DELIVERY_MINIMUM_CENTS, TRANSACTION_FEE_CENTS } from '../lib/fees.ts'
import { OUT_OF_ZONE, deliveryFeeCentsForDistance, isExcludedPostcode } from '../lib/delivery.ts'
import { type PriceableLine, lineTotalCents } from './pricing.ts'
import { amountToMinimumCents, computePayableCents, pickupDiscountCents } from './payable.ts'

/*
 * Every cart total, as pure integer-cents maths: the composable `useCartTotals` only wraps this in
 * `computed`s, and the parity test (`cartTotals.parity.test.mjs`) runs it against a from-scratch
 * re-implementation of the backend's CreateOrder.
 *
 * Nothing here is ever a float: amounts come in as cents (or as the API's decimal strings, parsed
 * once by `lineTotalCents`) and leave as cents.
 */

export interface TotalsLine extends PriceableLine {
  product: PriceableLine['product'] & { isDiscountable?: boolean | null }
}

export interface CartTotalsInput {
  lines: TotalsLine[]
  collectionOption: 'PICKUP' | 'DELIVERY'
  /** The delivery address, once chosen (distance in meters). */
  address?: { distance: number; postcode?: string | null } | null
  paymentOption: 'ONLINE' | 'CASH'
  /** What validateCoupon granted, in cents (0 without a coupon). */
  couponDiscountCents?: number
}

export interface CartTotalsCents {
  /** Σ line totals: base × qty + Σ(modifier × selection qty). */
  subtotalCents: number
  pickupDiscountCents: number
  /** 0 for pickup or while the address is unknown; OUT_OF_ZONE (-1) when it cannot be delivered. */
  deliveryFeeCents: number
  couponDiscountCents: number
  /** The PSP surcharge when the payment option is ONLINE, else 0. */
  onlineFeeCents: number
  /** What the customer pays (the amount Mollie is asked for). */
  payableCents: number
  hasBreakdown: boolean
  isMinimumReached: boolean
  /** Delivery only: what the basket still lacks for the minimum (0 when reached / pickup). */
  amountToDeliveryMinimumCents: number
}

export function computeCartTotals(input: CartTotalsInput): CartTotalsCents {
  const lines = input.lines.map((item) => ({
    totalCents: lineTotalCents(item),
    isDiscountable: Boolean(item.product.isDiscountable),
  }))
  const subtotalCents = lines.reduce((cents, line) => cents + line.totalCents, 0)

  // Integer cents, same rule as the backend (see pickupDiscountCents).
  const pickupDiscount =
    input.collectionOption === 'PICKUP' ? pickupDiscountCents(lines, subtotalCents) : 0

  let deliveryFeeCents = 0
  if (input.collectionOption === 'DELIVERY' && input.address) {
    deliveryFeeCents = isExcludedPostcode(input.address.postcode)
      ? OUT_OF_ZONE
      : deliveryFeeCentsForDistance(input.address.distance)
  }

  const couponDiscountCents = Math.max(input.couponDiscountCents ?? 0, 0)
  const onlineFeeCents = input.paymentOption === 'ONLINE' ? TRANSACTION_FEE_CENTS : 0
  const isDelivery = input.collectionOption === 'DELIVERY'

  return {
    subtotalCents,
    pickupDiscountCents: pickupDiscount,
    deliveryFeeCents,
    couponDiscountCents,
    onlineFeeCents,
    payableCents: computePayableCents({
      subtotalCents,
      pickupDiscountCents: pickupDiscount,
      couponDiscountCents,
      // OUT_OF_ZONE and "not known yet" both count as 0, like the backend before the address resolves.
      deliveryFeeCents: isDelivery ? Math.max(deliveryFeeCents, 0) : 0,
      onlineFeeCents,
    }),
    hasBreakdown: isDelivery || pickupDiscount > 0 || couponDiscountCents > 0 || onlineFeeCents > 0,
    isMinimumReached: isDelivery ? subtotalCents >= DELIVERY_MINIMUM_CENTS : true,
    amountToDeliveryMinimumCents: isDelivery
      ? amountToMinimumCents(subtotalCents, DELIVERY_MINIMUM_CENTS)
      : 0,
  }
}
