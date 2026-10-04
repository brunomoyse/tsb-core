import { type MockCategory, type MockProduct, findProduct } from './catalog/index.ts'
import { EXCLUDED_POSTCODES, POLICY_CENTS, deliveryFeeCents, findPlace } from './restaurant.ts'
import type { CouponRule } from './types.ts'

/*
 * `quoteOrder` / `createOrder` pricing, a mirror of the engine's utils/pricing.ts + cartTotals.ts and of tsb-service's
 * order_quote.go / order_pricing.go: goods, pickup discount (10 % of the discountable goods from 20,00), delivery fee by
 * distance, coupon, 0,30 online fee, total rounded to 0,10. Each discount is snapped to the 0,10 step on its own, the two
 * together never exceed the basket (scaled down proportionally), and the online fee is added after the clamp, as
 * `OrderTotal` does. Everything in cents inside, decimal strings out.
 */

export interface QuoteItemInput {
  productId: string
  quantity: number
  selections?: { groupId: string; choiceId: string; quantity: number }[] | null
  choiceId?: string | null
  expectedLineTotal?: string | null
}

export interface QuoteInput {
  orderType: 'PICKUP' | 'DELIVERY'
  isOnlinePayment: boolean
  addressPlaceId?: string | null
  couponCode?: string | null
  items?: QuoteItemInput[]
}

export const money = (cents: number): string => (cents / 100).toFixed(2)
export const toCents = (value: string | number): number => Math.round(Number(value) * 100)

export interface PricedLine {
  productId: string
  quantity: number
  productPrice: string | null
  unitPrice: string
  lineTotal: string
  selections: { groupId: string; choiceId: string; quantity: number; priceModifier: string }[]
  issues: { code: string; currentPrice: string | null }[]
}

function priceLine(catalog: MockCategory[], item: QuoteItemInput) {
  const product: MockProduct | undefined = findProduct(catalog, item.productId)
  if (!product) {
    const line: PricedLine = {
      productId: item.productId,
      quantity: item.quantity,
      productPrice: null,
      unitPrice: '0.00',
      lineTotal: '0.00',
      selections: [],
      issues: [{ code: 'PRODUCT_NOT_FOUND', currentPrice: null }],
    }
    return { line, totalCents: 0, discountableCents: 0 }
  }
  const issues: PricedLine['issues'] = []
  if (!product.isAvailable)
    issues.push({ code: 'PRODUCT_UNAVAILABLE', currentPrice: product.price })
  if (item.quantity < 1) issues.push({ code: 'INVALID_QUANTITY', currentPrice: product.price })

  let totalCents = toCents(product.price) * item.quantity
  const selections = (item.selections ?? []).map((selection) => {
    const choice = product.choices.find((candidate) => candidate.id === selection.choiceId)
    totalCents += Math.max(toCents(choice?.priceModifier ?? 0), 0) * selection.quantity
    return {
      groupId: selection.groupId,
      choiceId: selection.choiceId,
      quantity: selection.quantity,
      priceModifier: choice?.priceModifier ?? '0.00',
    }
  })
  // Group rules, scaled by the line quantity (a selection's quantity is line-wide).
  for (const group of product.choiceGroups) {
    const picked = selections
      .filter((selection) => selection.groupId === group.id)
      .reduce((sum, selection) => sum + selection.quantity, 0)
    if (
      picked < group.minSelections * item.quantity ||
      picked > group.maxSelections * item.quantity
    ) {
      issues.push({ code: 'SELECTION_INVALID', currentPrice: product.price })
      break
    }
  }
  if (item.expectedLineTotal && toCents(item.expectedLineTotal) !== totalCents)
    issues.push({ code: 'PRICE_CHANGED', currentPrice: product.price })

  const quantity = Math.max(item.quantity, 1)
  const line: PricedLine = {
    productId: product.id,
    quantity: item.quantity,
    productPrice: product.price,
    unitPrice: money(Math.floor((2 * totalCents + quantity) / (2 * quantity))),
    lineTotal: money(totalCents),
    selections,
    issues,
  }
  return { line, totalCents, discountableCents: product.isDiscountable ? totalCents : 0 }
}

