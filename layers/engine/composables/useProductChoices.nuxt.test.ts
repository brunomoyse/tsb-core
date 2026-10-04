// useProductChoices: the choice-group selection engine behind the product modal (fixed sets: one broth, one spice) and
// the bowl composer (min 5 / max 20 ingredients): grouping, min/max that scale with the quantity, selection, pricing.
// Pure logic over a product and a quantity ref; only the i18n function is a fake (it returns the key and its params).
// Run: `vp test run layers/engine/composables/useProductChoices.nuxt.test.ts`.
import { nextTick, ref, toRaw } from 'vue'
import { describe, expect, it, vi } from 'vite-plus/test'
import { useProductChoices } from '#engine/composables/useProductChoices'
import type { Product, ProductChoice, ProductChoiceGroup } from '#engine/types'
import { makeChoice, makeProduct } from '../../../test/fixtures/catalog'

vi.mock('vue-i18n', async (importOriginal) => {
  const { fakeI18n } = await import('../../../test/helpers/i18n')
  return { ...(await importOriginal<typeof import('vue-i18n')>()), useI18n: fakeI18n }
})

const choice = (id: string, groupId: string, extra: Partial<ProductChoice> = {}) =>
  makeChoice({ id, choiceGroupId: groupId, productId: 'bowl', name: id, ...extra })

const group = (
  id: string,
  min: number,
  max: number,
  choices: ProductChoice[],
  sortOrder = 0,
): ProductChoiceGroup => ({
  id,
  productId: 'bowl',
  minSelections: min,
  maxSelections: max,
  sortOrder,
  name: id,
  choices,
})

/** A ramen with a pick-one broth (a: free, b: +1.50) and a pick-one spice. */
const fixed = () => {
  const brothA = choice('broth-a', 'broth')
  const brothB = choice('broth-b', 'broth', { priceModifier: '1.50' })
  const mild = choice('mild', 'spice', { sortOrder: 1 })
  const hot = choice('hot', 'spice', { priceModifier: '0.50', sortOrder: 2 })
  return makeProduct({
    id: 'ramen',
    price: '12.00',
    choices: [brothA, brothB, mild, hot],
    choiceGroups: [group('spice', 1, 1, [mild, hot], 2), group('broth', 1, 1, [brothA, brothB], 1)],
  })
}

/** The "sur mesure" bowl: 5 to 20 ingredients, noodles optional up to 2. */
const composer = () => {
  const shrimp = choice('shrimp', 'ingredients', { priceModifier: '1.00' })
  const tofu = choice('tofu', 'ingredients')
  const corn = choice('corn', 'ingredients')
  const glass = choice('glass', 'noodles', { priceModifier: '0.50' })
  return makeProduct({
    id: 'bowl',
    price: '8.00',
    choices: [shrimp, tofu, corn, glass],
    choiceGroups: [
      group('ingredients', 5, 20, [shrimp, tofu, corn]),
      group('noodles', 0, 2, [glass], 1),
    ],
  })
}

const use = (product: Product | null | undefined, quantity = 1) => {
  const qty = ref(quantity)
  return { qty, api: useProductChoices(product, qty) }
}

