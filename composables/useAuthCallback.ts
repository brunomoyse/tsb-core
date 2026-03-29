import type { User } from '@/types'
import gql from 'graphql-tag'
import { print } from 'graphql'
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'
import { useTracking } from '~/composables/useTracking'

const ME = print(gql`
    query {
        me {
            id
            email
            firstName
            lastName
            phoneNumber
            deletionRequestedAt
            address {
                id
                streetName
                houseNumber
                municipalityName
                postcode
                distance
            }
        }
    }
`)

/**
 * Shared post-auth callback logic used by both:
 * - pages/auth/callback.vue (web OIDC redirect)
 * - plugins/capacitor.client.ts (deep link from system browser)
 */
export function useAuthCallback() {
    const authStore = useAuthStore()
    const cartStore = useCartStore()
    const localePath = useLocalePath()
    const { $gqlFetch } = useNuxtApp()
    const { trackEvent, identifyUser } = useTracking()

    async function processCallback() {
        // Verify token is available before making the query
        const { useOidc } = await import('~/composables/useOidc')
        const { getAccessToken } = useOidc()
        const token = await getAccessToken()
        console.log('processCallback: token available:', Boolean(token), token ? `${token.substring(0, 20)}...` : 'null')

        const data = await $gqlFetch<{ me: User }>(ME)
        if (data) {
            authStore.setUser(data.me)
            identifyUser(data.me)
        }

        trackEvent('user_logged_in', { method: 'oidc' })

        if (cartStore.products.length > 0) {
            navigateTo(localePath('checkout'))
        } else {
            navigateTo(localePath('menu'))
        }
    }

    return { processCallback }
}
