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
            notifyMarketing
            notifyOrderUpdates
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
        await getAccessToken()

        const data = await $gqlFetch<{ me: User }>(ME)
        if (data) {
            authStore.setUser(data.me)
            identifyUser(data.me)
        }

        trackEvent('user_logged_in', { method: 'oidc' })

        // Register for push notifications after successful login (Capacitor only)
        const config = useRuntimeConfig()
        if (config.public.appBuild === 'capacitor') {
            const { usePushNotifications } = await import('~/composables/usePushNotifications')
            const { register } = usePushNotifications()
            await register()
        }

        const returnTo = consumeReturnTo()
        if (returnTo) {
            navigateTo(returnTo)
        } else if (cartStore.products.length > 0) {
            navigateTo(localePath('checkout'))
        } else {
            navigateTo(localePath('menu'))
        }
    }

    function consumeReturnTo(): string | null {
        if (typeof sessionStorage === 'undefined') return null
        const raw = sessionStorage.getItem('oidc_return_to')
        sessionStorage.removeItem('oidc_return_to')
        // Only allow same-origin absolute paths; reject protocol-relative (//) or off-site URLs.
        if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return null
        // Don't bounce back into the auth flow itself.
        if (/^\/[^/]+\/auth(\/|$)/.test(raw)) return null
        return raw
    }

    return { processCallback }
}
