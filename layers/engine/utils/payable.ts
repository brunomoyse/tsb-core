import type { OrderingPolicy } from './orderingPolicy.ts'
import { roundCentsToStep } from './money.ts'

/*
 * The amount the customer is actually charged, in integer cents. Mirror of what the backend
 * stores in `orders.total_price` (tsb-service `order/domain/pricing.go` OrderTotal, used by both the
 * order repository and the quoteOrder preview; the discounts come from `api/graphql/resolver/
 * order_pricing.go`), which is also what Mollie is asked for:
 *
 *   discounts are each snapped to the rounding step (0,10 €) and may never exceed subtotal + delivery fee
 *   total = round( max(subtotal + deliveryFee − pickupDiscount − couponDiscount, 0) + onlineFee )
 *
 * The step, the online fee and the pickup rule are the backend's ordering policy (`RestaurantConfig.policy`).
 *
 * The online (transaction) fee is added AFTER the discount clamp: a coupon bigger than the basket
 * leaves exactly the online fee to pay, never less. The backend clamps the same way since audit
 * PR 2.2 (it used to store a total of -0,05 / -0,10 € when a coupon snapped up to 0,10 € covered a
 * basket that is not a multiple of 10 cents).
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
  /** `policy.totalRoundingStepCents`: every amount is snapped to a multiple of it. */
  roundingStepCents: number
}

export function computePayableCents(input: PayableInput): number {
  const goodsAndDelivery = input.subtotalCents + Math.max(input.deliveryFeeCents ?? 0, 0)
  const discounts =
    roundCentsToStep(Math.max(input.pickupDiscountCents ?? 0, 0), input.roundingStepCents) +
    roundCentsToStep(Math.max(input.couponDiscountCents ?? 0, 0), input.roundingStepCents)
  const afterDiscounts = Math.max(goodsAndDelivery - discounts, 0)
  return roundCentsToStep(
    afterDiscounts + Math.max(input.onlineFeeCents ?? 0, 0),
    input.roundingStepCents,
  )
}

/** What is still missing for the delivery minimum, in cents (0 once reached). */
export function amountToMinimumCents(subtotalCents: number, minimumCents: number): number {
  return Math.max(minimumCents - subtotalCents, 0)
}

/**
 * The takeaway discount in integer cents, exactly like the backend (`resolver/order_pricing.go`): pickup only,
 * the basket (goods + delivery fee, none for pickup) at least `policy.pickupDiscountMinimumCents`, then
 * `policy.pickupDiscountRateBp` of the line totals of the DISCOUNTABLE products only, the sum rounded to the cent
 * (half up, as decimal.Round(0)) and then snapped to the rounding step (`pkg/money.RoundToNearest10Cents`).
 * All in integers: the float version (160.45 € × 0.1 = 16.045000000000002 → 16.00) disagreed with the backend's
 * exact 16.10 €.
 */
export function pickupDiscountCents(
  lines: { totalCents: number; isDiscountable: boolean }[],
  subtotalCents: number,
  policy: Pick<
    OrderingPolicy,
    'pickupDiscountMinimumCents' | 'pickupDiscountRateBp' | 'totalRoundingStepCents'
  >,
): number {
  if (subtotalCents < policy.pickupDiscountMinimumCents) return 0
  const discountableCents = lines.reduce(
    (sum, line) => (line.isDiscountable ? sum + line.totalCents : sum),
    0,
  )
  // Basis points of an integer number of cents: round half up to the cent.
  const discountCents = Math.floor(
    (discountableCents * policy.pickupDiscountRateBp + 5_000) / 10_000,
  )
  return roundCentsToStep(discountCents, policy.totalRoundingStepCents)
}
