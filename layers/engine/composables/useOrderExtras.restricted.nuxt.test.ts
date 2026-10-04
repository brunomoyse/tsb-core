// useOrderExtras for a category-restricted extra that is NOT pre-ticked (neither shipped brand has one, the engine
// supports it): it is cleared while locked, and never ticked for the customer when unlocked.
// Run: `vp test run layers/engine/composables/useOrderExtras.restricted.nuxt.test.ts`.
import type * as BrandModule from '#brand/brand'
import { createPinia, setActivePinia } from 'pinia'
import { effectScope, nextTick } from 'vue'
import { expect, it, vi } from 'vite-plus/test'
import { makeProduct } from '../../../test/fixtures/catalog'

vi.mock('#brand/brand', async (importOriginal) => {
  const actual = await importOriginal<typeof BrandModule>()
  return {
    brand: {
      ...actual.brand,
      orderExtras: [{ name: 'dips', preselected: false, unavailableWhenCartOnlyIn: ['drinks'] }],
    },
  }
})

const { useOrderExtras } = await import('#engine/composables/useOrderExtras')
const { useCartStore } = await import('#engine/stores/cart')

const drink = makeProduct({
  id: 'cola',
  category: { id: 'd', name: 'Drinks', order: 1, slug: 'drinks', products: [] },
})

it('applyDefaults clears a locked extra and leaves an unlocked one unticked', () => {
  setActivePinia(createPinia())
  const cart = useCartStore()
  cart.orderExtra = [{ name: 'dips' }]
  cart.addProduct(drink, 1)
  const scope = effectScope()
  const extras = scope.run(() => useOrderExtras())!
  extras.applyDefaults()
  expect(cart.orderExtra).toEqual([])
  cart.addProduct(makeProduct({ id: 'sushi' }), 1)
  extras.applyDefaults()
  expect(cart.orderExtra).toEqual([])
  scope.stop()
})

it('syncLockedExtras does not tick an extra that is not pre-selected when the cart unlocks it', async () => {
  setActivePinia(createPinia())
  const cart = useCartStore()
  cart.addProduct(drink, 1)
  const scope = effectScope()
  scope.run(() => {
    useOrderExtras().syncLockedExtras()
  })
  cart.addProduct(makeProduct({ id: 'sushi' }), 1)
  await nextTick()
  expect(cart.orderExtra).toEqual([])
  scope.stop()
})
