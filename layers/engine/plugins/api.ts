// Plugins/api.ts — OIDC Bearer token authentication via Zitadel
import { isSilentRenewUnavailable } from '#engine/utils/silentRenewError'
import { rememberCurrentPage } from '#engine/utils/authFlow'
import {
  defineNuxtPlugin,
  navigateTo,
  useCookie,
  useLocalePath,
  useRequestEvent,
  useRuntimeConfig,
} from '#imports'

/** An HTTP failure carrying a 401 status (ofetch's FetchError). */
const isUnauthorized = (err: unknown): boolean =>
  typeof err === 'object' && err !== null && 'status' in err && err.status === 401

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()
  const apiUrl: string = config.public.api
  // The page's language at call time (route locale on the server, current locale on the client); the cookie is only a fallback.
  const currentLocale = (): string => {
    const routeLocale = nuxtApp.$i18n?.locale?.value
    if (routeLocale !== undefined) return routeLocale
    const cookieLocale = useCookie('i18n_redirected').value
    return cookieLocale !== undefined && cookieLocale !== null && cookieLocale !== ''
      ? cookieLocale
      : 'fr'
  }
  const localePath = useLocalePath()

  /** Get access token from OIDC client. Only called from the client branch of the request hook (never during SSR). */
  const getOidcToken = async (): Promise<string | null> => {
    const { useOidc } = await import('#engine/composables/useOidc')
    const { getAccessToken } = useOidc()
    return getAccessToken()
  }

  /** Attempt silent OIDC token renewal (coalesced inside useOidc). */
  const refreshAuth = async (): Promise<boolean> => {
    const { useOidc } = await import('#engine/composables/useOidc')
    const { silentRenew } = useOidc()
    const user = await silentRenew()
    return Boolean(user)
  }

  const baseApi = $fetch.create<unknown, string>({
    baseURL: apiUrl,
    credentials: 'omit', // No cookies — we use Bearer tokens
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    async onRequest({ options }) {
      options.headers.set('Accept-Language', currentLocale())
      if (import.meta.server) {
        // SSR: forward cookies if available
        const event = useRequestEvent()
        const cookies = event?.node.req.headers.cookie
        if (cookies !== undefined && cookies !== '') options.headers.set('cookie', cookies)
      } else {
        // Client-side: attach Bearer token from OIDC
        const token = await getOidcToken()
        if (token !== null && token !== '') options.headers.set('Authorization', `Bearer ${token}`)
      }
    },
  })

  // Wrapper that handles 401 retry externally (onResponseError return values are ignored by ofetch)
  const api = async <T>(request: string, options?: Parameters<typeof baseApi>[1]): Promise<T> => {
    try {
      return await baseApi<T, string>(request, options)
    } catch (err: unknown) {
      if (!import.meta.server && isUnauthorized(err)) {
        let ok: boolean
        try {
          ok = await refreshAuth()
        } catch (renewErr: unknown) {
          // Zitadel could not be reached: the session is kept, no login redirect, this request fails and the next renews again.
          if (isSilentRenewUnavailable(renewErr)) throw err
          throw renewErr
        }
        if (ok) return baseApi<T, string>(request, options)
        rememberCurrentPage()
        void navigateTo(`${localePath('auth-login')}?session=expired`)
      }
      throw err
    }
  }

  return { provide: { api } }
})
