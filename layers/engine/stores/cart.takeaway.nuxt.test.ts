// A takeaway-only brand (`deliveryEnabled: false`): a fresh cart starts on PICKUP.
import { createPinia, setActivePinia } from 'pinia'
import { expect, it, vi } from 'vite-plus/test'
import { useCartStore } from '#engine/stores/cart'

vi.mock('#brand/brand', async (importOriginal) => {
  const actual = await importOriginal<typeof import('#brand/brand')>()
  return { brand: { ...actual.brand, deliveryEnabled: false, orderExtras: [] } }
})

it('starts on pickup, with no extras, and a reset goes back to pickup', () => {
  setActivePinia(createPinia())
  const cart = useCartStore()
  expect(cart.collectionOption).toBe('PICKUP')
  expect(cart.orderExtra).toEqual([])
  cart.collectionOption = 'DELIVERY'
  cart.resetState()
  expect(cart.collectionOption).toBe('PICKUP')
})
