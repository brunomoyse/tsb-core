import { postAuthTarget, sanitizeReturnTo } from '#engine/utils/authFlow'
import { type OrderingConfigInput, canPlaceOrder } from '#engine/utils/orderingAvailability'
import type { User } from '#engine/types'
import { reportError } from '#engine/utils/reportError'
import { useAuthStore } from '#engine/stores/auth'
import { useCartStore } from '#engine/stores/cart'
import { useOrderingPolicy } from '#engine/composables/useOrderingPolicy'
import { useTracking } from '#engine/composables/useTracking'

const ME = /* GraphQL */ `
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
`

const RESTAURANT_STATUS = /* GraphQL */ `
  query AuthCallbackRestaurantStatus {
    restaurantConfig {
      orderingEnabled
      isOrderingCurrentlyOpen
      preparationMinutes
      availableSlotsToday {
        label
        value
      }
    }
  }
`

/**
 * Shared post-auth callback logic, used by each app's pages/auth/callback.vue
 * (web OIDC redirect). The OIDC tokens are already stored in localStorage by
 * oidc-client-ts at this point; this restores the user, the return path and the cart flow.
 */
export function useAuthCallback() {
  const authStore = useAuthStore()
  const cartStore = useCartStore()
  const localePath = useLocalePath()
  const { $gqlFetch } = useNuxtApp()
  const { trackEvent, identifyUser } = useTracking()
  const { policy } = useOrderingPolicy()

  async function processCallback() {
    // Verify token is available before making the query
    const { useOidc } = await import('#engine/composables/useOidc')
    const { getAccessToken } = useOidc()
    await getAccessToken()

    const data = await $gqlFetch<{ me: User } | null>(ME)
    if (data !== null) {
      authStore.setUser(data.me)
      identifyUser()
    }

    trackEvent('user_logged_in', { method: 'oidc' })

    const target = postAuthTarget(consumeReturnTo(), cartStore.products.length === 0)
    if (target.kind === 'path') {
      await navigateTo(target.path)
      return
    }
    if (target.kind === 'menu') {
      await navigateTo(localePath('menu'))
      return
    }
    /*
     * Cart has items — auto-jump to checkout when ordering is actually
     * available: open, or closed with a slot still bookable today (a
     * pre-order, see utils/orderingAvailability.ts). When the restaurant
     * is closed for good today, /cart is a dead-end (the user can see
     * items but cannot do anything with them), so send them to /menu
     * instead, where the closed banner appears alongside the menu the
     * user might still want to browse.
     */
    const canCheckout = await isCheckoutAvailable()
    await navigateTo(localePath(canCheckout ? 'checkout' : 'menu'))
  }

  async function isCheckoutAvailable(): Promise<boolean> {
    try {
      const data = await $gqlFetch<{ restaurantConfig: OrderingConfigInput }>(RESTAURANT_STATUS)
      return canPlaceOrder(data?.restaurantConfig, Date.now(), policy.value)
    } catch (err: unknown) {
      reportError(err, 'auth.checkoutAvailability')
      // We could not tell: checkout checks again and offers a retry, the menu would only hide the cart.
      return true
    }
  }

  function consumeReturnTo(): string | null {
    if (typeof sessionStorage === 'undefined') return null
    const raw = sessionStorage.getItem('oidc_return_to')
    sessionStorage.removeItem('oidc_return_to')
    // Only same-origin absolute paths that are not the auth flow itself (see sanitizeReturnTo).
    return sanitizeReturnTo(raw)
  }

  return { processCallback }
}
