import gql from 'graphql-tag'
import { print } from 'graphql'
import { useGqlQuery } from './useGqlQuery'
import { useGqlSubscription } from './useGqlSubscription'
import { watch } from 'vue'

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
    // Register subscription BEFORE any await to preserve the active effect scope
    const sub = import.meta.client
        ? useGqlSubscription<{ restaurantConfigUpdated: RestaurantConfig }>(print(SUB_RESTAURANT_CONFIG))
        : null

    const asyncData = await useGqlQuery<{ restaurantConfig: RestaurantConfig }>(
        RESTAURANT_CONFIG_QUERY,
        {},
        { immediate: true, cache: false, ...(options.lazy ? { lazy: true } : {}) }
    )
    const { data, refresh, pending } = asyncData

    if (sub) {
        watch(sub.data, (val) => {
            if (val?.restaurantConfigUpdated && data.value) {
                data.value = {
                    ...data.value,
                    restaurantConfig: {
                        ...data.value.restaurantConfig,
                        ...val.restaurantConfigUpdated,
                    },
                }
            }
        })
    }

    return {
        config: data,
        refresh,
        pending,
    }
}
