// useCartItemEdit: the cart line being edited, shared between the cart (which sets it) and the product modal.
// Run: `vp test run layers/engine/composables/useCartItemEdit.nuxt.test.ts`.
import { beforeEach, describe, expect, it } from 'vite-plus/test'
import { makeCartItem } from '../../../test/fixtures/catalog'
import { useCartItemEdit } from '#engine/composables/useCartItemEdit'
import { useState } from '#imports'

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

  it('lives in the Nuxt state under "cart-item-edit", which is what the cart and the product modal agree on', () => {
    const item = makeCartItem({ quantity: 3 })
    useCartItemEdit().value = item
    expect(useState('cart-item-edit').value).toEqual(item)
  })

  it('is cleared by setting it back to null (the modal does so on confirm)', () => {
    const edit = useCartItemEdit()
    edit.value = makeCartItem()
    edit.value = null
    expect(useCartItemEdit().value).toBeNull()
  })
})
