// useCartItemEdit: the cart line being edited, shared between the cart (which sets it) and the product modal.
// Run: `vp test run layers/engine/composables/useCartItemEdit.nuxt.test.ts`.
import { beforeEach, describe, expect, it } from 'vite-plus/test'
import { useCartItemEdit } from '#engine/composables/useCartItemEdit'
import { makeCartItem } from '../../../test/fixtures/catalog'

beforeEach(() => {
  useCartItemEdit().value = null
})

describe('useCartItemEdit', () => {
  it('starts with no line being edited', () => {
    expect(useCartItemEdit().value).toBeNull()
  })

  it('is one shared state: what one caller sets, the next one reads (cart sets it, modal reads it)', () => {
    const item = makeCartItem({ quantity: 2 })
    useCartItemEdit().value = item
    expect(useCartItemEdit().value).toEqual(item)
  })

  it('is cleared by setting it back to null (the modal does so on confirm)', () => {
    const edit = useCartItemEdit()
    edit.value = makeCartItem()
    edit.value = null
    expect(useCartItemEdit().value).toBeNull()
  })
})
