import { type User as OidcUser, UserManager, WebStorageStateStore } from 'oidc-client-ts'
import { type Ref, ref } from 'vue'
import { useRuntimeConfig } from '#imports'

let userManager: UserManager | null = null
const oidcUser: Ref<OidcUser | null> = ref(null)

/*
 * Module-scope coalescer for silent renewal. Every caller (middleware, plugins,
 * getAccessToken, accessTokenExpired event) routes through the same in-flight
 * promise. Zitadel rotates the refresh token on first use, so two concurrent
 * renews would race and the loser would be logged out mid-session.
 */
let silentRenewPromise: Promise<OidcUser | null> | null = null

/**
 * Provides OIDC Authorization Code + PKCE flow via oidc-client-ts.
 */
export function useOidc() {
    const config = useRuntimeConfig()

    function getUserManager(): UserManager {
        if (userManager) return userManager

        const locale = typeof window === 'undefined'
            ? 'fr'
            : window.location.pathname.split('/')[1] || 'fr'

        const baseUrl = (config.public.baseUrl as string).replace(/\/+$/u, '')
        userManager = new UserManager({
            authority: config.public.zitadelAuthority as string,
            client_id: config.public.zitadelClientId as string,
            redirect_uri: `${baseUrl}/${locale}/auth/callback`,
            post_logout_redirect_uri: baseUrl,
            response_type: 'code',
            scope: 'openid profile email offline_access urn:zitadel:iam:org:project:roles',
            // Off: the background renewal raced with middleware/plugin calls on the same refresh token; Zitadel's rotation logged the loser out mid-session. Renew lazily on navigation and on 401 instead.
            automaticSilentRenew: false,
            // Persist tokens across browser close; Zitadel enforces the 30-day idle / 90-day absolute refresh-token TTL.
            userStore: new WebStorageStateStore({ store: localStorage }),
            stateStore: new WebStorageStateStore({ store: localStorage }),
        })

        userManager.events.addUserLoaded((user) => { oidcUser.value = user })
        userManager.events.addUserUnloaded(() => { oidcUser.value = null })

        userManager.events.addAccessTokenExpired(async () => {
            /*
             * Route through the module-level coalescer so this event-driven
             * renewal cannot race with a concurrent silentRenew() call from
             * middleware/plugins on the same refresh token.
             */
            await silentRenew()
        })

        /*
         * Note: addSilentRenewError intentionally has no handler. A losing race
         * (Zitadel rejected an already-rotated refresh token) would otherwise
         * call removeUser() and wipe a session another caller had just renewed.
         * Real session termination is handled by the callers checking the
         * silentRenew() return value.
         */

        return userManager
    }

    /** Start the OIDC authorize redirect (web only). */
    async function signIn(extraParams?: Record<string, string>) {
        const mgr = getUserManager()
        await mgr.signinRedirect({ extraQueryParams: extraParams })
    }

    /**
     * Get an authRequestID from Zitadel without navigating away (used by the
     * inline checkout login). Creates the OIDC authorize URL and sends it to the
     * backend proxy, which follows the redirect and extracts the authRequestID.
     */
    async function getAuthRequestId(): Promise<string> {
        const mgr = getUserManager()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const client = (mgr as any)._client
        const signinRequest = await client.createSigninRequest({})

        const apiUrl = config.public.api as string
        const response = await $fetch<{ authRequestId: string }>(
            `${apiUrl}/auth/authorize-proxy`,
            { method: 'POST', body: { authorizeUrl: signinRequest.url } },
        )

        if (!response.authRequestId) {
            throw new Error('Failed to obtain authRequestID from Zitadel')
        }
        return response.authRequestId
    }

    /** Complete the OIDC callback (exchange authorization code for tokens). */
    async function handleCallback(): Promise<OidcUser> {
        const mgr = getUserManager()
        const user = await mgr.signinRedirectCallback()
        oidcUser.value = user
        return user
    }

    /** Get the current access token (or null if not authenticated). */
    async function getAccessToken(): Promise<string | null> {
        const mgr = getUserManager()
        const user = await mgr.getUser()
        if (user && !user.expired) return user.access_token
        if (!user) return null // No session — nothing to renew

        /*
         * Token expired — route through the coalesced silentRenew so concurrent
         * callers share one refresh-token use (Zitadel rotates on first use).
         */
        const renewed = await silentRenew()
        return renewed?.access_token ?? null
    }

    /**
     * Attempt silent token renewal. All callers (middleware, plugins, the
     * accessTokenExpired event, getAccessToken) share a single in-flight
     * promise so we never use the same refresh token twice in parallel —
     * Zitadel rotates on first use and would log the loser out.
     */
    function silentRenew(): Promise<OidcUser | null> {
        silentRenewPromise ??= doSilentRenew().finally(() => {
            silentRenewPromise = null
        })
        return silentRenewPromise
    }

    async function doSilentRenew(): Promise<OidcUser | null> {
        const mgr = getUserManager()
        const existing = await mgr.getUser()
        if (!existing) return null // No session to renew
        try {
            const user = await mgr.signinSilent()
            oidcUser.value = user
            return user
        } catch {
            /*
             * Wipe the stale user so subsequent getAccessToken() calls return null
             * instead of triggering an iframe storm against Zitadel.
             */
            try { await mgr.removeUser() } catch { /* Best-effort cleanup */ }
            oidcUser.value = null
            return null
        }
    }

    /** Sign out via OIDC end-session endpoint (web only). */
    async function signOut() {
        const mgr = getUserManager()
        /*
         * Wipe local oidc.user:* before redirecting. signoutRedirect() does
         * window.location.replace() and never returns control, and oidc-client-ts
         * does not clear the user store on its own. Without this, the access
         * token sits in localStorage for its full TTL after logout — any later
         * isAuthenticated() check passes and bounces the user off /login.
         */
        try { await mgr.removeUser() } catch { /* Best-effort cleanup */ }
        await mgr.signoutRedirect()
    }

    /** Check if the user has a valid (non-expired) session. */
    async function isAuthenticated(): Promise<boolean> {
        const mgr = getUserManager()
        const user = await mgr.getUser()
        return user !== null && !user.expired
    }

    /** Get the current OIDC user (from cache). */
    function getUser(): Promise<OidcUser | null> {
        const mgr = getUserManager()
        return mgr.getUser()
    }

    /** Clear stale OIDC session from storage (prevents automaticSilentRenew loops). */
    async function removeUser(): Promise<void> {
        const mgr = getUserManager()
        await mgr.removeUser()
    }

    return {
        oidcUser,
        signIn,
        getAuthRequestId,
        handleCallback,
        getAccessToken,
        silentRenew,
        signOut,
        isAuthenticated,
        getUser,
        removeUser,
    }
}
