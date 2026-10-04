// useCartItemLabel / useOrderItemLabel in the real app of ygfliege: this brand does not show the menu code.
import { describe, expect, it, vi } from 'vite-plus/test'
import { makeCartItem, makeProduct } from '../../../test/fixtures/catalog'
import { useAppConfig } from '#imports'
import { useCartItemLabel } from '#engine/composables/useCartItemLabel'
import { useOrderItemLabel } from '#engine/composables/useOrderItemLabel'

vi.mock('vue-i18n', async (importOriginal) => {
  const { fakeI18n } = await import('../../../test/helpers/i18n')
  return { ...(await importOriginal<typeof import('vue-i18n')>()), useI18n: fakeI18n }
})

const product = makeProduct({
  id: 'bowl',
  code: 'B1',
  category: { id: 'c', name: 'Bols', order: 1, slug: 'bols', products: [] },
})

describe('item labels in the ygfliege app', () => {
  it('the brand does not set showProductCode', () => {
    expect(useAppConfig().brand.showProductCode).toBeFalsy()
  })

  it('a cart line shows its category but not the menu code', () => {
    expect(useCartItemLabel().itemLabelMeta(makeCartItem({ product }))).toBe('Bols')
  })

  it('an order line shows its category but not the menu code', () => {
    expect(useOrderItemLabel().orderItemMeta({ product, selections: [], choice: null })).toBe(
      'Bols',
    )
  })
})
