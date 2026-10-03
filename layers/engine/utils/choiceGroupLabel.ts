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

/**
 * Card-subtitle label for a required choice group whose name comes from the catalog. Pick-one groups show how many
 * options there are to choose from, "niveau de piquant (3)", because "1 niveau de piquant" read as if the set had a
 * single fixed level. Multi-select groups keep the pick count ("20 ingrédients"). Group names are DB translations, so
 * the option count is appended rather than pluralised.
 */
export function choiceGroupCountLabel(
  name: string,
  maxSelections: number,
  optionCount: number,
): string {
  const label = name.toLowerCase()
  if (maxSelections === 1) return optionCount > 1 ? `${label} (${optionCount})` : label
  return `${maxSelections} ${label}`
}
