import { type ComputedRef, computed } from 'vue'
import { type OrderingPolicy, deliveryMaxKm, orderingPolicyFromApi, pickupDiscountPercent } from '#engine/utils/orderingPolicy'
import { centsToEuros } from '#engine/utils/money'
import { useRestaurantConfigState } from './useRestaurantConfig'

/** The i18n placeholders the ordering policy fills in the shop's copy. */
export interface PolicyMessageParams extends Record<string, number> {
    /** Pickup discount in percent: 10. */
    rate: number
    /** Basket from which the pickup discount applies, in euros. */
    pickupMinimum: number
    /** Delivery minimum, in euros. */
    deliveryMinimum: number
    /** Delivery radius, in km. */
    distance: number
}

/**
 * The backend's ordering rules (audit PR 4.5): delivery zone, fee tiers, minimum, pickup discount, online fee,
 * rounding and slot rules, in integers (cents, meters, basis points, minutes), read from the shared restaurant config.
 *
 * Synchronous, so totals and templates can use it anywhere: until the config has loaded, and for a backend that
 * has no `policy` yet, it is the default policy (`DEFAULT_ORDERING_POLICY`, the numbers the shop always used). It
 * follows the live `restaurantConfigUpdated` feed, so a change made on the backend reaches an open page.
 * Something has to ask for the config on the page: the layout of both apps does (`useOrderingAvailability`).
 */
export function useOrderingPolicy(): { policy: ComputedRef<OrderingPolicy>, policyParams: ComputedRef<PolicyMessageParams> } {
    const state = useRestaurantConfigState()
    const policy = computed(() => orderingPolicyFromApi(state.value?.restaurantConfig?.policy))
    /** The numbers the copy quotes ("{rate} % off", "{distance} km"), for `$t(key, policyParams)`: never typed into a locale file. */
    const policyParams = computed<PolicyMessageParams>(() => ({
        rate: pickupDiscountPercent(policy.value),
        pickupMinimum: centsToEuros(policy.value.pickupDiscountMinimumCents),
        deliveryMinimum: centsToEuros(policy.value.deliveryMinimumCents),
        distance: deliveryMaxKm(policy.value),
    }))
    return { policy, policyParams }
}
