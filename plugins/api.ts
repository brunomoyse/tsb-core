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

    /** Attempt silent OIDC token renewal */
    const refreshAuth = async () => {
        const { useOidc } = await import('~/composables/useOidc')
        const { silentRenew } = useOidc()
        const user = await silentRenew()
        if (!user) throw new Error('Silent renew failed')
    }

    const api = $fetch.create({
        baseURL: apiUrl,
        credentials: 'omit', // No cookies — we use Bearer tokens
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Accept-Language': userLocale
        },
        async onRequest({ options }) {
            if (import.meta.server) {
                // SSR: forward cookies for Accept-Language if available
                const event = useRequestEvent()
                const serverLocale = useCookie('i18n_redirected').value ?? 'fr'
                const cookies = event?.node.req.headers.cookie

                // Try to extract access_token from cookies for SSR API calls
                // (during OIDC transition, cookies may still be present)
                if (cookies) {
                    options.headers = {
                        ...options.headers,
                        // @ts-expect-error cookie is not in the HeadersInit type but needed for SSR forwarding
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
        async onResponseError({ response, request, options }) {
            if (response.status === 401 && !import.meta.server) {
                try {
                    await refreshAuth()
                    // Retry with new token
                    // @ts-expect-error $fetch accepts the original request/options but types don't align
                    return $fetch(request, options)
                } catch {
                    navigateTo(`${localePath('auth-login')}?session=expired`)
                }
            }
        }
    })

    return { provide: { api } }
})
