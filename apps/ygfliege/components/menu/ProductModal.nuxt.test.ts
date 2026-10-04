// YGF ProductModal: the dialog of the fixed sets (broth + spice). Opened from "Edit" on a customised cart line, it
// starts from that line's selections and quantity and, on confirm, replaces the line instead of adding a second one.
// The product query (the API) is the boundary; the real cart store, choices composable, picker and i18n run.
// Run: `vp test run apps/ygfliege/components/menu/ProductModal.nuxt.test.ts`.
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

const { default: ProductModal } = await import('./ProductModal.vue')

let n = 0
/** A fixed set: one broth (pick one) and one spice level (pick one). */
const fixedSet = () => {
  const id = `set-${++n}`
  const choice = (key: string, group: string, name: string) =>
    makeChoice({ id: `${id}-${key}`, productId: id, choiceGroupId: `${id}-${group}`, name })
  const group = (key: string, name: string, choices: ReturnType<typeof choice>[]) => ({
    id: `${id}-${key}`,
    productId: id,
    minSelections: 1,
    maxSelections: 1,
    sortOrder: 0,
    name,
    choices,
  })
  const tomato = choice('tomato', 'broth', 'Tomato')
  const bone = choice('bone', 'broth', 'Bone')
  const mild = choice('mild', 'spice', 'Mild')
  const hot = choice('hot', 'spice', 'Hot')
  const product = makeProduct({
    id,
    name: 'Menu Découverte',
    choices: [tomato, bone, mild, hot],
    choiceGroups: [group('broth', 'Broth', [tomato, bone]), group('spice', 'Spice', [mild, hot])],
  })
  const selection = (c: ReturnType<typeof choice>, quantity: number) => ({
    groupId: c.choiceGroupId!,
    choiceId: c.id,
    quantity,
  })
  return { id, product, tomato, bone, mild, hot, selection }
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

const open = async (set: ReturnType<typeof fixedSet>) => {
  gqlFetch.mockResolvedValue({ product: set.product })
  const modal = await mountSuspended(ProductModal, { props: { product: set.id } })
  await settle()
  return modal
}
const pressed = (modal: Awaited<ReturnType<typeof open>>, id: string) =>
  modal.get(`[data-testid="product-modal-choice-${id}"]`).attributes('aria-pressed')
const confirm = (modal: Awaited<ReturnType<typeof open>>) =>
  modal.get('[data-testid="product-modal-add-to-cart"]')
const t = (key: string) => useNuxtApp().$i18n.t(key)

/** A line of the cart: two sets with the tomato broth and the hot spice level, opened for editing. */
const editTwoHotTomato = (set: ReturnType<typeof fixedSet>) => {
  cart.addProduct(set.product, 2, {
    selections: [set.selection(set.tomato, 2), set.selection(set.hot, 2)],
  })
  useCartItemEdit().value = { ...cart.products.at(-1)! } as CartItem
}

describe('opened from "Edit" on a cart line', () => {
  it('starts from the quantity and the selections of the line, and offers to update it', async () => {
    const set = fixedSet()
    editTwoHotTomato(set)
    const modal = await open(set)

    expect(modal.get('.stepper-value').text()).toBe('2')
    expect(pressed(modal, set.tomato.id)).toBe('true')
    expect(pressed(modal, set.hot.id)).toBe('true')
    expect(pressed(modal, set.bone.id)).toBe('false')
    expect(pressed(modal, set.mild.id)).toBe('false')
    expect(confirm(modal).text()).toContain(t('menu.update'))
    expect(confirm(modal).attributes('disabled')).toBeUndefined()
  })

  it('replaces the line with the new selections: still one line, never a second one', async () => {
    const set = fixedSet()
    editTwoHotTomato(set)
    const modal = await open(set)

    await modal.get(`[data-testid="product-modal-choice-${set.bone.id}"]`).trigger('click')
    await confirm(modal).trigger('click')

    expect(cart.products).toHaveLength(1)
    expect(cart.products[0]!.quantity).toBe(2)
    expect(cart.products[0]!.selectedChoices).toEqual(
      expect.arrayContaining([set.selection(set.bone, 2), set.selection(set.hot, 2)]),
    )
    expect(cart.products[0]!.selectedChoices).toHaveLength(2)
    expect(modal.emitted('close')).toHaveLength(1)
  })

  it('keeps the other lines of the cart, and takes the new quantity', async () => {
    const set = fixedSet()
    const other = fixedSet()
    cart.addProduct(other.product, 1, {
      selections: [other.selection(other.bone, 1), other.selection(other.mild, 1)],
    })
    editTwoHotTomato(set)
    const modal = await open(set)

    await modal.findAll('footer .stepper-btn')[1]!.trigger('click') // The "+" of the quantity

    await confirm(modal).trigger('click')

    expect(cart.products.map((line) => [line.product.id, line.quantity])).toEqual([
      [other.id, 1],
      [set.id, 3],
    ])
    // A pick-one choice follows the quantity stepper.
    expect(cart.products[1]!.selectedChoices).toEqual(
      expect.arrayContaining([set.selection(set.tomato, 3), set.selection(set.hot, 3)]),
    )
  })

  it('forgets the edit when it closes, so the next opening is a plain one', async () => {
    const set = fixedSet()
    editTwoHotTomato(set)
    const modal = await open(set)
    modal.unmount()
    expect(useCartItemEdit().value).toBeNull()
  })

  it('ignores an edit that is for another product', async () => {
    const set = fixedSet()
    const other = fixedSet()
    cart.addProduct(other.product, 3, {
      selections: [other.selection(other.bone, 3), other.selection(other.mild, 3)],
    })
    useCartItemEdit().value = { ...cart.products[0]! } as CartItem
    const modal = await open(set)

    expect(modal.get('.stepper-value').text()).toBe('1')
    expect(pressed(modal, set.tomato.id)).toBe('false')
    expect(confirm(modal).text()).toContain(t('menu.addToCart'))
    expect(confirm(modal).attributes('disabled')).toBeDefined()
  })
})

describe('opened from the menu', () => {
  it('adds a line, as before', async () => {
    const set = fixedSet()
    const modal = await open(set)

    expect(confirm(modal).text()).toContain(t('menu.addToCart'))
    await modal.get(`[data-testid="product-modal-choice-${set.tomato.id}"]`).trigger('click')
    await modal.get(`[data-testid="product-modal-choice-${set.mild.id}"]`).trigger('click')
    await confirm(modal).trigger('click')

    expect(cart.products).toHaveLength(1)
    expect(cart.products[0]!.selectedChoices).toEqual(
      expect.arrayContaining([set.selection(set.tomato, 1), set.selection(set.mild, 1)]),
    )
  })
})
