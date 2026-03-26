/**
 * Syncs the persisted auth store (localStorage) with the actual OIDC session (sessionStorage).
 *
 * Problem: pinia-plugin-persistedstate keeps User in localStorage (survives browser restart),
 * but OIDC tokens live in sessionStorage (cleared on close). This creates a mismatch where the
 * UI shows "my account" even though the session is gone.
 *
 * Solution: On app start, check if the OIDC session is still valid. If not, clear the store.
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

    // No valid session — clear stale store so UI reflects reality
    authStore.clearUser()
})
