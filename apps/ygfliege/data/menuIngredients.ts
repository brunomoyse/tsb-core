// The static menu's ingredient chips (pages/menu.vue while the shop is switched off), as on the old ygfliege.be menu.
// Names live under `mkt.menu.ingredients.<key>`, categories under `mkt.menu.categories.<category>`.

export const INGREDIENT_CATEGORIES = [
  'vegetables',
  'mushrooms',
  'meat',
  'seafood',
  'tofu',
  'noodles',
] as const

export type IngredientCategory = (typeof INGREDIENT_CATEGORIES)[number]

/** A filter chip: one category, or every ingredient. */
export type IngredientFilter = IngredientCategory | 'all'

export const INGREDIENT_FILTERS: readonly IngredientFilter[] = ['all', ...INGREDIENT_CATEGORIES]

export interface Ingredient {
  key: string
  category: IngredientCategory
}

export const INGREDIENTS: readonly Ingredient[] = [
  { key: 'bok_choy', category: 'vegetables' },
  { key: 'spinach', category: 'vegetables' },
  { key: 'lettuce', category: 'vegetables' },
  { key: 'broccoli', category: 'vegetables' },
  { key: 'cabbage', category: 'vegetables' },
  { key: 'corn', category: 'vegetables' },
  { key: 'potato', category: 'vegetables' },
  { key: 'lotus_root', category: 'vegetables' },
  { key: 'enoki', category: 'mushrooms' },
  { key: 'shiitake', category: 'mushrooms' },
  { key: 'oyster_mushroom', category: 'mushrooms' },
  { key: 'king_oyster', category: 'mushrooms' },
  { key: 'wood_ear', category: 'mushrooms' },
  { key: 'beef', category: 'meat' },
  { key: 'lamb', category: 'meat' },
  { key: 'pork_belly', category: 'meat' },
  { key: 'meatballs', category: 'meat' },
  { key: 'shrimp', category: 'seafood' },
  { key: 'fish_balls', category: 'seafood' },
  { key: 'squid', category: 'seafood' },
  { key: 'crab_sticks', category: 'seafood' },
  { key: 'firm_tofu', category: 'tofu' },
  { key: 'silken_tofu', category: 'tofu' },
  { key: 'tofu_skin', category: 'tofu' },
  { key: 'fried_tofu', category: 'tofu' },
  { key: 'glass_noodles', category: 'noodles' },
  { key: 'udon', category: 'noodles' },
  { key: 'rice_noodles', category: 'noodles' },
  { key: 'instant_noodles', category: 'noodles' },
]

/** The chips a filter shows, in menu order. */
export const ingredientsFor = (filter: IngredientFilter): readonly Ingredient[] =>
  filter === 'all'
    ? INGREDIENTS
    : INGREDIENTS.filter((ingredient) => ingredient.category === filter)
