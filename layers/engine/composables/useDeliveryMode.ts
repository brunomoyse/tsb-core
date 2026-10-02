import { computed } from 'vue'
import { useAppConfig } from '#imports'
import { useOrderingPolicy } from '#engine/composables/useOrderingPolicy'

/**
 * Whether the shop offers home delivery, for every surface that shows a delivery toggle (cart sheet, delivery-zone
 * picker, checkout). It takes both switches: the brand flag (`brand.deliveryEnabled`, takeaway-only for a launch) AND
 * the API's delivery policy (`RestaurantConfig.policy.deliveryEnabled`, which the backend enforces: a delivery order is
 * refused with DELIVERY_UNAVAILABLE when it is off).
 */
export const useDeliveryMode = () => {
    const { policy } = useOrderingPolicy()
    const { deliveryEnabled: brandFlag = true } = useAppConfig().brand
    const deliveryEnabled = computed(() => brandFlag !== false && policy.value.deliveryEnabled)
    return { deliveryEnabled }
}
