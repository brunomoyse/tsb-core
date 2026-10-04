// YGF BowlComposer: the build-your-own-bowl flow. Opened from "Edit" on a customised cart line, it starts from that
// line's broth, ingredients and quantity and, on confirm, replaces the line instead of adding a second one.
// The product query (the API) is the boundary; the real cart store, choices composable, picker and i18n run.
// Run: `vp test run apps/ygfliege/components/menu/BowlComposer.nuxt.test.ts`.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { clearNuxtData, useNuxtApp } from '#imports'
import { makeChoice, makeProduct } from '../../../../test/fixtures/catalog'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import type { CartItem } from '#engine/types'
import { settle } from '../../../../test/helpers/settle'
import { useCartItemEdit } from '#engine/composables/useCartItemEdit'
import { useCartStore } from '#engine/stores/cart'

const gqlFetch = vi.hoisted(() => vi.fn())
mockNuxtImport('useNuxtApp', async (original) => {
  const { withGqlFetch } = await import('../../../../test/helpers/gqlFetch')
  return () => withGqlFetch(original(), gqlFetch)
})

const { default: BowlComposer } = await import('./BowlComposer.vue')

let n = 0
/** A bowl: one broth (pick one) and 2 to 5 ingredients (steppers). */
const bowl = () => {
  const id = `bowl-${++n}`
  const choice = (key: string, group: string, name: string) =>
    makeChoice({ id: `${id}-${key}`, productId: id, choiceGroupId: `${id}-${group}`, name })
  const tomato = choice('tomato', 'broth', 'Tomato')
  const bone = choice('bone', 'broth', 'Bone')
  const tofu = choice('tofu', 'ingredients', 'Tofu')
  const noodles = choice('noodles', 'ingredients', 'Noodles')
  const group = (
    key: string,
    name: string,
    min: number,
    max: number,
    choices: (typeof tofu)[],
  ) => ({
    id: `${id}-${key}`,
    productId: id,
    minSelections: min,
    maxSelections: max,
    sortOrder: key === 'broth' ? 0 : 1,
    name,
    choices,
  })
  const product = makeProduct({
    id,
    name: 'Malatang sur mesure',
    choices: [tomato, bone, tofu, noodles],
    choiceGroups: [
      group('broth', 'Broth', 1, 1, [tomato, bone]),
      group('ingredients', 'Ingredients', 2, 5, [tofu, noodles]),
    ],
  })
  const selection = (c: typeof tofu, quantity: number) => ({
    groupId: c.choiceGroupId!,
    choiceId: c.id,
    quantity,
  })
  return { id, product, tomato, bone, tofu, noodles, selection }
}

// The store of the booted app (the component's own), emptied before each test.
let cart: ReturnType<typeof useCartStore>

beforeEach(() => {
  cart = useCartStore()
  cart.resetState()
  gqlFetch.mockReset()
})
afterEach(() => {
  clearNuxtData()
  useCartItemEdit().value = null
})

const open = async (set: ReturnType<typeof bowl>) => {
  gqlFetch.mockResolvedValue({ product: set.product })
  const composer = await mountSuspended(BowlComposer, { props: { product: set.id } })
  await settle()
  return composer
}
type Composer = Awaited<ReturnType<typeof open>>
const confirm = (composer: Composer) => composer.get('[data-testid="bowl-composer-add-to-cart"]')
const ingredientCount = (composer: Composer, id: string) =>
  composer.get(`[data-testid="bowl-composer-choice-${id}"] .stepper-value`).text()
const t = (key: string) => useNuxtApp().$i18n.t(key)

/** One tomato bowl with 2 tofu and 1 noodles, in the cart, opened for editing. */
const editTomatoBowl = (set: ReturnType<typeof bowl>) => {
  cart.addProduct(set.product, 1, {
    selections: [
      set.selection(set.tomato, 1),
      set.selection(set.tofu, 2),
      set.selection(set.noodles, 1),
    ],
  })
  useCartItemEdit().value = { ...cart.products.at(-1)! } as CartItem
}

