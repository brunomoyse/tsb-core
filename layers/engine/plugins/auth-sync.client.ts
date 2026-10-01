import type { User } from '@/types'
import gql from 'graphql-tag'
import { print } from 'graphql'
import { reportError } from '#engine/utils/reportError'

/**
 * Reconciles the Pinia auth store with the OIDC token store on app start.
 * Tokens live in localStorage and the Pinia user record lives in localStorage,
 * but the two can drift apart across releases or after a partial logout
 * (e.g. signoutRedirect interrupted before removeUser ran). When that happens,
 * the navbar shows "Login" while isAuthenticated() still returns true, and
 * /login bounces the user to /menu in a loop.
 *
 * Cases handled:
 *   1. authStore filled + OIDC expired → silent renew, else clear both.
 *   2. authStore empty + OIDC valid    → fetch /me and repopulate authStore.
 *      If /me fails, the OIDC token is stale — clear it.
 *   3. Both empty / both valid         → no-op.
 */
const ME_QUERY = print(gql`
    query AuthSyncMe {
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

/*
 * Parallel and deferred (audit PR 3.7, P5): this used to be an async, blocking plugin, so before the app could mount
 * it imported the OIDC library, read the session and, for a returning visitor with an expired token, waited for a
 * Zitadel round-trip or a /me request: hydration of every page sat behind it, and nothing in it is needed for first
 * paint. It now runs once the app is hydrated and the browser is idle (onNuxtReady).
 *
 * What does not wait for it: the auth middleware checks the session itself (isAuthenticated / silentRenew, which
 * share one in-flight renewal with this plugin), /me loads its own user when the store has none, and the persisted
 * Pinia user is read from localStorage as before. What can now change a moment after first paint is only the drift
 * this plugin repairs (case 1 and 2 above: a stale or missing user record): the navbar and the checkout's sign-in
 * step settle when it finishes, instead of before the first render.
 */
export default defineNuxtPlugin({
    name: 'auth-sync',
    parallel: true,
    setup(nuxtApp) {
        onNuxtReady(() => {
            nuxtApp.runWithContext(syncAuth).catch((err: unknown) => reportError(err, 'auth.sync'))
        })
    },
})

async function syncAuth(): Promise<void> {
    // Read before the first await: the Nuxt context only holds for the synchronous part.
    const cfg = useRuntimeConfig()
    const { useAuthStore } = await import('~/stores/auth')
    const authStore = useAuthStore()

    const { useOidc } = await import('~/composables/useOidc')
    const { isAuthenticated, silentRenew, removeUser, getAccessToken } = useOidc()

    const oidcAuthed = await isAuthenticated()

    // Case 1: authStore says logged-in but OIDC token is gone/expired.
    if (authStore.user && !oidcAuthed) {
        const renewed = await silentRenew()
        if (renewed) return
        await removeUser()
        authStore.clearUser()
        return
    }

    /*
     * Case 2: OIDC token is valid but authStore is empty (post-release drift
     * or partial logout). Repopulate from /me so the UI stops showing "Login"
     * and /login stops bouncing the user to /menu.
     */
    if (!authStore.user && oidcAuthed) {
        const token = await getAccessToken()
        if (!token) return
        const url = cfg.public.graphqlHttp as string
        try {
            const res = await $fetch<{ data?: { me: User }; errors?: unknown[] }>(url, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: { query: ME_QUERY, variables: {} },
            })
            if (res?.data?.me) {
                authStore.setUser(res.data.me)
                return
            }
            // Token accepted at HTTP layer but /me returned nothing or GraphQL errors — stale.
            await removeUser()
        } catch (err: unknown) {
            // Backend rejected the token (revoked, user deleted, etc.): expected, not reported.
            if (import.meta.dev) console.warn('[auth-sync] /me rejected the token', err)
            await removeUser()
        }
    }
}
