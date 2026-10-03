import type { Product, ProductCategory } from '#engine/types'

/*
 * The menu page's catalogue rules (composables/useMenu.ts): merging live product updates, the search box, the
 * dietary filters, and how the filtered products are grouped back into categories. Pure, so they are tested
 * without a page.
 */

/** A product's fields as the `productUpdated` subscription sends them, keyed by product id. */
export type LiveProducts = Record<string, Partial<Product>>

export type DietaryFilter = 'halal' | 'vegetarian' | 'spicy'

/** Visible products only, live updates merged in, empty categories dropped, in the dashboard's category order. */
export const baseCategories = (categories: ProductCategory[], live: LiveProducts): ProductCategory[] =>
    categories
        .map(cat => ({
            ...cat,
            products: cat.products
                .map((p) => {
                    const update = live[p.id]
                    return update ? { ...p, ...update } as Product : p
                })
                .filter(p => p.isVisible),
        }))
        .filter(cat => cat.products.length)
        .toSorted((a, b) => a.order - b.order)

/** Every product of the menu in one list, each carrying its category (what the search looks at). */
export const flattenProducts = (categories: ProductCategory[]): Product[] =>
    categories.flatMap(cat => cat.products.map(p => ({ ...p, category: cat })))

/** The products matching every word of the query, in name, code or category. An empty query keeps them all. */
export const searchProducts = (products: Product[], query: string): Product[] => {
    const q = query.trim().toLowerCase()
    if (!q) return products
    const words = q.split(/\s+/u)
    return products.filter((p) => {
        const haystack = [p.name, p.code, p.category.name]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
        return words.every(w => haystack.includes(w))
    })
}

/** AND logic: a product must match ALL the active filters. */
export const filterDietary = (products: Product[], filters: ReadonlySet<string>): Product[] => {
    if (filters.size === 0) return products
    return products.filter((p) => {
        if (filters.has('halal') && !p.isHalal) return false
        if (filters.has('vegetarian') && !p.isVegetarian) return false
        if (filters.has('spicy') && !p.isSpicy) return false
        return true
    })
}

/**
 * The build-your-own composer product, detected by shape rather than by id: any product with a choice group
 * allowing more than one pick. The category query already returns min/maxSelections, so adding a second composer
 * to the menu needs no code change.
 */
export const isComposerProduct = (p: Product): boolean => p.choiceGroups?.some(group => group.maxSelections > 1) ?? false

/** Filtered products grouped back into their categories, in category order. */
export const groupByCategory = (products: Product[]): ProductCategory[] => {
    const grouped = Map.groupBy(products, prod => prod.category.id)
    return Array.from(grouped.entries())
        .map(([, group]) => ({ ...group[0]!.category, products: group }))
        .toSorted((a, b) => a.order - b.order)
}

export interface DisplayOptions {
    /** The search text (debounced by the caller). */
    query: string
    filters: ReadonlySet<string>
    /** Keep composer products out of the grid (their hero banner is their only entry point). */
    excludeComposer: boolean
}

/**
 * The categories the page renders. Without a search or a filter that is the whole menu; with one it is the
 * matching products regrouped. A composer product is never a grid card when `excludeComposer` is set: a card
 * would show its bare base price as if it were the full price.
 */
export const displayedCategories = (base: ProductCategory[], all: Product[], options: DisplayOptions): ProductCategory[] => {
    const { query, filters, excludeComposer } = options
    const inGrid = (p: Product) => !excludeComposer || !isComposerProduct(p)
    if (!query.trim() && filters.size === 0) {
        if (!excludeComposer) return base
        return base
            .map(cat => ({ ...cat, products: cat.products.filter(inGrid) }))
            .filter(cat => cat.products.length)
    }
    return groupByCategory(filterDietary(searchProducts(all, query), filters).filter(inGrid))
}
