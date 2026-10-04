import {
  ErrorResponse,
  type User as OidcUser,
  UserManager,
  WebStorageStateStore,
} from 'oidc-client-ts'
import {
  SilentRenewUnavailableError,
  isSilentRenewUnavailable,
} from '#engine/utils/silentRenewError'
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

/*
 * OAuth error codes of a token endpoint that say "try again later", not "this refresh token is no good": the session
 * is kept. Every other `ErrorResponse` (invalid_grant: expired, revoked or already used refresh token, login_required,
 * invalid_client...) is a definitive refusal.
 */
const TRANSIENT_OAUTH_ERRORS = new Set(['server_error', 'temporarily_unavailable'])

/** Did Zitadel itself answer that this session cannot be renewed? (Not: we could not reach it.) */
const isRefusal = (err: unknown): boolean =>
  err instanceof ErrorResponse && !TRANSIENT_OAUTH_ERRORS.has(String(err.error))

/**
 * Provides OIDC Authorization Code + PKCE flow via oidc-client-ts.
 */
export function useOidc() {
  const config = useRuntimeConfig()

  const baseUrl = (config.public.baseUrl as string).replace(/\/+$/u, '')

  /*
   * The callback page in the language of the page the customer is on NOW. The user manager is a singleton built on first
   * use, so the redirect URI in its settings is the one of the first page; every sign-in passes this one instead.
   */
  function callbackUrl(): string {
    const locale =
      typeof window === 'undefined' ? 'fr' : window.location.pathname.split('/')[1] || 'fr'
    return `${baseUrl}/${locale}/auth/callback`
  }

  function getUserManager(): UserManager {
    if (userManager) return userManager

    userManager = new UserManager({
      authority: config.public.zitadelAuthority as string,
      client_id: config.public.zitadelClientId as string,
      redirect_uri: callbackUrl(),
      post_logout_redirect_uri: baseUrl,
      response_type: 'code',
      scope: 'openid profile email offline_access urn:zitadel:iam:org:project:roles',
      // Off: the background renewal raced with middleware/plugin calls on the same refresh token; Zitadel's rotation logged the loser out mid-session. Renew lazily on navigation and on 401 instead.
      automaticSilentRenew: false,
      // Persist tokens across browser close; Zitadel enforces the 30-day idle / 90-day absolute refresh-token TTL.
      userStore: new WebStorageStateStore({ store: localStorage }),
      stateStore: new WebStorageStateStore({ store: localStorage }),
    })

    userManager.events.addUserLoaded((user) => {
      oidcUser.value = user
    })
    userManager.events.addUserUnloaded(() => {
      oidcUser.value = null
    })

    userManager.events.addAccessTokenExpired(async () => {
      /*
       * Route through the module-level coalescer so this event-driven
       * renewal cannot race with a concurrent silentRenew() call from
       * middleware/plugins on the same refresh token.
       */
      try {
        await silentRenew()
      } catch (err) {
        // No network right now: the session is kept, the next request renews it.
        if (!isSilentRenewUnavailable(err)) throw err
      }
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
    await mgr.signinRedirect({ redirect_uri: callbackUrl(), extraQueryParams: extraParams })
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
    const signinRequest = await client.createSigninRequest({ redirect_uri: callbackUrl() })

    const apiUrl = config.public.api as string
    const response = await $fetch<{ authRequestId: string }>(`${apiUrl}/auth/authorize-proxy`, {
      method: 'POST',
      body: { authorizeUrl: signinRequest.url },
    })

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
    try {
      const renewed = await silentRenew()
      return renewed?.access_token ?? null
    } catch (err) {
      // The renewal could not be made now (offline): no token for this request, the session stays for the next one.
      if (isSilentRenewUnavailable(err)) return null
      throw err
    }
  }

  /**
   * Attempt silent token renewal. All callers (middleware, plugins, the
   * accessTokenExpired event, getAccessToken) share a single in-flight
   * promise so we never use the same refresh token twice in parallel —
   * Zitadel rotates on first use and would log the loser out.
   *
   * Resolves the renewed user, or `null` when the session is over (nothing to
   * renew, or Zitadel refused the refresh token: the stale user is wiped).
   * Rejects with `SilentRenewUnavailableError` when Zitadel could not be
   * reached (offline, timeout, 5xx): the session is NOT touched, the caller
   * keeps the customer signed in and does not send them to the login page.
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
    // Without a refresh token oidc-client-ts would try a hidden iframe, which this app does not configure: no way back.
    if (!existing.refresh_token) return endSession(mgr)
    try {
      const user = await mgr.signinSilent()
      oidcUser.value = user
      return user
    } catch (err) {
      if (isRefusal(err)) return endSession(mgr)
      throw new SilentRenewUnavailableError({ cause: err })
    }
  }

  /*
   * The session cannot be renewed any more: wipe the stale user so subsequent getAccessToken() calls return null
   * instead of triggering an iframe storm against Zitadel.
   */
  async function endSession(mgr: UserManager): Promise<null> {
    try {
      await mgr.removeUser()
    } catch {
      /* Best-effort cleanup */
    }
    oidcUser.value = null
    return null
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
    try {
      await mgr.removeUser()
    } catch {
      /* Best-effort cleanup */
    }
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
