// useOrderExtras with the YGF Liège brand: chopsticks and cutlery, none pre-ticked, no category restriction, no sauce.
// Runs in the real app of apps/ygfliege (its `#brand/brand`), not in a copy of the other brand's app.
// Run: `vp test run layers/engine/composables/useOrderExtras.ygfliege.nuxt.test.ts`.
import { type EffectScope, effectScope, nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test'
import { createPinia, setActivePinia } from 'pinia'
import { makeProduct } from '../../../test/fixtures/catalog'
import { useAppConfig } from '#imports'
import { useCartStore } from '#engine/stores/cart'
import { useOrderExtras } from '#engine/composables/useOrderExtras'

let cart: ReturnType<typeof useCartStore>
let scope: EffectScope
const mount = () => {
  scope = effectScope()
  return scope.run(() => useOrderExtras())!
}

beforeEach(() => {
  setActivePinia(createPinia())
  cart = useCartStore()
})
afterEach(() => {
  scope?.stop()
})

describe('ygfliege extras', () => {
  it('runs in the ygfliege app', () => {
    expect(useAppConfig().brand.name).toBe('Yangguofu Malatang Liège')
  })

  it('offers chopsticks and cutlery, no sauce, and ticks nothing on a fresh cart', () => {
    const extras = mount()
    expect(extras.hasOfferedExtras).toBe(true)
    expect(extras.isOffered('chopsticks')).toBe(true)
    expect(extras.isOffered('cutlery')).toBe(true)
    expect(extras.isOffered('wasabi')).toBe(false)
    expect(extras.isOffered('sauce')).toBe(false)
    expect(extras.sauceOptions).toEqual([])
    expect(cart.orderExtra).toEqual([])
  })

  it('nothing is ever locked, whatever the cart holds', () => {
    cart.addProduct(makeProduct({ category: undefined }), 1)
    const extras = mount()
    expect(extras.isLocked('chopsticks')).toBe(false)
    expect(extras.isLocked('cutlery')).toBe(false)
  })

  it('applyDefaults drops the entries of the other brand but keeps the customer’s choice', () => {
    cart.orderExtra = [
      { name: 'wasabi' },
      { name: 'sauce', options: ['both'] },
      { name: 'cutlery' },
    ]
    cart.addProduct(makeProduct(), 1)
    mount().applyDefaults()
    expect(cart.orderExtra).toEqual([{ name: 'cutlery' }])
  })

  it('applyDefaults pre-ticks nothing for a brand whose extras are not pre-selected', () => {
    cart.orderExtra = []
    mount().applyDefaults()
    expect(cart.orderExtra).toEqual([])
  })

  it('syncLockedExtras leaves the ticked extras alone as the cart changes', async () => {
    cart.orderExtra = [{ name: 'chopsticks' }]
    mount().syncLockedExtras()
    cart.addProduct(makeProduct(), 1)
    await nextTick()
    expect(cart.orderExtra).toEqual([{ name: 'chopsticks' }])
  })

  it('without a sauce in the brand, addSauce can be switched on and still ends as "none"', () => {
    cart.orderExtra = []
    const { addSauce, sauce } = mount()
    addSauce.value = true
    expect(sauce.value).toBe('none')
    expect(cart.orderExtra).toEqual([])
  })

  it('chopsticks and cutlery toggle as usual', () => {
    const { addChopsticks, addCutlery } = mount()
    addChopsticks.value = true
    addCutlery.value = true
    expect(cart.orderExtra).toEqual([{ name: 'chopsticks' }, { name: 'cutlery' }])
    addChopsticks.value = false
    expect(cart.orderExtra).toEqual([{ name: 'cutlery' }])
  })
})