describe('opened from "Edit" on a cart line', () => {
  it('starts from the broth, the ingredients and the quantity of the line, and offers to update it', async () => {
    const set = bowl()
    editTomatoBowl(set)
    const composer = await open(set)

    expect(
      composer
        .get(`[data-testid="bowl-composer-choice-${set.tomato.id}"]`)
        .attributes('aria-pressed'),
    ).toBe('true')
    expect(ingredientCount(composer, set.tofu.id)).toBe('2')
    expect(ingredientCount(composer, set.noodles.id)).toBe('1')
    expect(confirm(composer).text()).toContain(t('menu.update'))
    expect(confirm(composer).attributes('disabled')).toBeUndefined()
  })

  it('replaces the line with the new composition: still one line, never a second one', async () => {
    const set = bowl()
    editTomatoBowl(set)
    const composer = await open(set)

    await composer
      .get(`[data-testid="bowl-composer-choice-inc-${set.noodles.id}"]`)
      .trigger('click')
    await composer.get(`[data-testid="bowl-composer-choice-${set.bone.id}"]`).trigger('click')
    await confirm(composer).trigger('click')

    expect(cart.products).toHaveLength(1)
    expect(cart.products[0]!.quantity).toBe(1)
    expect(cart.products[0]!.selectedChoices).toHaveLength(3)
    expect(cart.products[0]!.selectedChoices).toEqual(
      expect.arrayContaining([
        set.selection(set.bone, 1),
        set.selection(set.tofu, 2),
        set.selection(set.noodles, 2),
      ]),
    )
    expect(composer.emitted('close')).toHaveLength(1)
  })

  it('keeps the edited line where it was in the cart, not at the bottom', async () => {
    const set = bowl()
    const other = bowl()
    editTomatoBowl(set)
    cart.addProduct(other.product, 1, {
      selections: [other.selection(other.bone, 1), other.selection(other.tofu, 1)],
    })
    const composer = await open(set)

    await composer
      .get(`[data-testid="bowl-composer-choice-inc-${set.noodles.id}"]`)
      .trigger('click')
    await confirm(composer).trigger('click')

    expect(cart.products.map((line) => line.product.id)).toEqual([set.id, other.id])
    expect(cart.products[0]!.selectedChoices).toEqual(
      expect.arrayContaining([set.selection(set.noodles, 2)]),
    )
  })

  it('forgets the edit when it closes, so the next opening is a plain one', async () => {
    const set = bowl()
    editTomatoBowl(set)
    const composer = await open(set)
    composer.unmount()
    expect(useCartItemEdit().value).toBeNull()
  })

  it('ignores an edit that is for another product', async () => {
    const set = bowl()
    const other = bowl()
    cart.addProduct(other.product, 1, {
      selections: [other.selection(other.bone, 1), other.selection(other.tofu, 2)],
    })
    useCartItemEdit().value = { ...cart.products[0]! } as CartItem
    const composer = await open(set)

    expect(ingredientCount(composer, set.tofu.id)).toBe('0')
    expect(confirm(composer).text()).toContain(t('menu.addToCart'))
    expect(confirm(composer).attributes('disabled')).toBeDefined()
  })
})

describe('opened from the menu', () => {
  it('adds a line, as before', async () => {
    const set = bowl()
    const composer = await open(set)

    expect(confirm(composer).text()).toContain(t('menu.addToCart'))
    await composer.get(`[data-testid="bowl-composer-choice-${set.tomato.id}"]`).trigger('click')
    await composer.get(`[data-testid="bowl-composer-choice-inc-${set.tofu.id}"]`).trigger('click')
    await composer
      .get(`[data-testid="bowl-composer-choice-inc-${set.noodles.id}"]`)
      .trigger('click')
    await confirm(composer).trigger('click')

    expect(cart.products).toHaveLength(1)
    expect(cart.products[0]!.selectedChoices).toEqual(
      expect.arrayContaining([
        set.selection(set.tomato, 1),
        set.selection(set.tofu, 1),
        set.selection(set.noodles, 1),
      ]),
    )
  })
})
