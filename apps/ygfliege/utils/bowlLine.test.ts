import type { ProductChoice, ProductChoiceGroup } from '#engine/types'
import { describe, expect, it } from 'vite-plus/test'
import { makeCartItem, makeChoice, makeProduct } from '../../../test/fixtures/catalog'
import { presentBowlLine } from './bowlLine'

// "7 ingrédients", as vue-i18n would say it.
const t = (key: string, named: Record<string, unknown>, plural: number) =>
  `${key}:${String(named.count)}:${plural}`

const composerCategory = { id: 'c', name: 'Sur mesure', order: 1, slug: 'sur-mesure', products: [] }
const choice = (id: string, groupId: string, name: string): ProductChoice =>
  makeChoice({ id, choiceGroupId: groupId, name })
const tomato = choice('tomato', 'broth', 'Bouillon tomate mijoté')
const pak = choice('pak', 'ing', 'Pak choï')
const enoki = choice('enoki', 'ing', 'Champignons enoki')
const beef = choice('beef', 'ing', 'Tranches de bœuf')
const medium = choice('medium', 'spice', 'Moyen')
const group = (id: string, max: number, choices: ProductChoice[]): ProductChoiceGroup => ({
  id,
  productId: 'bowl',
  minSelections: 1,
  maxSelections: max,
  sortOrder: 0,
  name: id,
  choices,
})
const selections = [
  { groupId: 'broth', choiceId: 'tomato', quantity: 1 },
  { groupId: 'ing', choiceId: 'pak', quantity: 2 },
  { groupId: 'ing', choiceId: 'enoki', quantity: 1 },
  { groupId: 'ing', choiceId: 'beef', quantity: 1 },
  { groupId: 'spice', choiceId: 'medium', quantity: 1 },
]
const expected = {
  image: {
    avif: '/images/bowls/tomato-top-320.avif',
    webp: '/images/bowls/tomato-top-320.webp',
    fallback: '/images/bowls/tomato-top-560.png',
  },
  summary: 'Bouillon tomate mijoté · composer.ingredientsSummary:4:4 · Moyen',
  details: ['Pak choï ×2', 'Champignons enoki', 'Tranches de bœuf'],
}

describe('presentBowlLine', () => {
  it('a fresh line: the broth photo, one summary line, the ingredients as the detail', () => {
    const product = makeProduct({
      id: 'bowl',
      category: composerCategory,
      choices: [tomato, pak, enoki, beef, medium],
      choiceGroups: [
        group('broth', 1, [tomato]),
        group('ing', 20, [pak, enoki, beef]),
        group('spice', 1, [medium]),
      ],
    })
    expect(presentBowlLine(makeCartItem({ product, selections }), t)).toEqual(expected)
  })

  it('a line read back from storage (no groups): the broth and the heat are told apart by name', () => {
    // "Champignons enoki" names a broth photo and "bœuf" another one: neither is taken for the broth.
    const product = makeProduct({
      id: 'bowl',
      category: composerCategory,
      choices: [tomato, pak, enoki, beef, medium],
    })
    expect(presentBowlLine(makeCartItem({ product, selections }), t)).toEqual(expected)
  })

  it('no photo without a broth, no ingredient count without ingredients', () => {
    const product = makeProduct({ id: 'bowl', category: composerCategory, choices: [medium] })
    expect(
      presentBowlLine(
        makeCartItem({
          product,
          selections: [
            { groupId: 'spice', choiceId: 'medium', quantity: 1 },
            { groupId: 'gone', choiceId: 'deleted', quantity: 1 },
          ],
        }),
        t,
      ),
    ).toEqual({ image: undefined, summary: 'Moyen', details: [] })
  })

  it('leaves every other line alone', () => {
    const product = makeProduct({ id: 'set', choices: [tomato] })
    expect(presentBowlLine(makeCartItem({ product, selections }), t)).toBeNull()
    const bowl = makeProduct({ id: 'bowl', category: composerCategory })
    expect(presentBowlLine(makeCartItem({ product: bowl }), t)).toBeNull()
  })
})
