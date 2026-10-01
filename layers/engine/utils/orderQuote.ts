import type { CartTotalsCents } from './cartTotals.ts'
import { DELIVERY_MINIMUM_CENTS } from '../lib/fees.ts'
import { OUT_OF_ZONE } from '../lib/delivery.ts'
import type { QuoteOrderInput } from './orderPayload.ts'
import { toCents } from './money.ts'
import { unwrapGqlError } from './gqlError.ts'

/*
 * Pure side of the server quote (`quoteOrder`, tsb-service order_quote.go): the query, the shapes it
 * returns and everything derived from them. The reactive part (debounce, cancellation, the shared
 * state) is `composables/useOrderQuote.ts`; keeping this file free of Nuxt imports lets
 * `orderQuote.test.mjs` run it with plain node.
 *
 * Money in a quote is a decimal string ("12.50"); it is parsed once with `toCents` here.
 */

export interface QuoteLineIssue {
    /** PRODUCT_NOT_FOUND, PRODUCT_UNAVAILABLE, INVALID_QUANTITY, SELECTION_INVALID, INVALID_PRICE, LUNCH_SLOT_REQUIRED, PRICE_CHANGED. */
    code: string
    /** Today's price of the product, whenever it still exists. */
    currentPrice: string | null
}

export interface QuoteIssue {
    code: string
    /** Euros, for DELIVERY_MINIMUM_NOT_MET and COUPON_MIN_ORDER_NOT_MET. */
    minimum: string | null
}

export interface QuoteSelection {
    groupId: string
    choiceId: string
    quantity: number
    priceModifier: string
}

export interface QuoteLine {
    productId: string
    quantity: number
    selections: QuoteSelection[]
    productPrice: string | null
    unitPrice: string
    lineTotal: string
    issues: QuoteLineIssue[]
}

export interface QuoteCoupon {
    code: string
    valid: boolean
    /** A COUPON_* code, or UNAUTHENTICATED when the caller is not signed in (the coupon was not evaluated). */
    errorCode: string | null
}

export interface OrderQuote {
    lines: QuoteLine[]
    subtotal: string
    deliveryFee: string
    pickupDiscount: string
    couponDiscount: string
    onlineFee: string
    total: string
    coupon: QuoteCoupon | null
    issues: QuoteIssue[]
}

export const QUOTE_ORDER_QUERY = `
    query QuoteOrder($input: QuoteOrderInput!) {
        quoteOrder(input: $input) {
            subtotal
            deliveryFee
            pickupDiscount
            couponDiscount
            onlineFee
            total
            coupon { code valid errorCode }
            issues { code minimum }
            lines {
                productId
                quantity
                productPrice
                unitPrice
                lineTotal
                selections { groupId choiceId quantity priceModifier }
                issues { code currentPrice }
            }
        }
    }
`

/** Codes of the coupon refusals the server reports when it could not evaluate or accept the code. */
export const COUPON_NOT_EVALUATED = 'UNAUTHENTICATED'

/** Stable identity of a quote request: the same cart + collection + payment + coupon + session. */
export const quoteRequestKey = (input: QuoteOrderInput, signedIn: boolean): string =>
    `${signedIn ? 'u' : 'a'}|${JSON.stringify(input)}`

/** Line issues that are resolved by the customer accepting today's price rather than by changing the line. */
const LINE_ISSUES_NEEDING_PRICE_ACCEPTANCE = new Set(['PRICE_CHANGED'])

/**
 * Order-level issues the checkout page already explains by itself (the delivery address step scrolls
 * to the missing address): they do not additionally disable the pay button.
 */
const ORDER_ISSUES_HANDLED_BY_THE_PAGE = new Set(['ADDRESS_REQUIRED'])

/** Order-level issues that stop the order (everything the page does not already handle). */
export const blockingOrderIssues = (quote: OrderQuote): QuoteIssue[] =>
    quote.issues.filter((issue) => !ORDER_ISSUES_HANDLED_BY_THE_PAGE.has(issue.code))

/** True when at least one line has an issue (any line issue stops createOrder, or needs the customer to accept a new price). */
export const hasLineIssues = (quote: OrderQuote): boolean => quote.lines.some((line) => line.issues.length > 0)

/** True when the order cannot be placed as it is: a line issue or a blocking order-level issue. */
export const isQuoteBlocking = (quote: OrderQuote): boolean =>
    hasLineIssues(quote) || blockingOrderIssues(quote).length > 0

export const needsPriceAcceptance = (issue: QuoteLineIssue): boolean => LINE_ISSUES_NEEDING_PRICE_ACCEPTANCE.has(issue.code)

/**
 * Line issues by cart line key. `lineKeys` are the keys of the cart lines AT THE TIME OF THE REQUEST
 * (same order as the request's items), so the answer can be matched to a line after the cart moved on.
 */
export function lineIssuesByKey(quote: OrderQuote, lineKeys: string[]): Record<string, QuoteLineIssue[]> {
    const byKey: Record<string, QuoteLineIssue[]> = {}
    quote.lines.forEach((line, index) => {
        const key = lineKeys[index]
        if (key && line.issues.length > 0) byKey[key] = line.issues
    })
    return byKey
}

