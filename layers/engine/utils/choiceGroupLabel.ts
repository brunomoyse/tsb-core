import type { BrandConfig } from '../types/brand.ts'

/**
 * The i18n key a brand gives to the choice groups of a category's products (`brand.choiceGroupLabels`), or null
 * when the brand has none for this category and the catalog's group name is shown.
 */
export function choiceGroupLabelKey(
    labels: BrandConfig['choiceGroupLabels'],
    categorySlug: string | null | undefined,
    maxSelections: number,
): string | null {
    const entry = categorySlug ? labels?.[categorySlug] : undefined
    if (!entry) return null
    return maxSelections > 1 ? entry.other : entry.one
}
