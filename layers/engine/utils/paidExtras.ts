import { toCents } from './money.ts'
import { unwrapGqlError } from './gqlError.ts'

/*
 * Paid extras of the checkout: the cheap products of the brand's extras category (brand.paidExtrasCategorySlug),
 * offered as chips next to the free extras and added to the cart as ordinary lines.
 */

/** Only products up to this price are offered as extras: dearer ones belong on the menu. */
export const PAID_EXTRA_PRICE_MAX_CENTS = 100

export interface PaidExtraProduct {
    code: string | null
    name: string
    price: string | number
    isVisible: boolean
    isAvailable: boolean
}

export interface CartLineForExtras {
    product: { code?: string | null }
    quantity: number
    selectedChoice?: unknown
    selectedChoices?: unknown[] | null
}

export interface PaidExtra {
    code: string
    label: string
    priceCents: number
    isAvailable: boolean
    /** How many of it are in the cart already. */
    quantity: number
}

/** The extra's quantity in the cart: plain lines of that product (a line with a choice is the menu item, not the extra). */
export function paidExtraQuantity(lines: readonly CartLineForExtras[], code: string): number {
    return lines
        .filter((line) => line.product.code === code && (!line.selectedChoice || (line.selectedChoices?.length ?? 0) === 0))
        .reduce((sum, line) => sum + line.quantity, 0)
}

/** The extras on offer, cheapest first (then by name). */
export function paidExtrasOf(products: readonly PaidExtraProduct[], lines: readonly CartLineForExtras[]): PaidExtra[] {
    return products
        .filter((product) => {
            const priceCents = toCents(product.price)
            return product.isVisible && product.code !== null && priceCents > 0 && priceCents <= PAID_EXTRA_PRICE_MAX_CENTS
        })
        .map((product) => ({
            code: product.code as string,
            label: product.name,
            priceCents: toCents(product.price),
            isAvailable: product.isAvailable,
            quantity: paidExtraQuantity(lines, product.code as string),
        }))
        .sort((a, b) => a.priceCents - b.priceCents || a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }))
}

/**
 * An older backend has no `productCategoryBySlug` query: the server answers GRAPHQL_VALIDATION_FAILED naming the
 * field, and the checkout asks for the whole menu instead (same pattern as `isPolicyUnsupportedError`).
 */
export function isCategoryBySlugUnsupportedError(err: unknown): boolean {
    const gqlError = unwrapGqlError(err)
    return Boolean(gqlError?.hasCode('GRAPHQL_VALIDATION_FAILED') && /productCategoryBySlug/u.test(gqlError.message))
}
