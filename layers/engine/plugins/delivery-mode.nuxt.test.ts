// Delivery-mode plugin: while delivery is not offered, the cart's collection option snaps back to PICKUP, also for a cart
// Persisted before the flag existed, and for any later attempt to set DELIVERY.
// Run: `vp test run layers/engine/plugins/delivery-mode.nuxt.test.ts`.
import { createPinia, setActivePinia } from 'pinia'
import { effectScope, nextTick, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { useCartStore } from '#engine/stores/cart'

const deliveryEnabled = vi.hoisted(() => ({ ref: undefined as { value: boolean } | undefined }))
vi.mock('#engine/composables/useDeliveryMode', () => ({
  useDeliveryMode: () => ({ deliveryEnabled: deliveryEnabled.ref }),
}))

const { default: plugin } = await import('./delivery-mode')

let scope: ReturnType<typeof effectScope>
const install = () => {
  scope = effectScope()
  scope.run(() => {
    ;(plugin as unknown as (app: unknown) => void)({})
  })
}

beforeEach(() => {
  setActivePinia(createPinia())
  deliveryEnabled.ref = ref(false)
})
afterEach(() => {
  scope.stop()
})

describe('delivery-mode plugin', () => {
  it('snaps a restored DELIVERY cart back to PICKUP at once while delivery is not offered', () => {
    const cart = useCartStore()
    cart.collectionOption = 'DELIVERY'
    install()
    expect(cart.collectionOption).toBe('PICKUP')
  })

  it('blocks a later attempt to choose DELIVERY', async () => {
    const cart = useCartStore()
    install()
    // The snap of the restored cart settles first: a later choice is a change of its own.
    await nextTick()
    expect(cart.collectionOption).toBe('PICKUP')
    cart.collectionOption = 'DELIVERY'
    await nextTick()
    expect(cart.collectionOption).toBe('PICKUP')
  })

  it('leaves a PICKUP cart alone', () => {
    const cart = useCartStore()
    cart.collectionOption = 'PICKUP'
    install()
    expect(cart.collectionOption).toBe('PICKUP')
  })

  it('does nothing while delivery is offered, and snaps back when it is switched off live', async () => {
    deliveryEnabled.ref = ref(true)
    const cart = useCartStore()
    cart.collectionOption = 'DELIVERY'
    install()
    expect(cart.collectionOption).toBe('DELIVERY')
    deliveryEnabled.ref.value = false
    await nextTick()
    expect(cart.collectionOption).toBe('PICKUP')
  })
})