describe('groups', () => {
  it('a product with groups lists them in display order', () => {
    expect(use(fixed()).api.choiceGroups.value.map((g) => g.id)).toEqual(['broth', 'spice'])
  })

  it('a product from before choice groups gets one synthetic pick-one group, choices sorted', () => {
    const old = makeProduct({
      id: 'old',
      choices: [choice('b', '', { sortOrder: 2 }), choice('a', '', { sortOrder: 1 })],
    })
    const { choiceGroups } = use(old).api
    expect(choiceGroups.value).toHaveLength(1)
    expect(choiceGroups.value[0]).toMatchObject({
      id: 'legacy-single',
      productId: 'old',
      minSelections: 1,
      maxSelections: 1,
    })
    expect(choiceGroups.value[0]!.choices.map((c) => c.id)).toEqual(['a', 'b'])
  })

  it('a product with an empty groups list falls back to its bare choices too', () => {
    const old = makeProduct({ choices: [choice('a', '')], choiceGroups: [] })
    expect(use(old).api.choiceGroups.value[0]!.id).toBe('legacy-single')
  })

  it('no product, no choices: no groups, nothing to choose, everything satisfied', () => {
    for (const product of [null, undefined, makeProduct({ choices: [] })]) {
      const { api } = use(product)
      expect(api.choiceGroups.value).toEqual([])
      expect(api.hasChoices.value).toBe(false)
      expect(api.allGroupsSatisfied.value).toBe(true)
      expect(api.blockingGroup.value).toBeNull()
      expect(api.selectionList.value).toEqual([])
      expect(api.selectedQuantitiesByGroup.value).toEqual({})
      expect(api.selectedChoice.value).toBeNull()
    }
  })

  it('hasChoices is about the product’s choices', () => {
    expect(use(fixed()).api.hasChoices.value).toBe(true)
  })

  it('a product with choices and no groups array at all', () => {
    const old = makeProduct({ choices: [choice('a', '')] })
    delete (old as Partial<Product>).choiceGroups
    expect(use(old).api.choiceGroups.value).toHaveLength(1)
  })

  it('a composer is a product with a multi-select group; a fixed set is not', () => {
    expect(use(composer()).api.isComposer.value).toBe(true)
    expect(use(fixed()).api.isComposer.value).toBe(false)
    const { api } = use(composer())
    const [ingredients, noodles] = api.choiceGroups.value
    expect(api.isMultiSelectGroup(ingredients!)).toBe(true)
    expect(api.isMultiSelectGroup(noodles!)).toBe(true)
    expect(api.isMultiSelectGroup(use(fixed()).api.choiceGroups.value[0]!)).toBe(false)
  })

  it('min and max scale with the line quantity: 2 bowls need 10 ingredients', () => {
    const { api, qty } = use(composer(), 1)
    const ingredients = api.choiceGroups.value[0]!
    expect([api.groupTargetMin(ingredients), api.groupTargetMax(ingredients)]).toEqual([5, 20])
    qty.value = 2
    expect([api.groupTargetMin(ingredients), api.groupTargetMax(ingredients)]).toEqual([10, 40])
  })
})

describe('selecting', () => {
  it('increments a choice until its group is full, never past the maximum', () => {
    const product = composer()
    const { api } = use(product)
    const [shrimp, tofu] = product.choices
    for (let i = 0; i < 25; i++) api.incrementChoice(shrimp!)
    expect(api.quantityOf(shrimp!)).toBe(20)
    expect(api.canIncrement(shrimp!)).toBe(false)
    expect(api.canIncrement(tofu!)).toBe(false) // The group is full for everyone
    api.incrementChoice(tofu!)
    expect(api.quantityOf(tofu!)).toBe(0)
  })

  it('the minimum counts total quantity, not distinct choices: 4 shrimp and 1 tofu satisfy "min 5"', () => {
    const product = composer()
    const { api } = use(product)
    const [shrimp, tofu] = product.choices
    for (let i = 0; i < 4; i++) api.incrementChoice(shrimp!)
    api.incrementChoice(tofu!)
    expect(api.selectedCountIn(api.choiceGroups.value[0]!)).toBe(5)
    expect(api.isGroupSatisfied(api.choiceGroups.value[0]!)).toBe(true)
    expect(api.allGroupsSatisfied.value).toBe(true)
  })

  it('a choice of an unknown group cannot be incremented or exclusively selected', () => {
    const { api } = use(composer())
    const stray = choice('stray', 'nowhere')
    expect(api.canIncrement(stray)).toBe(false)
    api.incrementChoice(stray)
    api.selectExclusive(stray)
    expect(api.selectedChoiceQuantities.value).toEqual({})
  })

  it('decrementing steps down, deletes the entry at zero, and ignores a choice that is not selected', () => {
    const product = composer()
    const { api } = use(product)
    const shrimp = product.choices[0]!
    api.decrementChoice(shrimp) // Nothing selected: no-op, no negative entry
    expect(api.selectedChoiceQuantities.value).toEqual({})
    api.incrementChoice(shrimp)
    api.incrementChoice(shrimp)
    api.decrementChoice(shrimp)
    expect(api.selectedChoiceQuantities.value).toEqual({ shrimp: 1 })
    api.decrementChoice(shrimp)
    expect(api.selectedChoiceQuantities.value).toEqual({}) // Deleted, never zeroed
  })

  it('selectExclusive picks one in a pick-one group, replacing the previous pick', () => {
    const product = fixed()
    const { api } = use(product)
    const [brothA, brothB, mild] = product.choices
    api.selectExclusive(brothA!)
    api.selectExclusive(mild!)
    api.selectExclusive(brothB!)
    expect(api.selectedChoiceQuantities.value).toEqual({ 'broth-b': 1, mild: 1 })
  })

  it('selectExclusive records the group’s scaled minimum, so 2 bowls count the broth twice', () => {
    const product = fixed()
    const { api, qty } = use(product, 2)
    api.selectExclusive(product.choices[0]!)
    expect(api.quantityOf(product.choices[0]!)).toBe(2)
    expect(qty.value).toBe(2)
  })

  it('selectExclusive records at least 1 even for an optional group (min 0)', () => {
    const optional = makeProduct({
      id: 'opt',
      choices: [choice('x', 'g')],
      choiceGroups: [group('g', 0, 1, [choice('x', 'g')])],
    })
    const { api } = use(optional)
    api.selectExclusive(optional.choices[0]!)
    expect(api.quantityOf(optional.choices[0]!)).toBe(1)
  })

  it('reset forgets every selection', () => {
    const product = fixed()
    const { api } = use(product)
    api.selectExclusive(product.choices[0]!)
    api.reset()
    expect(api.selectedChoiceQuantities.value).toEqual({})
    expect(api.selectionList.value).toEqual([])
  })
})

