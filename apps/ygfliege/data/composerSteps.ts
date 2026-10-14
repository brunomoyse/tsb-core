import type { ProductChoice, ProductChoiceGroup } from '#engine/types'
import { brothSlugForName } from './broths'

/*
 * The stepped bowl composer (components/menu/BowlComposer.vue), planned from the product's choice groups so it works
 * for any catalogue shape:
 *
 *  - the broth step: the first pick-one group whose every choice names an official broth. Choices of the same broth are
 *    its variants (Deliveroo's "Bouillon d'os de bœuf pimenté, très épicé" / "..., épicé doux"): one card per broth,
 *    and a "variant" step to pick the heat when the chosen broth has more than one.
 *  - the ingredients step: every multi-pick group. One group is split into categories by name (legumes, mushrooms...);
 *    several groups are the categories themselves.
 *  - every other pick-one group (spice level, sauce): a step each, after the ingredients.
 */

export interface BrothOption {
  /** Photo slug under /images/bowls (beef-bone, tomato...). */
  slug: string
  /** The group's choices for this broth, in menu order (one, or one per heat level). */
  variants: ProductChoice[]
}

export type ComposerStep =
  | { kind: 'broth'; group: ProductChoiceGroup; broths: BrothOption[] }
  | { kind: 'variant'; group: ProductChoiceGroup }
  | { kind: 'ingredients'; groups: ProductChoiceGroup[] }
  | { kind: 'single'; group: ProductChoiceGroup }

const bySortOrder = <T extends { sortOrder: number }>(items: readonly T[]): T[] =>
  items.toSorted((a, b) => a.sortOrder - b.sortOrder)

const isPickOne = (group: ProductChoiceGroup): boolean => group.maxSelections <= 1

/** The broths of a pick-one group, or null when one of its choices is not a broth. */
export const brothOptions = (group: ProductChoiceGroup): BrothOption[] | null => {
  if (!isPickOne(group) || group.choices.length === 0) return null
  const options: BrothOption[] = []
  for (const choice of bySortOrder(group.choices)) {
    const slug = brothSlugForName(choice.name)
    if (slug === undefined) return null
    const existing = options.find((option) => option.slug === slug)
    if (existing) existing.variants.push(choice)
    else options.push({ slug, variants: [choice] })
  }
  return options
}

/**
 * The steps, in order. `pickedBrothSlug` is the broth chosen so far: the variant step only exists once a broth with
 * several variants is chosen.
 */
export const planComposerSteps = (
  groups: readonly ProductChoiceGroup[],
  pickedBrothSlug: string | null = null,
): ComposerStep[] => {
  const sorted = bySortOrder(groups)
  const steps: ComposerStep[] = []

  let brothGroup: ProductChoiceGroup | null = null
  for (const group of sorted) {
    const broths = brothOptions(group)
    if (broths) {
      brothGroup = group
      steps.push({ kind: 'broth', group, broths })
      const picked = broths.find((broth) => broth.slug === pickedBrothSlug)
      if (picked && picked.variants.length > 1) steps.push({ kind: 'variant', group })
      break
    }
  }

  const multi = sorted.filter((group) => !isPickOne(group))
  if (multi.length > 0) steps.splice(brothGroup ? 1 : 0, 0, { kind: 'ingredients', groups: multi })

  for (const group of sorted) {
    if (group === brothGroup || !isPickOne(group)) continue
    steps.push({ kind: 'single', group })
  }
  // The ingredients come right after the broth, the heat of that broth after the ingredients (2a: Bouillon,
  // Ingrédients, Piquant).
  const variantIndex = steps.findIndex((step) => step.kind === 'variant')
  if (variantIndex !== -1) {
    const [variant] = steps.splice(variantIndex, 1)
    const firstSingle = steps.findIndex((step) => step.kind === 'single')
    steps.splice(firstSingle === -1 ? steps.length : firstSingle, 0, variant!)
  }
  return steps
}

/** "Bouillon d'os de bœuf pimenté, très épicé" → "Très épicé"; a name without a qualifier is kept whole. */
export const variantLabel = (name: string): string => {
  const comma = name.indexOf(',')
  if (comma === -1) return name
  const rest = name.slice(comma + 1).trim()
  return rest === '' ? name : rest.charAt(0).toLocaleUpperCase() + rest.slice(1)
}

export const INGREDIENT_KINDS = [
  'vegetables',
  'mushrooms',
  'tofu',
  'noodles',
  'meat',
  'seafood',
  'other',
] as const
export type IngredientKind = (typeof INGREDIENT_KINDS)[number]

/*
 * Keywords of the ingredient names in the four locales of the seeds. Order matters: "boulettes de poisson" is seafood
 * before "boulettes" is meat, "champignon" is a mushroom before anything else, "nouilles de patate douce" are noodles
 * before "patate" is a vegetable.
 */
