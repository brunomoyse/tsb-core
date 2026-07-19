import { defineNuxtPlugin, useAppConfig } from '#imports'
import { useCartStore } from '#engine/stores/cart'
import { watch } from 'vue'

// Takeaway-only enforcement while `brand.deliveryEnabled` is false: the cart
// store (and carts persisted from before the flag) defaults to DELIVERY, so
// watch the option and snap it back to PICKUP. The UI disables the delivery
// toggles with an "available soon" label; this is the belt-and-braces layer
// underneath, covering rehydrated state and resetState().
export default defineNuxtPlugin(() => {
    const { brand } = useAppConfig()
    if (brand.deliveryEnabled !== false) return

    const cartStore = useCartStore()
    watch(
        () => cartStore.collectionOption,
        (option) => {
            if (option === 'DELIVERY') cartStore.collectionOption = 'PICKUP'
        },
        { immediate: true },
    )
})
