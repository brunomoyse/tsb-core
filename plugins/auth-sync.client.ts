/**
 * On app start, validate that the stored OIDC refresh token is still accepted by Zitadel.
 *
 * Both web and Capacitor persist tokens in localStorage, so a user profile in the Pinia
 * store may outlive the refresh token's idle expiry (Zitadel default: 30 days idle / 90
 * days absolute). This plugin calls silentRenew() and clears the store only if Zitadel
 * rejects the refresh token.
 */
export default defineNuxtPlugin(async () => {
    const { useAuthStore } = await import('~/stores/auth')
    const authStore = useAuthStore()

    // Nothing to sync if no persisted user
    if (!authStore.user) return

    const { useOidc } = await import('~/composables/useOidc')
    const { isAuthenticated, silentRenew } = useOidc()

    // Session still valid
    if (await isAuthenticated()) return

    // Try silent renewal (refresh token may still work)
    const renewed = await silentRenew()
    if (renewed) return

    // No valid session — clear stale OIDC session + Pinia store
    const { removeUser } = useOidc()
    await removeUser()
    authStore.clearUser()
})
