import { type User as OidcUser, UserManager, WebStorageStateStore } from 'oidc-client-ts'
import { type Ref, ref } from 'vue'
import { useRuntimeConfig } from '#imports'

let userManager: UserManager | null = null
const oidcUser: Ref<OidcUser | null> = ref(null)

/**
 * Provides OIDC Authorization Code + PKCE flow via oidc-client-ts.
 * Wraps Zitadel as the identity provider.
 */
export function useOidc() {
    const config = useRuntimeConfig()

    function getUserManager(): UserManager {
        if (userManager) return userManager

        const baseUrl = config.public.baseUrl as string
        // Detect current locale from URL path (e.g., /fr/auth/callback)
        const locale = typeof window !== 'undefined'
            ? window.location.pathname.split('/')[1] || 'fr'
            : 'fr'

        userManager = new UserManager({
            authority: config.public.zitadelAuthority as string,
            client_id: config.public.zitadelClientId as string,
            redirect_uri: `${baseUrl}/${locale}/auth/callback`,
            post_logout_redirect_uri: baseUrl,
            response_type: 'code',
            scope: 'openid profile email urn:zitadel:iam:org:project:roles',
            automaticSilentRenew: true,
            userStore: new WebStorageStateStore({ store: sessionStorage }),
        })

        // Listen for token renewal
        userManager.events.addUserLoaded((user) => {
            oidcUser.value = user
        })

        userManager.events.addUserUnloaded(() => {
            oidcUser.value = null
        })

        return userManager
    }

    /** Start the OIDC authorize redirect (goes to Zitadel, which redirects to custom login). */
    async function signIn(extraParams?: Record<string, string>) {
        const mgr = getUserManager()
        await mgr.signinRedirect({
            extraQueryParams: extraParams,
        })
    }

    /** Complete the OIDC callback (exchange code for tokens). */
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
        if (user === null || user.expired) return null
        return user.access_token
    }

    /** Attempt silent token renewal. */
    async function silentRenew(): Promise<OidcUser | null> {
        const mgr = getUserManager()
        try {
            const user = await mgr.signinSilent()
            oidcUser.value = user
            return user
        } catch {
            return null
        }
    }

    /** Sign out via OIDC end-session endpoint. */
    async function signOut() {
        const mgr = getUserManager()
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

    return {
        oidcUser,
        signIn,
        handleCallback,
        getAccessToken,
        silentRenew,
        signOut,
        isAuthenticated,
        getUser,
    }
}
