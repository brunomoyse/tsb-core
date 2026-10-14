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
  const entry =
    categorySlug !== null && categorySlug !== undefined && categorySlug !== ''
      ? labels?.[categorySlug]
      : undefined
  if (entry === undefined) return null
  return maxSelections > 1 ? entry.other : entry.one
}

/**
 * Card-subtitle label for a required choice group whose name comes from the catalog. Pick-one groups show the group's
 * name alone, "sauce au choix" (no option count: it added nothing for the customer). Multi-select groups keep the pick
 * count ("20 ingrédients"). Group names are DB translations, so the count is prefixed rather than pluralised.
 */
export function choiceGroupCountLabel(name: string, maxSelections: number): string {
  const label = name.toLowerCase()
  return maxSelections === 1 ? label : `${maxSelections} ${label}`
}
