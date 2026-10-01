import type { CartItem } from '#engine/types'
import type { OrderExtraKey, OrderExtrasConfig } from '#engine/types/brand'

export type OrderExtra = { name: string; options?: string[] }

/** Extras that only make sense with sushi-style dishes; see `condimentFreeCategories`. */
export const CONDIMENTS: readonly OrderExtraKey[] = ['wasabi', 'ginger', 'sauce']

/** Sauce option ticked by default when sauce is preselected or switched on. */
export const DEFAULT_SAUCE_OPTION = 'both'

export function resolveOrderExtras(config: OrderExtrasConfig | undefined): Required<OrderExtrasConfig> {
    return {
        available: config?.available ?? ['chopsticks'],
        preselected: config?.preselected ?? [],
        condimentFreeCategories: config?.condimentFreeCategories ?? [],
    }
}

/** True when every item in the cart belongs to a condiment-free category. */
export function isCondimentFreeCart(products: CartItem[], condimentFreeCategories: string[]): boolean {
    if (products.length === 0 || condimentFreeCategories.length === 0) return false
    return products.every((item) => condimentFreeCategories.includes(item.product.category?.slug ?? ''))
}

const toExtra = (key: OrderExtraKey): OrderExtra =>
    key === 'sauce' ? { name: key, options: [DEFAULT_SAUCE_OPTION] } : { name: key }

/**
 * The extras to submit, derived from what's in the cart store:
 * - first visit for this cart (`initialized` false): the brand's preselection;
 * - always: drop anything this brand doesn't offer (stale persisted carts,
 *   the legacy `sauces` entry) and condiments on a condiment-free cart.
 */
export function normalizeOrderExtras(
    current: OrderExtra[] | null,
    initialized: boolean,
    config: Required<OrderExtrasConfig>,
    condimentFree: boolean,
): OrderExtra[] {
    const start = initialized ? (current ?? []) : config.preselected.map(toExtra)
    return start.filter((extra) => {
        const key = extra.name as OrderExtraKey
        if (!config.available.includes(key)) return false
        return !(condimentFree && CONDIMENTS.includes(key))
    })
}
