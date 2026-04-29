// Plugins/api.ts — OIDC Bearer token authentication via Zitadel
import { defineNuxtPlugin, navigateTo, useCookie, useLocalePath, useRequestEvent, useRuntimeConfig } from '#imports'

export default defineNuxtPlugin(() => {
    const config = useRuntimeConfig()
    const apiUrl: string = config.public.api as string
    const userLocale = useCookie('i18n_redirected').value ?? 'fr'
    const localePath = useLocalePath()

    /** Get access token from OIDC client (client-side only) */
    const getOidcToken = async (): Promise<string | null> => {
        if (import.meta.server) return null
        const { useOidc } = await import('~/composables/useOidc')
        const { getAccessToken } = useOidc()
        return getAccessToken()
    }

    /** Attempt silent OIDC token renewal (coalesced inside useOidc). */
    const refreshAuth = async (): Promise<boolean> => {
        const { useOidc } = await import('~/composables/useOidc')
        const { silentRenew } = useOidc()
        const user = await silentRenew()
        return Boolean(user)
    }

    const baseApi = $fetch.create({
        baseURL: apiUrl,
        credentials: 'omit', // No cookies — we use Bearer tokens
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Accept-Language': userLocale
        },
        async onRequest({ options }: { options: { headers?: Record<string, string> } }) {
            if (import.meta.server) {
                // SSR: forward cookies for Accept-Language if available
                const event = useRequestEvent()
                const serverLocale = useCookie('i18n_redirected').value ?? 'fr'
                const cookies = event?.node.req.headers.cookie

                if (cookies) {
                    options.headers = {
                        ...options.headers,
                        cookie: cookies,
                        'Accept-Language': serverLocale
                    }
                }
            } else {
                // Client-side: attach Bearer token from OIDC
                const token = await getOidcToken()
                if (token) {
                    options.headers = {
                        ...options.headers,
                        Authorization: `Bearer ${token}`,
                    }
                }
            }
        },
    })

    // Wrapper that handles 401 retry externally (onResponseError return values are ignored by ofetch)
    const api = async <T>(request: Parameters<typeof baseApi>[0], options?: Parameters<typeof baseApi>[1]): Promise<T> => {
        try {
            return await baseApi(request, options) as T
        } catch (err: unknown) {
            if (
                !import.meta.server
                && err && typeof err === 'object' && 'status' in err
                && (err as { status: number }).status === 401
            ) {
                const ok = await refreshAuth()
                if (ok) return await baseApi(request, options) as T
                navigateTo(`${localePath('auth-login')}?session=expired`)
            }
            throw err
        }
    }

    return { provide: { api } }
})
