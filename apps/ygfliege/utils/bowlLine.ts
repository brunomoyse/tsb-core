import type { CartItem, CartLinePresentation, ProductChoice } from '#engine/types'
import { brothSlugForName } from '../data/broths'
import { heatLevel } from '../data/composerSteps'
import { isBowlComposer } from '../data/composer'

/** `t` of vue-i18n, as the presenter needs it (named values, and the plural count of "7 ingrédients"). */
export type BowlLineTranslate = (
  key: string,
  named: Record<string, unknown>,
  plural: number,
) => string

/** Names a broth in any locale of the seeds ("Bouillon ...", "Mala Mix", "... broth", "...汤"), not an ingredient. */
const BROTH_NAME = /bouillon|broth|soup|mala ?mix|汤|拌/iu

interface Picked {
  choice: ProductChoice
  quantity: number
}

/**
 * The cart line of a composed bowl (audit 2c/2d): the photo of its broth, one summary line ("Bouillon tomate mijoté ·
 * 7 ingrédients · Moyen") and the full detail ("Pak choï ×2"). Null for any other line, which keeps the default look.
 *
 * A line fresh from the composer still has the product's choice groups; a line read back from localStorage only has its
 * selected choices (utils/cartPersistence.ts), so the parts are then told apart by name: the one broth, the heat level,
 * and everything else as ingredients.
 */
export const presentBowlLine = (
  item: CartItem,
  t: BowlLineTranslate,
): CartLinePresentation | null => {
  const { product } = item
  if (!isBowlComposer(product) || item.selectedChoices.length === 0) return null

  const picked: Picked[] = item.selectedChoices.flatMap((selection) => {
    const choice = product.choices?.find((candidate) => candidate.id === selection.choiceId)
    return choice ? [{ choice, quantity: selection.quantity }] : []
  })
  const groups = product.choiceGroups ?? []
  const isMulti = (pick: Picked): boolean => {
    const group = groups.find((candidate) => candidate.id === pick.choice.choiceGroupId)
    if (group) return group.maxSelections > 1
    return !BROTH_NAME.test(pick.choice.name) && heatLevel(pick.choice.name) === null
  }

  const ingredients = picked.filter(isMulti)
  const pickOne = picked.filter((pick) => !isMulti(pick))
  const broth = pickOne.find(
    (pick) => BROTH_NAME.test(pick.choice.name) && brothSlugForName(pick.choice.name) !== undefined,
  )
  const others = pickOne.filter((pick) => pick !== broth)

  const count = ingredients.reduce((sum, pick) => sum + pick.quantity, 0)
  const slug = broth ? brothSlugForName(broth.choice.name) : undefined
  const summary = [
    broth?.choice.name,
    count > 0 ? t('composer.ingredientsSummary', { count }, count) : undefined,
    ...others.map((pick) => pick.choice.name),
  ].filter((part): part is string => part !== undefined)

  return {
    image:
      slug === undefined
        ? undefined
        : {
            avif: `/images/bowls/${slug}-top-320.avif`,
            webp: `/images/bowls/${slug}-top-320.webp`,
            fallback: `/images/bowls/${slug}-top-560.png`,
          },
    summary: summary.join(' · '),
    details: ingredients.map((pick) =>
      pick.quantity > 1 ? `${pick.choice.name} ×${pick.quantity}` : pick.choice.name,
    ),
  }
}
