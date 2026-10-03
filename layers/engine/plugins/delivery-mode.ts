import { defineNuxtPlugin } from '#imports'
import { enforcedCollectionOption } from '#engine/utils/deliveryMode'
import { useCartStore } from '#engine/stores/cart'
import { useDeliveryMode } from '#engine/composables/useDeliveryMode'
import { watch } from 'vue'

/*
 * Takeaway-only enforcement while delivery is not offered (see useDeliveryMode). The cart store starts a fresh
 * cart on PICKUP in that case (stores/cart.ts), but a cart persisted from before the flag, or a restored
 * state, may still say DELIVERY: watch the option and snap it back. The UI disables the delivery toggles with
 * an "available soon" label; this is the belt-and-braces layer underneath.
 */
export default defineNuxtPlugin(() => {
  const { deliveryEnabled } = useDeliveryMode()
  const cartStore = useCartStore()
  watch(
    [() => cartStore.collectionOption, deliveryEnabled],
    ([option, offered]) => {
      const kept = enforcedCollectionOption(option, offered)
      if (kept !== option) cartStore.collectionOption = kept
    },
    { immediate: true },
  )
})
