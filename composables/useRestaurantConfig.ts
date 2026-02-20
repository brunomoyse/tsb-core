import gql from 'graphql-tag'
import { useGqlQuery } from './useGqlQuery'

const RESTAURANT_CONFIG_QUERY = gql`
    query RestaurantConfig {
        restaurantConfig {
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
    const { data, refresh } = await useGqlQuery<{ restaurantConfig: RestaurantConfig }>(
        RESTAURANT_CONFIG_QUERY,
        {},
        { immediate: true, cache: false }
    )

    return {
        config: data,
        refresh,
    }
}