describe('what is selected', () => {
  it('selectionList carries group, choice and quantity; entries of a choice the product lost are dropped', () => {
    const product = composer()
    const { api } = use(product)
    api.incrementChoice(product.choices[0]!)
    api.incrementChoice(product.choices[0]!)
    api.selectedChoiceQuantities.value = {
      ...api.selectedChoiceQuantities.value,
      ghost: 3,
      tofu: 0,
    }
    expect(api.selectionList.value).toEqual([
      { groupId: 'ingredients', choiceId: 'shrimp', quantity: 2 },
    ])
  })

  it('selectedQuantitiesByGroup ignores zero or negative entries, unknown choices and choices without a group', () => {
    const noGroup = choice('free', '')
    const product = makeProduct({ id: 'p', choices: [...composer().choices, noGroup] })
    const { api } = use(product)
    api.selectedChoiceQuantities.value = { shrimp: 2, tofu: -1, corn: 0, ghost: 4, free: 5 }
    expect(api.selectedQuantitiesByGroup.value).toEqual({ ingredients: 2 })
  })

  it('selectedChoice (legacy single choice) is the choice picked once; null when none or only multiples', () => {
    const product = fixed()
    const { api } = use(product)
    expect(api.selectedChoice.value).toBeNull()
    api.selectExclusive(product.choices[1]!)
    expect(api.selectedChoice.value?.id).toBe('broth-b')
    const bowl = composer()
    const { api: multiple } = use(bowl)
    multiple.incrementChoice(bowl.choices[0]!)
    multiple.incrementChoice(bowl.choices[0]!)
    expect(multiple.selectedChoice.value).toBeNull()
  })

  it('selectedChoice is null when the single selection’s choice has disappeared from the product', () => {
    const product = fixed()
    const { api } = use(product)
    api.selectedChoiceQuantities.value = { ghost: 1 }
    expect(api.selectedChoice.value).toBeNull()
  })
})

describe('pricing', () => {
  it('prices the line like the cart: base × quantity plus the modifiers of the selections', () => {
    const product = fixed()
    const { api } = use(product)
    expect(api.lineTotalCents.value).toBe(1200)
    api.selectExclusive(product.choices[1]!) // Broth B +1.50
    api.selectExclusive(product.choices[3]!) // Hot +0.50
    expect(api.lineTotalCents.value).toBe(1200 + 150 + 50)
    expect(api.displayPriceCents.value).toBe(1400)
  })

  it('selection quantities are line-wide: the surcharge is not multiplied by the quantity again', () => {
    const product = fixed()
    const { api } = use(product, 2)
    api.selectExclusive(product.choices[1]!) // Recorded ×2
    expect(api.lineTotalCents.value).toBe(2 * 1200 + 2 * 150)
    expect(api.displayPriceCents.value).toBe(1350)
  })

  it('a composer bowl: 4 shrimp at +1.00 and 1 tofu', () => {
    const product = composer()
    const { api } = use(product)
    for (let i = 0; i < 4; i++) api.incrementChoice(product.choices[0]!)
    api.incrementChoice(product.choices[1]!)
    expect(api.lineTotalCents.value).toBe(800 + 400)
  })

  it('without a product the line costs nothing', () => {
    const { api } = use(null)
    expect(api.lineTotalCents.value).toBe(0)
    expect(api.displayPriceCents.value).toBe(0)
  })
})

