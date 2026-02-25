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
            isCurrentlyOpen
        }
    }
`

const SUB_RESTAURANT_CONFIG = gql`
    subscription RestaurantConfigUpdated {
        restaurantConfigUpdated {
            orderingEnabled
            openingHours
            isCurrentlyOpen
        }
    }
`

interface RestaurantConfig {
    orderingEnabled: boolean
    openingHours: Record<string, { open: string; close: string; dinnerOpen?: string; dinnerClose?: string } | null>
    isCurrentlyOpen: boolean
}

export async function useRestaurantConfig() {
    // Register subscription BEFORE any await to preserve the active effect scope
    const sub = import.meta.client
        ? useGqlSubscription<{ restaurantConfigUpdated: RestaurantConfig }>(print(SUB_RESTAURANT_CONFIG))
        : null

    const { data, refresh } = await useGqlQuery<{ restaurantConfig: RestaurantConfig }>(
        RESTAURANT_CONFIG_QUERY,
        {},
        { immediate: true, cache: false }
    )

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
    }
}
