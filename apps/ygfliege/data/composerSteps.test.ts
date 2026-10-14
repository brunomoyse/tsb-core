import type { ProductChoice, ProductChoiceGroup } from '#engine/types'
import {
  bowlScale,
  heatLevel,
  brothOptions,
  ingredientCategories,
  ingredientKind,
  ingredientProgress,
  planComposerSteps,
  variantLabel,
} from './composerSteps'
import { describe, expect, it } from 'vite-plus/test'

let n = 0
const choice = (name: string, groupId: string): ProductChoice => ({
  id: `c${++n}`,
  productId: 'p',
  choiceGroupId: groupId,
  priceModifier: '0',
  sortOrder: n,
  name,
})
const group = (
  id: string,
  name: string,
  min: number,
  max: number,
  sortOrder: number,
  names: string[],
): ProductChoiceGroup => ({
  id,
  productId: 'p',
  minSelections: min,
  maxSelections: max,
  sortOrder,
  name,
  choices: names.map((choiceName) => choice(choiceName, id)),
})

// The local seed (ygfliege_menu.sql): base, one ingredients group (min 5), spice.
const localSeed = () => [
  group('base', 'Base', 1, 1, 0, [
    "Bouillon d'os de bœuf épicé",
    'Bouillon tomate mijoté',
    'Bouillon thaïlandais Tom Yum',
    'Bouillon champignons',
    'Mala Mix sans bouillon (sauce sésame-cacahuète)',
  ]),
  group('ing', 'Ingrédients (min. 5)', 5, 20, 1, [
    'Pak choï',
    'Champignons enoki',
    'Tofu frais',
    'Nouilles udon',
    'Tranches de bœuf',
    'Crevettes',
  ]),
  group('spice', 'Niveau de piquant', 1, 1, 2, ['Doux', 'Moyen', 'Fort']),
]

// The Deliveroo copy: three ingredient groups, then the broth (one choice per heat), drinks, condiments.
const deliverooSeed = () => [
  group('veg', 'Légumes', 0, 16, 0, ['Brocoli (4 pcs)', 'Enoki (50 g)']),
  group('meat', 'Viandes', 0, 16, 1, ['Tranches de bœuf']),
  group('base', 'Accompagnement de base', 0, 16, 2, ['Nouilles udon (50 g)']),
  group('broth', 'Bouillon au choix', 1, 1, 3, [
    "Bouillon d'os de bœuf pimenté, très légèrement épicé",
    "Bouillon d'os de bœuf pimenté, très épicé",
    'Bouillon thaïlandais Tom Yum Kung, légèrement épicé',
    'Bouillon tomate, non épicé (végétarien)',
  ]),
  group('drinks', 'Boissons au choix', 0, 10, 4, ['Coca-Cola']),
]

describe('planComposerSteps', () => {
  it('runs broth, ingredients, then the other pick-one groups (local seed)', () => {
    const steps = planComposerSteps(localSeed())
    expect(steps.map((step) => step.kind)).toEqual(['broth', 'ingredients', 'single'])
    const [broth] = steps
    expect(broth?.kind === 'broth' && broth.broths.map((option) => option.slug)).toEqual([
      'beef-bone',
      'tomato',
      'tom-yum',
      'mushroom',
      'mala-dry-mix',
    ])
  })

  it('puts the broth first even when its group comes later, and every multi-pick group in one step', () => {
    const steps = planComposerSteps(deliverooSeed())
    expect(steps.map((step) => step.kind)).toEqual(['broth', 'ingredients'])
    const [, ingredients] = steps
    expect(ingredients?.kind === 'ingredients' && ingredients.groups.map((g) => g.id)).toEqual([
      'veg',
      'meat',
      'base',
      'drinks',
    ])
  })

  it('adds the heat step after the ingredients once a broth with several variants is picked', () => {
    expect(planComposerSteps(deliverooSeed(), 'beef-bone').map((step) => step.kind)).toEqual([
      'broth',
      'ingredients',
      'variant',
    ])
    expect(planComposerSteps(deliverooSeed(), 'tomato').map((step) => step.kind)).toEqual([
      'broth',
      'ingredients',
    ])
  })

  it('without a broth group, starts with the ingredients', () => {
    const steps = planComposerSteps([
      group('ing', 'Ingrédients', 1, 5, 0, ['Tofu']),
      group('sauce', 'Sauce au choix', 1, 1, 1, ['Sauce sésame et cacahouète']),
    ])
    expect(steps.map((step) => step.kind)).toEqual(['ingredients', 'single'])
  })
})