describe('satisfaction and hints', () => {
  it('a group is satisfied only between its scaled min and max', () => {
    const product = composer()
    const { api, qty } = use(product)
    const ingredients = api.choiceGroups.value[0]!
    expect(api.isGroupSatisfied(ingredients)).toBe(false)
    for (let i = 0; i < 5; i++) api.incrementChoice(product.choices[0]!)
    expect(api.isGroupSatisfied(ingredients)).toBe(true)
    qty.value = 2 // Now 10 are needed
    expect(api.isGroupSatisfied(ingredients)).toBe(false)
  })

  it('blockingGroup is the first unsatisfied group, in display order; null when all are', () => {
    const product = fixed()
    const { api } = use(product)
    expect(api.blockingGroup.value?.id).toBe('broth')
    api.selectExclusive(product.choices[0]!)
    expect(api.blockingGroup.value?.id).toBe('spice')
    api.selectExclusive(product.choices[2]!)
    expect(api.blockingGroup.value).toBeNull()
    expect(api.allGroupsSatisfied.value).toBe(true)
  })

  it('hint of a fixed group (min = max): how many more to choose, pluralised', () => {
    const { api } = use(fixed())
    expect(api.groupHint(api.choiceGroups.value[0]!)).toBe('menu.chooseRemaining{"count":1}#1')
  })

  it('hint of a ranged group (min < max): "choose at least", counting down as the customer picks', () => {
    const product = composer()
    const { api } = use(product)
    const ingredients = api.choiceGroups.value[0]!
    expect(api.groupHint(ingredients)).toBe('menu.chooseAtLeast{"count":5}#5')
    api.incrementChoice(product.choices[0]!)
    api.incrementChoice(product.choices[0]!)
    expect(api.groupHint(ingredients)).toBe('menu.chooseAtLeast{"count":3}#3')
    for (let i = 0; i < 3; i++) api.incrementChoice(product.choices[0]!)
    expect(api.groupHint(ingredients)).toBe('menu.chooseAtLeast{"count":0}#0')
  })

  it('hint of an overfull group says how many to remove (the quantity went down)', () => {
    const product = fixed()
    const { api, qty } = use(product, 2)
    api.selectExclusive(product.choices[0]!) // ×2
    qty.value = 1
    // The pick was rescaled by the watcher, so overfill it by hand as a stale state would.
    api.selectedChoiceQuantities.value = { 'broth-a': 3 }
    expect(api.groupHint(api.choiceGroups.value[0]!)).toBe('menu.removeExcess{"count":2}#2')
  })
})

describe('the line quantity changes', () => {
  it('an exclusive pick is rescaled so the group stays satisfiable', async () => {
    const product = fixed()
    const { api, qty } = use(product, 1)
    api.selectExclusive(product.choices[0]!)
    api.selectExclusive(product.choices[2]!)
    qty.value = 3
    await nextTick()
    expect(api.selectedChoiceQuantities.value).toEqual({ 'broth-a': 3, mild: 3 })
    expect(api.allGroupsSatisfied.value).toBe(true)
    qty.value = 1
    await nextTick()
    expect(api.selectedChoiceQuantities.value).toEqual({ 'broth-a': 1, mild: 1 })
  })

  it('multi-select groups are never rescaled: the customer picks again', async () => {
    const product = composer()
    const { api, qty } = use(product, 1)
    for (let i = 0; i < 5; i++) api.incrementChoice(product.choices[0]!)
    qty.value = 2
    await nextTick()
    expect(api.quantityOf(product.choices[0]!)).toBe(5)
    expect(api.isGroupSatisfied(api.choiceGroups.value[0]!)).toBe(false)
  })

  it('a pick-one group with nothing picked, or with several distinct picks, is left alone', async () => {
    const product = fixed()
    const { api, qty } = use(product, 1)
    api.selectedChoiceQuantities.value = { 'broth-a': 1, 'broth-b': 1 } // Two picks in one group
    qty.value = 2
    await nextTick()
    expect(api.selectedChoiceQuantities.value).toEqual({ 'broth-a': 1, 'broth-b': 1 })
  })

  it('a pick that is already right for the new quantity is not rewritten (no needless state change)', async () => {
    const product = fixed()
    const { api, qty } = use(product, 1)
    api.selectExclusive(product.choices[0]!)
    const right = { 'broth-a': 2 }
    api.selectedChoiceQuantities.value = right // Already what quantity 2 needs
    qty.value = 2
    await nextTick()
    expect(toRaw(api.selectedChoiceQuantities.value)).toBe(right)
  })

  it('an optional pick-one group keeps its pick at least once when the quantity changes', async () => {
    const x = choice('x', 'g')
    const product = makeProduct({ id: 'opt', choices: [x], choiceGroups: [group('g', 0, 1, [x])] })
    const { api, qty } = use(product, 1)
    api.selectExclusive(x)
    qty.value = 3
    await nextTick()
    expect(api.quantityOf(x)).toBe(1)
  })
})
