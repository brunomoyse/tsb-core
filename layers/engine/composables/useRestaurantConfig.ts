import { type Ref, watch } from 'vue'
import gql from 'graphql-tag'
import { print } from 'graphql'
import { useGqlQuery } from './useGqlQuery'
import { useGqlSubscription } from './useGqlSubscription'

const RESTAURANT_CONFIG_QUERY = gql`
    query RestaurantConfig {
        restaurantConfig {
            orderingEnabled
            openingHours
            orderingHours
            preparationMinutes
            isCurrentlyOpen
            isOrderingCurrentlyOpen
            availableSlotsToday { label value isLunchOnlyAllowed }
            nextOpeningAt
        }
    }
`

const SUB_RESTAURANT_CONFIG = gql`
    subscription RestaurantConfigUpdated {
        restaurantConfigUpdated {
            orderingEnabled
            openingHours
            orderingHours
            preparationMinutes
            isCurrentlyOpen
            isOrderingCurrentlyOpen
            availableSlotsToday { label value isLunchOnlyAllowed }
            nextOpeningAt
        }
    }
`

export interface RestaurantTimeSlot {
    label: string
    value: string
    isLunchOnlyAllowed: boolean
}

interface RestaurantConfig {
    orderingEnabled: boolean
    openingHours: Record<string, { open: string; close: string; dinnerOpen?: string; dinnerClose?: string } | null>
    orderingHours: Record<string, { open: string; close: string; dinnerOpen?: string; dinnerClose?: string } | null> | null
    preparationMinutes: number
    isCurrentlyOpen: boolean
    isOrderingCurrentlyOpen: boolean
    availableSlotsToday: RestaurantTimeSlot[]
    nextOpeningAt: string | null
}

interface UseRestaurantConfigOptions {
    // When true, don't block on the initial query — callers render a loading state via the returned `pending` ref. Default preserves the original awaited semantics.
    lazy?: boolean
}

export async function useRestaurantConfig(options: UseRestaurantConfigOptions = {}) {
    /*
     * Register BOTH the subscription and its watcher synchronously, before
     * any await. After an `await`, Vue's active effect-scope binding is
     * fragile and the watch can leak across CSR navigations — manifesting
     * as a "Cannot destructure property 'bum' of 'v' as it is null" crash
     * when the next page's Suspense unmounts and the stale watch still
     * mutates state on the unmounting component.
     *
     * The watcher captures `dataRef` (set after the await) via closure so
     * subscription messages that arrive before the initial query resolves
     * are simply dropped — the initial query will return the up-to-date
     * config anyway.
     */
    interface ConfigResponse { restaurantConfig: RestaurantConfig }
    let dataRef: Ref<ConfigResponse | null> | null = null

    const sub = import.meta.client
        ? useGqlSubscription<{ restaurantConfigUpdated: RestaurantConfig }>(print(SUB_RESTAURANT_CONFIG))
        : null

    if (sub) {
        watch(sub.data, (val) => {
            if (val?.restaurantConfigUpdated && dataRef?.value) {
                dataRef.value = {
                    ...dataRef.value,
                    restaurantConfig: {
                        ...dataRef.value.restaurantConfig,
                        ...val.restaurantConfigUpdated,
                    },
                }
            }
        })
    }

    const asyncData = await useGqlQuery<ConfigResponse>(
        RESTAURANT_CONFIG_QUERY,
        {},
        { immediate: true, cache: false, ...(options.lazy ? { lazy: true } : {}) }
    )
    const { data, refresh, pending } = asyncData
    dataRef = data as unknown as Ref<ConfigResponse | null>

    return {
        config: data,
        refresh,
        pending,
    }
}