/** The quote line of a cart line, by key (same alignment rule as `lineIssuesByKey`). */
export function quoteLineByKey(quote: OrderQuote, lineKeys: string[], key: string): QuoteLine | null {
    const index = lineKeys.indexOf(key)
    return index === -1 ? null : (quote.lines[index] ?? null)
}

/** Order-level issues under which the server did not price the order (its amounts are zeros): never shown as totals. */
const ISSUES_WITHOUT_PRICING = new Set(['ADDRESS_UNRESOLVABLE', 'ORDER_TOO_MANY_ITEMS'])

/**
 * Whether the quote's money can replace the client's maths. Not when the server did not evaluate
 * the coupon the cart carries (anonymous: the client keeps the discount it already has), could not
 * resolve the delivery address (the client knows the distance, the server's fee would be 0), or
 * refused to price a basket of too many different products (all amounts are zero).
 */
export function isQuoteUsableForTotals(quote: OrderQuote): boolean {
    if (quote.coupon?.errorCode === COUPON_NOT_EVALUATED) return false
    return !quote.issues.some((issue) => ISSUES_WITHOUT_PRICING.has(issue.code))
}

/*
 * Verdict of a quote asked right before the order is created, against what the customer was looking
 * at: 'blocked' (a line or order issue stops the order), 'changed' (the server's total is not the
 * payable amount the customer saw: prices or fees moved since), or 'ok'. A quote the totals cannot
 * use (see above) has nothing comparable, so it can only block.
 */
export type QuoteRecheck = 'ok' | 'blocked' | 'changed'

export function recheckQuote(quote: OrderQuote, displayedPayableCents: number): QuoteRecheck {
    if (isQuoteBlocking(quote)) return 'blocked'
    if (isQuoteUsableForTotals(quote) && toCents(quote.total) !== displayedPayableCents) return 'changed'
    return 'ok'
}

/**
 * The cart totals as the server priced them, in the shape every cart surface already reads
 * (`CartTotalsCents`). The delivery fee keeps the web's OUT_OF_ZONE sentinel so the "too far"
 * wording keeps working; the minimum comes from the issue the server reports.
 */
export function totalsFromQuote(quote: OrderQuote, collection: 'PICKUP' | 'DELIVERY'): CartTotalsCents {
    const isDelivery = collection === 'DELIVERY'
    const codes = new Set(quote.issues.map((issue) => issue.code))
    const subtotalCents = toCents(quote.subtotal)
    const pickupDiscountCents = toCents(quote.pickupDiscount)
    const couponDiscountCents = toCents(quote.couponDiscount)
    const onlineFeeCents = toCents(quote.onlineFee)
    const outOfZone = codes.has('DELIVERY_OUT_OF_ZONE') || codes.has('DELIVERY_AREA_EXCLUDED')

    const minimumIssue = quote.issues.find((issue) => issue.code === 'DELIVERY_MINIMUM_NOT_MET')
    const minimumCents = minimumIssue?.minimum ? toCents(minimumIssue.minimum) : DELIVERY_MINIMUM_CENTS
    const isMinimumReached = !isDelivery || !minimumIssue

    return {
        subtotalCents,
        pickupDiscountCents,
        deliveryFeeCents: isDelivery ? (outOfZone ? OUT_OF_ZONE : toCents(quote.deliveryFee)) : 0,
        couponDiscountCents,
        onlineFeeCents,
        payableCents: toCents(quote.total),
        hasBreakdown: isDelivery || pickupDiscountCents > 0 || couponDiscountCents > 0 || onlineFeeCents > 0,
        isMinimumReached,
        amountToDeliveryMinimumCents: isMinimumReached ? 0 : Math.max(minimumCents - subtotalCents, 0),
    }
}

/*
 * What the quote says about the coupon the cart carries:
 *  - 'applied'   the code is valid; `discountCents` is what it takes off now (it follows the basket)
 *  - 'refused'   the code no longer applies (`errorCode`): remove it and tell the customer why
 *  - 'unchanged' nothing to do (no coupon, a different code, or the server did not evaluate it)
 */
export type CouponVerdict =
    | { kind: 'applied'; discountCents: number }
    | { kind: 'refused'; errorCode: string }
    | { kind: 'unchanged' }

export function couponVerdict(quote: OrderQuote, cartCouponCode: string | null): CouponVerdict {
    const { coupon } = quote
    if (!cartCouponCode || !coupon || coupon.code !== cartCouponCode) return { kind: 'unchanged' }
    if (coupon.valid) return { kind: 'applied', discountCents: toCents(quote.couponDiscount) }
    if (!coupon.errorCode || coupon.errorCode === COUPON_NOT_EVALUATED) return { kind: 'unchanged' }
    return { kind: 'refused', errorCode: coupon.errorCode }
}

/**
 * An old backend has no `quoteOrder`: the server answers GRAPHQL_VALIDATION_FAILED mentioning the
 * field. The caller remembers it and falls back to the client's totals for good (same pattern as the
 * legacy validateCoupon query in `useCouponCode`).
 */
export function isQuoteUnsupportedError(err: unknown): boolean {
    const gqlError = unwrapGqlError(err)
    return Boolean(gqlError?.hasCode('GRAPHQL_VALIDATION_FAILED') && /quoteOrder|QuoteOrder/u.test(gqlError.message))
}
