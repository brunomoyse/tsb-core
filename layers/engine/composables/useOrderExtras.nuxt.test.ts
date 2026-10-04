// UseOrderExtras with the tokyosushi brand: chopsticks, and wasabi / ginger / soy sauce that are pre-ticked but not
// Offered (and cleared) while the whole cart is hot dishes (`unavailableWhenCartOnlyIn: ['tokyo-hot']`).
// Real cart store and brand data. The other brand is in useOrderExtras.ygfliege.nuxt.test.ts.
// Run: `vp test run layers/engine/composables/useOrderExtras.nuxt.test.ts`.
import { createPinia, setActivePinia } from 'pinia'
import { type EffectScope, effectScope, nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test'
import { useOrderExtras } from '#engine/composables/useOrderExtras'
import { useCartStore } from '#engine/stores/cart'
import type { Product } from '#engine/types'
import { makeProduct } from '../../../test/fixtures/catalog'

const inCategory = (slug: string, id = slug): Product =>
  makeProduct({
    id,
    category: { id: slug, name: slug, order: 1, slug, products: [] },
  })
const hot = inCategory('tokyo-hot', 'ramen')
const sushi = inCategory('sushi', 'nigiri')

let cart: ReturnType<typeof useCartStore>
let scope: EffectScope

const mount = () => {
  scope = effectScope()
  return scope.run(() => useOrderExtras())!
}
const names = () => (cart.orderExtra ?? []).map((entry) => entry.name)

beforeEach(() => {
  setActivePinia(createPinia())
  cart = useCartStore()
})
afterEach(() => {
  scope?.stop()
})

describe('what the brand offers', () => {
  it('offers chopsticks, wasabi, ginger and soy sauce with its three variants; not cutlery', () => {
    const extras = mount()
    expect(extras.hasOfferedExtras).toBe(true)
    for (const name of ['chopsticks', 'wasabi', 'ginger', 'sauce']) {
      expect(extras.isOffered(name)).toBe(true)
    }
    expect(extras.isOffered('cutlery')).toBe(false)
    expect(extras.sauceOptions).toEqual(['sweet', 'salty', 'both'])
  })

  it('a fresh cart carries the pre-ticked ones, the sauce on its default variant', () => {
    expect(cart.orderExtra).toEqual([
      { name: 'chopsticks' },
      { name: 'wasabi' },
      { name: 'ginger' },
      { name: 'sauce', options: ['both'] },
    ])
  })
})

describe('isLocked', () => {
  it('nothing is locked for an empty cart', () => {
    const extras = mount()
    expect(['chopsticks', 'wasabi', 'ginger', 'sauce'].some(extras.isLocked)).toBe(false)
  })

  it('a cart of hot dishes only locks the restricted extras, not the chopsticks', () => {
    cart.addProduct(hot, 1)
    const extras = mount()
    expect(extras.isLocked('wasabi')).toBe(true)
    expect(extras.isLocked('ginger')).toBe(true)
    expect(extras.isLocked('sauce')).toBe(true)
    expect(extras.isLocked('chopsticks')).toBe(false)
  })

  it('one item from another category unlocks them (every item must be restricted)', () => {
    cart.addProduct(hot, 1)
    cart.addProduct(sushi, 1)
    const extras = mount()
    expect(extras.isLocked('wasabi')).toBe(false)
  })

  it('an item without a category is not a hot dish', () => {
    cart.addProduct(hot, 1)
    cart.addProduct(makeProduct({ id: 'x', category: undefined }), 1)
    expect(mount().isLocked('wasabi')).toBe(false)
  })

  it('follows the cart live', () => {
    const extras = mount()
    expect(extras.isLocked('wasabi')).toBe(false)
    cart.addProduct(hot, 1)
    expect(extras.isLocked('wasabi')).toBe(true)
    cart.addProduct(sushi, 1)
    expect(extras.isLocked('wasabi')).toBe(false)
  })
})

describe('applyDefaults (checkout opens)', () => {
  it('drops entries the brand does not offer', () => {
    cart.orderExtra = [{ name: 'cutlery' }, { name: 'chopsticks' }]
    cart.addProduct(sushi, 1)
    mount().applyDefaults()
    expect(names()).toContain('chopsticks')
    expect(names()).not.toContain('cutlery')
  })

  it('a cart of hot dishes clears the restricted extras it had', () => {
    cart.addProduct(hot, 1)
    mount().applyDefaults()
    expect(names()).toEqual(['chopsticks'])
  })

  it('a cart with other dishes re-ticks the restricted extras, sauce on its default variant', () => {
    cart.orderExtra = [{ name: 'chopsticks' }]
    cart.addProduct(sushi, 1)
    mount().applyDefaults()
    expect(cart.orderExtra).toEqual([
      { name: 'chopsticks' },
      { name: 'wasabi' },
      { name: 'ginger' },
      { name: 'sauce', options: ['both'] },
    ])
  })

  it('keeps what the customer already chose, without a second entry', () => {
    cart.orderExtra = [{ name: 'sauce', options: ['sweet'] }, { name: 'wasabi' }]
    cart.addProduct(sushi, 1)
    mount().applyDefaults()
    expect(cart.orderExtra.filter((e) => e.name === 'sauce')).toEqual([
      { name: 'sauce', options: ['sweet'] },
    ])
    expect(cart.orderExtra.filter((e) => e.name === 'wasabi')).toHaveLength(1)
  })

  it('an extra without a restriction (chopsticks) keeps the customer’s choice: not re-ticked once unticked', () => {
    cart.orderExtra = []
    cart.addProduct(sushi, 1)
    mount().applyDefaults()
    expect(names()).not.toContain('chopsticks')
  })

  it('a cart restored without an orderExtra list works (it is created)', () => {
    cart.orderExtra = null
    cart.addProduct(sushi, 1)
    mount().applyDefaults()
    expect(names()).toEqual(['wasabi', 'ginger', 'sauce'])
  })
})

describe('syncLockedExtras (the cart changes on the checkout page)', () => {
  it('clears the restricted extras at once when the cart is already hot dishes only', () => {
    cart.addProduct(hot, 1)
    mount().syncLockedExtras()
    expect(names()).toEqual(['chopsticks'])
  })

  it('clears them when the cart becomes hot dishes only, restores the pre-ticked default when it stops being so', async () => {
    cart.addProduct(sushi, 1)
    cart.addProduct(hot, 1)
    mount().syncLockedExtras()
    expect(names()).toContain('wasabi')
    cart.removeFromCart(sushi)
    await nextTick()
    expect(names()).toEqual(['chopsticks'])
    cart.addProduct(sushi, 1)
    await nextTick()
    expect(cart.orderExtra).toEqual([
      { name: 'chopsticks' },
      { name: 'wasabi' },
      { name: 'ginger' },
      { name: 'sauce', options: ['both'] },
    ])
  })

  it('emptying a locked cart does not tick anything (nothing to put wasabi with)', async () => {
    cart.addProduct(hot, 1)
    mount().syncLockedExtras()
    cart.removeFromCart(hot)
    await nextTick()
    expect(names()).toEqual(['chopsticks'])
  })

  it('does not disturb an unlocked cart that keeps changing', async () => {
    cart.addProduct(sushi, 1)
    cart.orderExtra = [{ name: 'wasabi' }]
    mount().syncLockedExtras()
    cart.addProduct(sushi, 2)
    await nextTick()
    expect(cart.orderExtra).toEqual([{ name: 'wasabi' }])
  })
})

describe('the toggles', () => {
  it('addChopsticks reads the cart, and ticking / unticking edits it', () => {
    const { addChopsticks } = mount()
    expect(addChopsticks.value).toBe(true)
    addChopsticks.value = false
    expect(names()).not.toContain('chopsticks')
    expect(addChopsticks.value).toBe(false)
    addChopsticks.value = true
    addChopsticks.value = true
    expect(names().filter((name) => name === 'chopsticks')).toHaveLength(1)
  })

  it('unticking something that is not there changes nothing', () => {
    cart.orderExtra = []
    const { addWasabi, addGinger } = mount()
    addWasabi.value = false
    expect(cart.orderExtra).toEqual([])
    addGinger.value = true
    expect(cart.orderExtra).toEqual([{ name: 'ginger' }])
  })

  it('a cart restored without an orderExtra list reads as unticked and can be ticked', () => {
    cart.orderExtra = null
    const { addWasabi } = mount()
    expect(addWasabi.value).toBe(false)
    addWasabi.value = true
    expect(cart.orderExtra).toEqual([{ name: 'wasabi' }])
  })

  it('cutlery can be toggled in the cart even if the brand does not offer it (the page hides the toggle)', () => {
    cart.orderExtra = []
    const { addCutlery } = mount()
    addCutlery.value = true
    expect(names()).toEqual(['cutlery'])
  })
})

describe('soy sauce', () => {
  it('reads "none" when it is not ticked, and the chosen variant otherwise', () => {
    cart.orderExtra = []
    const { sauce, addSauce } = mount()
    expect(sauce.value).toBe('none')
    expect(addSauce.value).toBe(false)
    cart.orderExtra = [{ name: 'sauce', options: ['salty'] }]
    expect(sauce.value).toBe('salty')
    expect(addSauce.value).toBe(true)
  })

  it('a sauce entry without a variant reads as none', () => {
    cart.orderExtra = [{ name: 'sauce' }]
    expect(mount().sauce.value).toBe('none')
  })

  it('choosing a variant adds the entry, or updates the one already there', () => {
    cart.orderExtra = []
    const { sauce } = mount()
    sauce.value = 'sweet'
    expect(cart.orderExtra).toEqual([{ name: 'sauce', options: ['sweet'] }])
    sauce.value = 'salty'
    expect(cart.orderExtra).toEqual([{ name: 'sauce', options: ['salty'] }])
  })

  it('choosing "none" removes the entry', () => {
    cart.orderExtra = [{ name: 'sauce', options: ['salty'] }]
    mount().sauce.value = 'none'
    expect(cart.orderExtra).toEqual([])
  })

  it('addSauce ticks the default variant ("both") and unticks to none', () => {
    cart.orderExtra = []
    const { addSauce } = mount()
    addSauce.value = true
    expect(cart.orderExtra).toEqual([{ name: 'sauce', options: ['both'] }])
    addSauce.value = false
    expect(cart.orderExtra).toEqual([])
  })
})
