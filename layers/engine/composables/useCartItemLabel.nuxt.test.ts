// useCartItemLabel / useOrderItemLabel: how a cart or order line is labelled, per brand (the menu code shows only when
// `brand.showProductCode`). `useAppConfig` is wrapped, not replaced; the copy of the piece count is the i18n key.
// Run: `vp test run layers/engine/composables/useCartItemLabel.nuxt.test.ts`.
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { makeCartItem, makeChoice, makeProduct } from '../../../test/fixtures/catalog'

const brandOverride = vi.hoisted(() => ({ showProductCode: undefined as boolean | undefined }))

vi.mock('vue-i18n', async (importOriginal) => {
  const { fakeI18n } = await import('../../../test/helpers/i18n')
  return { ...(await importOriginal<typeof import('vue-i18n')>()), useI18n: fakeI18n }
})
mockNuxtImport('useAppConfig', (original) => () => {
  const config = original()
  return { ...config, brand: { ...config.brand, showProductCode: brandOverride.showProductCode } }
})

const { useCartItemLabel } = await import('#engine/composables/useCartItemLabel')
const { useOrderItemLabel } = await import('#engine/composables/useOrderItemLabel')

const ramen = makeProduct({
  id: 'ramen',
  code: 'R1',
  name: 'Tonkotsu ramen',
  pieceCount: 6,
  category: { id: 'c', name: 'Soupes', order: 1, slug: 'soupes', products: [] },
  choices: [
    makeChoice({ id: 'broth-a', name: 'Mild' }),
    makeChoice({ id: 'broth-b', name: 'Spicy' }),
  ],
})
const line = makeCartItem({
  product: ramen,
  selections: [
    { groupId: 'g', choiceId: 'broth-a', quantity: 1 },
    { groupId: 'g', choiceId: 'broth-b', quantity: 2 },
  ],
})

beforeEach(() => {
  brandOverride.showProductCode = true
})

describe('useCartItemLabel', () => {
  it('meta line: menu code and category, spaced so it wraps at the separators', () => {
    expect(useCartItemLabel().itemLabelMeta(line)).toBe('R1 · Soupes')
  })

  it('a brand that does not show the menu code only shows the category', () => {
    brandOverride.showProductCode = false
    expect(useCartItemLabel().itemLabelMeta(line)).toBe('Soupes')
  })

  it('a brand that does not say anything about product codes does not show them either', () => {
    brandOverride.showProductCode = undefined
    expect(useCartItemLabel().itemLabelMeta(line)).toBe('Soupes')
  })

  it('the cart page form (pieces: true) also says how many pieces the dish has, translated and pluralised', () => {
    expect(useCartItemLabel({ pieces: true }).itemLabelMeta(line)).toBe('R1 · Soupes · 6 menu.pcs')
    const single = makeCartItem({ product: { ...ramen, pieceCount: 1 } })
    expect(useCartItemLabel({ pieces: true }).itemLabelMeta(single)).toBe('R1 · Soupes · 1 menu.pc')
  })

  it('a line with neither code nor category has no meta line', () => {
    const bare = makeCartItem({ product: makeProduct({ code: '', category: undefined }) })
    expect(useCartItemLabel().itemLabelMeta(bare)).toBeUndefined()
  })

  it('name, choices and the line key', () => {
    const label = useCartItemLabel()
    expect(label.itemLabelName(line)).toBe('Tonkotsu ramen')
    expect(label.itemChoice(line)).toBe('Mild, Spicy x2')
    expect(label.getItemKey(line)).toMatch(/^ramen-/u)
    expect(label.getItemKey(makeCartItem({ product: ramen }))).toBe('ramen-none')
    expect(label.itemChoice(makeCartItem({ product: ramen }))).toBeUndefined()
  })
})

describe('useOrderItemLabel', () => {
  const orderLine = { product: ramen, selections: line.selectedChoices, choice: null }

  it('meta line with the menu code, spaced', () => {
    expect(useOrderItemLabel().orderItemMeta(orderLine)).toBe('R1 · Soupes')
  })

  it('without the menu code (the other brand)', () => {
    brandOverride.showProductCode = false
    const label = useOrderItemLabel()
    expect(label.orderItemMeta(orderLine)).toBe('Soupes')
    expect(label.orderItemSegments(orderLine)).toEqual([
      { text: 'Soupes', muted: true },
      { text: 'Tonkotsu ramen', muted: false },
    ])
  })

  it('segments of the name line: code and category muted, the name is the main text', () => {
    expect(useOrderItemLabel().orderItemSegments(orderLine)).toEqual([
      { text: 'R1', muted: true },
      { text: 'Soupes', muted: true },
      { text: 'Tonkotsu ramen', muted: false },
    ])
  })

  it('name and choices (an old order falls back to its single choice)', () => {
    const label = useOrderItemLabel()
    expect(label.orderItemName(orderLine)).toBe('Tonkotsu ramen')
    expect(label.orderItemChoice(orderLine)).toBe('Mild, Spicy x2')
    expect(
      label.orderItemChoice({ product: ramen, selections: [], choice: { name: 'Salmon' } }),
    ).toBe('Salmon')
    expect(label.orderItemChoice({ product: ramen, selections: [], choice: null })).toBeUndefined()
  })
})