/** Discount of a coupon on a goods subtotal (cents), or the refusal code. */
export function evaluateCoupon(
  rule: CouponRule | undefined,
  subtotalCents: number,
): { discountCents: number } | { errorCode: string; minimum?: string } {
  if (!rule) return { errorCode: 'COUPON_INVALID' }
  if (rule.refusal) return { errorCode: rule.refusal }
  if (rule.minOrder && subtotalCents < toCents(rule.minOrder))
    return { errorCode: 'COUPON_MIN_ORDER_NOT_MET', minimum: money(toCents(rule.minOrder)) }
  const discount =
    rule.kind === 'percent' ? Math.round((subtotalCents * rule.value) / 100) : toCents(rule.value)
  return { discountCents: Math.min(discount, subtotalCents) }
}

export interface QuoteContext {
  catalog: MockCategory[]
  coupons: Record<string, CouponRule>
  authenticated: boolean
  deliveryEnabled: boolean
}

export function quote(context: QuoteContext, input: QuoteInput) {
  const priced = (input.items ?? []).map((item) => priceLine(context.catalog, item))
  const subtotal = priced.reduce((sum, entry) => sum + entry.totalCents, 0)
  const discountable = priced.reduce((sum, entry) => sum + entry.discountableCents, 0)
  const issues: { code: string; minimum: string | null }[] = []
  const isDelivery = input.orderType === 'DELIVERY'

  let deliveryFee = 0
  if (isDelivery) {
    if (!context.deliveryEnabled) issues.push({ code: 'DELIVERY_UNAVAILABLE', minimum: null })
    if (subtotal < POLICY_CENTS.deliveryMinimum)
      issues.push({
        code: 'DELIVERY_MINIMUM_NOT_MET',
        minimum: money(POLICY_CENTS.deliveryMinimum),
      })
    const address = findPlace(input.addressPlaceId)
    if (!input.addressPlaceId) issues.push({ code: 'ADDRESS_REQUIRED', minimum: null })
    else if (!address) issues.push({ code: 'ADDRESS_UNRESOLVABLE', minimum: null })
    else if (EXCLUDED_POSTCODES.includes(address.postcode))
      issues.push({ code: 'DELIVERY_AREA_EXCLUDED', minimum: null })
    else {
      const fee = deliveryFeeCents(address.distance)
      if (fee === null) issues.push({ code: 'DELIVERY_OUT_OF_ZONE', minimum: null })
      else deliveryFee = fee
    }
  }

  const step = POLICY_CENTS.totalRoundingStep
  // Round half up to the step (the backend's RoundToNearest10Cents, for amounts that are never negative).
  const snap = (cents: number): number => Math.round(cents / step) * step

  let pickupDiscount =
    !isDelivery && subtotal >= POLICY_CENTS.pickupDiscountMinimum
      ? snap(Math.round((discountable * POLICY_CENTS.pickupDiscountRateBp) / 10_000))
      : 0

  let coupon: { code: string; valid: boolean; errorCode: string | null } | null = null
  let couponDiscount = 0
  const code = input.couponCode?.trim()
  if (code) {
    if (context.authenticated) {
      const result = evaluateCoupon(context.coupons[code.toUpperCase()], subtotal)
      if ('errorCode' in result) {
        coupon = { code, valid: false, errorCode: result.errorCode }
        if (result.minimum)
          issues.push({ code: 'COUPON_MIN_ORDER_NOT_MET', minimum: result.minimum })
      } else {
        coupon = { code, valid: true, errorCode: null }
        couponDiscount = snap(result.discountCents)
      }
    } else {
      // The server does not evaluate a coupon for a caller it cannot identify (COUPON_NOT_EVALUATED in the engine).
      coupon = { code, valid: false, errorCode: 'UNAUTHENTICATED' }
    }
  }

  // Together the discounts never exceed goods + delivery: scale both down, snapped (order_pricing.go step 7).
  const goodsAndFee = subtotal + deliveryFee
  if (pickupDiscount + couponDiscount > goodsAndFee) {
    const ratio = goodsAndFee / (pickupDiscount + couponDiscount)
    pickupDiscount = snap(pickupDiscount * ratio)
    couponDiscount = snap(goodsAndFee - pickupDiscount)
  }

  const onlineFee = input.isOnlinePayment ? POLICY_CENTS.onlinePaymentFee : 0
  const total = snap(Math.max(goodsAndFee - pickupDiscount - couponDiscount, 0) + onlineFee)

  return {
    lines: priced.map((entry) => entry.line),
    subtotal: money(subtotal),
    deliveryFee: money(deliveryFee),
    pickupDiscount: money(pickupDiscount),
    couponDiscount: money(couponDiscount),
    onlineFee: money(onlineFee),
    total: money(total),
    coupon,
    issues,
  }
}

export type Quote = ReturnType<typeof quote>
