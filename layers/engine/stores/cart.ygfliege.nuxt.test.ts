// The cart store in the real app of ygfliege, a takeaway-only brand (`deliveryEnabled: false`): a fresh cart starts on
// PICKUP and a reset goes back to it; no extra is pre-ticked.
import { createPinia, setActivePinia } from 'pinia'
import { expect, it } from 'vite-plus/test'
import { useAppConfig } from '#imports'
import { useCartStore } from '#engine/stores/cart'

it('starts on pickup, with no extras, and a reset goes back to pickup', () => {
  expect(useAppConfig().brand.deliveryEnabled).toBe(false)
  setActivePinia(createPinia())
  const cart = useCartStore()
  expect(cart.collectionOption).toBe('PICKUP')
  expect(cart.orderExtra).toEqual([])
  cart.collectionOption = 'DELIVERY'
  cart.resetState()
  expect(cart.collectionOption).toBe('PICKUP')
})