describe('brothOptions', () => {
  it('groups the variants of one broth and refuses a group with a non-broth choice', () => {
    const broth = deliverooSeed()[3]!
    const options = brothOptions(broth)
    expect(options?.map((option) => [option.slug, option.variants.length])).toEqual([
      ['beef-bone', 2],
      ['tom-yum', 1],
      ['tomato', 1],
    ])
    expect(brothOptions(group('s', 'Spice', 1, 1, 0, ['Doux', 'Fort']))).toBeNull()
    expect(brothOptions(group('m', 'Multi', 0, 5, 0, ['Bouillon tomate']))).toBeNull()
    expect(brothOptions(group('e', 'Empty', 1, 1, 0, []))).toBeNull()
  })
})

describe('variantLabel', () => {
  it('keeps what follows the broth name, capitalised', () => {
    expect(variantLabel("Bouillon d'os de bœuf pimenté, très épicé")).toBe('Très épicé')
    expect(variantLabel('Doux')).toBe('Doux')
    expect(variantLabel('Bouillon tomate,')).toBe('Bouillon tomate,')
  })
})

describe('ingredientCategories', () => {
  it('splits one group by kind, in a fixed order', () => {
    const categories = ingredientCategories([localSeed()[1]!])
    expect(categories.map((category) => category.kind)).toEqual([
      'vegetables',
      'mushrooms',
      'tofu',
      'noodles',
      'meat',
      'seafood',
    ])
    expect(categories[0]?.labelKey).toBe('composer.kinds.vegetables')
  })

  it('uses the groups themselves when there are several', () => {
    const groups = deliverooSeed().filter((g) => g.maxSelections > 1)
    expect(ingredientCategories(groups).map((category) => category.label)).toEqual([
      'Légumes',
      'Viandes',
      'Accompagnement de base',
      'Boissons au choix',
    ])
  })

  it('keeps a single group whole when its names give one kind only', () => {
    const only = group('ing', 'Ingrédients', 0, 5, 0, ['Tofu frais', 'Peau de tofu'])
    expect(ingredientCategories([only])).toEqual([
      { id: 'ing', label: 'Ingrédients', choices: only.choices },
    ])
  })
})

describe('ingredientKind', () => {
  it('reads fish balls as seafood, not meat, and unknown names as other', () => {
    expect(ingredientKind('Boulettes de poisson')).toBe('seafood')
    expect(ingredientKind('Boulettes de bœuf')).toBe('meat')
    expect(ingredientKind('Champignon noir (3 pcs)')).toBe('mushrooms')
    expect(ingredientKind('Nouilles de patate douce')).toBe('noodles')
    expect(ingredientKind('Pousses de soja')).toBe('vegetables')
    expect(ingredientKind('Coca-Cola')).toBe('other')
    expect(ingredientKind('Viandes')).toBe('meat')
  })
})

describe('ingredientProgress', () => {
  it('sums the groups and scales the minimum with the quantity', () => {
    const groups = [localSeed()[1]!]
    expect(ingredientProgress(groups, () => 3)).toEqual({ count: 3, min: 5, max: 20, missing: 2 })
    expect(ingredientProgress(groups, () => 3, 2)).toEqual({
      count: 3,
      min: 10,
      max: 40,
      missing: 7,
    })
    expect(ingredientProgress(groups, () => 9).missing).toBe(0)
  })
})

describe('bowlScale', () => {
  it('grows from 0.82 to 1.12 and stops there', () => {
    expect(bowlScale(0)).toBe(0.82)
    expect(bowlScale(10)).toBe(0.97)
    expect(bowlScale(20)).toBe(1.12)
    expect(bowlScale(40)).toBe(1.12)
    expect(bowlScale(-1)).toBe(0.82)
  })
})

describe('heatLevel', () => {
  it('reads the heat in the names of the seeds, and nothing from a name without one', () => {
    expect(heatLevel('Bouillon tomate, non épicé (végétarien)')).toBe(0)
    expect(heatLevel("Bouillon d'os de bœuf pimenté, très légèrement épicé")).toBe(1)
    expect(heatLevel('Doux')).toBe(1)
    expect(heatLevel('Moyen')).toBe(2)
    expect(heatLevel("Bouillon d'os de bœuf pimenté, très épicé")).toBe(3)
    expect(heatLevel('Fort')).toBe(3)
    expect(heatLevel('Sauce sésame et cacahouète, épicée')).toBe(2)
    expect(heatLevel('Hot')).toBe(3)
    expect(heatLevel('Coca-Cola')).toBeNull()
  })
})
