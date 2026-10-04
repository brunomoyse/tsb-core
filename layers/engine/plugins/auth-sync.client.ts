import type { User } from '#engine/types'
import { isSilentRenewUnavailable } from '#engine/utils/silentRenewError'
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
 *   1. authStore filled + OIDC expired → silent renew, else clear both (but not when Zitadel cannot be reached:
 *      the session is kept and the next request renews it).
 *   2. authStore empty + OIDC valid    → fetch /me and repopulate authStore.
 *      If /me refuses the token (HTTP 401 / UNAUTHENTICATED) the OIDC token is stale — clear it; any other
 *      failure (offline, aborted, 5xx) keeps the session.
 *   3. Both empty / both valid         → no-op.
 */
const ME_QUERY = /* GraphQL */ `
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
`

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
      nuxtApp.runWithContext(syncAuth).catch((err: unknown) => {
        reportError(err, 'auth.sync')
      })
    })
  },
})

async function syncAuth(): Promise<void> {
  // Read before the first await: the Nuxt context only holds for the synchronous part.
  const cfg = useRuntimeConfig()
  const { useAuthStore } = await import('#engine/stores/auth')
  const authStore = useAuthStore()

  const { useOidc } = await import('#engine/composables/useOidc')
  const { isAuthenticated, silentRenew, removeUser, getAccessToken } = useOidc()

  const oidcAuthed = await isAuthenticated()

  // Case 1: authStore says logged-in but OIDC token is gone/expired.
  if (authStore.user && !oidcAuthed) {
    let renewed: unknown
    try {
      renewed = await silentRenew()
    } catch (err: unknown) {
      // Zitadel could not be reached (offline): the session is intact, the profile stays, the next request renews.
      if (isSilentRenewUnavailable(err)) return
      throw err
    }
    if (renewed) return
    // The profile goes whether or not the OIDC store could be cleaned: a failing removeUser must not leave a ghost user.
    try {
      await removeUser()
    } finally {
      authStore.clearUser()
    }
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
    const url = cfg.public.graphqlHttp
    let refused = false
    try {
      const res = await $fetch<{
        data?: { me: User }
        errors?: { extensions?: { code?: string } }[]
      }>(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: { query: ME_QUERY, variables: {} },
      })
      if (res?.data?.me) {
        authStore.setUser(res.data.me)
        return
      }
      // Only the token itself being refused ends the session; any other answer without a profile is not about it.
      refused = res?.errors?.some((e) => e.extensions?.code === 'UNAUTHENTICATED') ?? false
    } catch (err: unknown) {
      /*
       * HTTP 401: the backend rejected the token (revoked, user deleted, etc.), expected, not reported. Any other failure
       * (network drop, a request aborted by a navigation, a 5xx) says nothing about the token: the session is kept and
       * the next navigation / request tries again, instead of signing the customer out mid-order.
       */
      refused = isUnauthorized(err)
      if (import.meta.dev)
        console.warn(
          refused ? '[auth-sync] /me rejected the token' : '[auth-sync] /me failed, session kept',
          err,
        )
    }
    if (refused) await removeUser()
  }
}

const isUnauthorized = (err: unknown): boolean =>
  typeof err === 'object' &&
  err !== null &&
  ((err as { status?: unknown }).status === 401 ||
    (err as { statusCode?: unknown }).statusCode === 401)
