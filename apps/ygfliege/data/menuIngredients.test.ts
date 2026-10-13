// Static menu ingredient chips: every filter, and every name present in all four locales.
// Run: `vp test run apps/ygfliege/data/menuIngredients.test.ts`.
import { describe, expect, it } from 'vite-plus/test'
import en from '../locales/en.json'
import fr from '../locales/fr.json'
import nl from '../locales/nl.json'
import zh from '../locales/zh.json'
import {
  INGREDIENTS,
  INGREDIENT_CATEGORIES,
  INGREDIENT_FILTERS,
  ingredientsFor,
} from './menuIngredients'

describe('ingredientsFor', () => {
  it('shows every ingredient, in menu order, for "all"', () => {
    expect(ingredientsFor('all')).toEqual(INGREDIENTS)
  })

  it.each(INGREDIENT_CATEGORIES)('shows only the %s for that filter', (category) => {
    const shown = ingredientsFor(category)
    expect(shown.length).toBeGreaterThan(0)
    expect(shown.every((ingredient) => ingredient.category === category)).toBe(true)
  })

  it('splits the list without losing or repeating an ingredient', () => {
    const total = INGREDIENT_CATEGORIES.reduce(
      (sum, category) => sum + ingredientsFor(category).length,
      0,
    )
    expect(total).toBe(INGREDIENTS.length)
    expect(new Set(INGREDIENTS.map((ingredient) => ingredient.key)).size).toBe(INGREDIENTS.length)
  })

  it('offers "all" first, then each category', () => {
    expect(INGREDIENT_FILTERS).toEqual(['all', ...INGREDIENT_CATEGORIES])
  })
})

describe.each([
  ['fr', fr],
  ['en', en],
  ['nl', nl],
  ['zh', zh],
])('the %s locale', (_locale, messages) => {
  const menu = messages.mkt.menu as {
    ingredients: Record<string, string>
    categories: Record<string, string>
  }

  it('names every ingredient and every filter', () => {
    for (const { key } of INGREDIENTS) expect(menu.ingredients[key]).toBeTruthy()
    for (const filter of INGREDIENT_FILTERS) expect(menu.categories[filter]).toBeTruthy()
  })
})
