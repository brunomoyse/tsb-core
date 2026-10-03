// Plugins/api.ts — OIDC Bearer token authentication via Zitadel
import {
  defineNuxtPlugin,
  navigateTo,
  useCookie,
  useLocalePath,
  useRequestEvent,
  useRuntimeConfig,
} from '#imports'

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()
  const apiUrl: string = config.public.api
  // The page's language at call time (route locale on the server, current locale on the client); the cookie is only a fallback.
  const currentLocale = (): string =>
    nuxtApp.$i18n?.locale?.value || useCookie('i18n_redirected').value || 'fr'
  const localePath = useLocalePath()

  /** Get access token from OIDC client (client-side only) */
  const getOidcToken = async (): Promise<string | null> => {
    if (import.meta.server) return null
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
        if (cookies) options.headers.set('cookie', cookies)
      } else {
        // Client-side: attach Bearer token from OIDC
        const token = await getOidcToken()
        if (token) options.headers.set('Authorization', `Bearer ${token}`)
      }
    },
  })

  // Wrapper that handles 401 retry externally (onResponseError return values are ignored by ofetch)
  const api = async <T>(request: string, options?: Parameters<typeof baseApi>[1]): Promise<T> => {
    try {
      return await baseApi<T, string>(request, options)
    } catch (err: unknown) {
      if (
        !import.meta.server &&
        err &&
        typeof err === 'object' &&
        'status' in err &&
        (err as { status: number }).status === 401
      ) {
        const ok = await refreshAuth()
        if (ok) return baseApi<T, string>(request, options)
        void navigateTo(`${localePath('auth-login')}?session=expired`)
      }
      throw err
    }
  }

  return { provide: { api } }
})