const KIND_KEYWORDS: readonly { kind: IngredientKind; pattern: RegExp }[] = [
  {
    kind: 'seafood',
    pattern:
      /crevette|shrimp|garnaal|garnalen|虾|poisson|fish|vis\b|vissen|鱼|surimi|crabe|crab|krab|蟹|calamar|squid|inktvis|鱿|moule|mussel/iu,
  },
  {
    kind: 'mushrooms',
    pattern:
      /champignon|mushroom|paddenstoel|enoki|shiitak|pleurote|oyster mush|菇|菌|木耳|wood ear/iu,
  },
  { kind: 'tofu', pattern: /tofu|豆腐|腐竹|bean curd|yuba/iu },
  {
    kind: 'noodles',
    pattern:
      /nouille|noodle|noedel|面|粉|vermicelle|vermicelli|udon|riz|rice|rijst|米|pâte de riz|beignet|youtiao|油条/iu,
  },
  {
    kind: 'meat',
    pattern:
      /viande|meat|vlees|bœuf|boeuf|beef|rund|牛|porc|pork|varken|猪|agneau|lamb|lam\b|羊|poulet|chicken|kip|鸡|saucisse|sausage|worst|肠|boulette|meatball|balletje|丸|lard|bacon|jambon|ham|œuf|oeuf|egg|ei\b|蛋/iu,
  },
  {
    kind: 'vegetables',
    pattern:
      /chou|cabbage|kool|白菜|菜|brocoli|broccoli|西兰花|épinard|spinach|spinazie|菠菜|maïs|corn|mais|玉米|lotus|藕|pomme de terre|potato|aardappel|土豆|carotte|carrot|wortel|胡萝卜|pousse|sprout|kiemen|芽|algue|seaweed|zeewier|海带|konjac|魔芋|bambou|bamboo|笋|laitue|lettuce|sla|生菜|soja|soy|taug|豆芽|pak|bok|légume|vegetable|groente/iu,
  },
]

export const ingredientKind = (name: string): IngredientKind =>
  KIND_KEYWORDS.find(({ pattern }) => pattern.test(name))?.kind ?? 'other'

export interface IngredientCategory {
  /** Stable id: the group id, or `kind:<kind>` for a category split out of one group. */
  id: string
  /** A group's own name, or the i18n key `composer.kinds.<kind>` (`labelKey`). */
  label?: string
  labelKey?: string
  kind?: IngredientKind
  choices: ProductChoice[]
}

/**
 * The category chips of the ingredients step. Several multi-pick groups are the categories. One group is split by
 * `ingredientKind` when that gives at least two categories; otherwise it is one category (no chip row needed).
 */
export const ingredientCategories = (
  groups: readonly ProductChoiceGroup[],
): IngredientCategory[] => {
  const [group] = groups.length === 1 ? groups : []
  if (group === undefined) {
    return groups.map((item) => ({
      id: item.id,
      label: item.name,
      choices: bySortOrder(item.choices),
    }))
  }
  const byKind = new Map<IngredientKind, ProductChoice[]>()
  for (const choice of bySortOrder(group.choices)) {
    const kind = ingredientKind(choice.name)
    byKind.set(kind, [...(byKind.get(kind) ?? []), choice])
  }
  if (byKind.size < 2)
    return [{ id: group.id, label: group.name, choices: bySortOrder(group.choices) }]
  return INGREDIENT_KINDS.filter((kind) => byKind.has(kind)).map((kind) => ({
    id: `kind:${kind}`,
    labelKey: `composer.kinds.${kind}`,
    kind,
    choices: byKind.get(kind)!,
  }))
}

/**
 * The ingredients counter: selected over the groups' combined minimum and maximum. `min` 0 means no minimum (the
 * Deliveroo bowls), where the counter only reports the count.
 */
export const ingredientProgress = (
  groups: readonly ProductChoiceGroup[],
  selectedIn: (group: ProductChoiceGroup) => number,
  quantity = 1,
): { count: number; min: number; max: number; missing: number } => {
  const count = groups.reduce((sum, group) => sum + selectedIn(group), 0)
  const min = groups.reduce((sum, group) => sum + group.minSelections, 0) * quantity
  const max = groups.reduce((sum, group) => sum + group.maxSelections, 0) * quantity
  return { count, min, max, missing: Math.max(0, min - count) }
}

/**
 * How big the footer bowl is drawn: it grows with the ingredients, from 0.82 empty to 1.12 at `full` (20 by default),
 * as in the 2a mockup.
 */
export const bowlScale = (count: number, full = 20): number =>
  Number((0.82 + (Math.min(Math.max(count, 0), full) / full) * 0.3).toFixed(3))

/*
 * Heat of a spice choice from its name, in the four locales of the seeds: 0 for "non épicé", 1 mild, 2 medium, 3 hot,
 * null when the name says nothing about heat (no chilis drawn). The more specific phrases are tested first.
 */
const HEAT_KEYWORDS: readonly { level: 0 | 1 | 2 | 3; pattern: RegExp }[] = [
  { level: 0, pattern: /non épicé|pas épicé|not spicy|no heat|niet pittig|不辣/iu },
  { level: 1, pattern: /légèrement|doux|mild|licht|zacht|微辣|小辣/iu },
  { level: 2, pattern: /moyen|medium|gemiddeld|中辣/iu },
  { level: 3, pattern: /très épicé|fort|very spicy|hot|heel pittig|sterk|特辣|大辣|重辣/iu },
  { level: 2, pattern: /épicé|spicy|pittig|辣/iu },
]

export const heatLevel = (name: string): 0 | 1 | 2 | 3 | null =>
  HEAT_KEYWORDS.find(({ pattern }) => pattern.test(name))?.level ?? null
