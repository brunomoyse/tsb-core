// Plugins/api.ts
import { defineNuxtPlugin, navigateTo, useCookie, useLocalePath, useRequestEvent, useRuntimeConfig } from '#imports'
import { useTokenStore } from '~/composables/useTokenStore'

export default defineNuxtPlugin(() => {
    const config = useRuntimeConfig();
    const apiUrl: string = config.public.api as string;
    const userLocale = useCookie('i18n_redirected').value ?? 'fr';
    const localePath = useLocalePath();
    const isCapacitor = config.public.appBuild === 'capacitor'
    const tokenStore = useTokenStore()

    /** Attempt to refresh auth tokens (Capacitor or web) */
    const refreshAuth = async () => {
        if (isCapacitor) {
            const refreshToken = await tokenStore.getRefreshToken()
            if (!refreshToken) throw new Error('No refresh token')
            const res = await $fetch<{ accessToken: string; refreshToken: string }>(`${apiUrl}/tokens/refresh`, {
                method: 'POST',
                credentials: 'omit',
                body: { refreshToken },
            })
            await tokenStore.setTokens(res.accessToken, res.refreshToken)
        } else {
            await $fetch(`${apiUrl}/tokens/refresh`, {
                method: 'POST',
                credentials: 'include'
            })
        }
    }

    /** Logout and clear tokens (Capacitor or web) */
    const logoutAndClear = async () => {
        if (isCapacitor) {
            const refreshToken = await tokenStore.getRefreshToken()
            if (refreshToken) {
                await $fetch(`${apiUrl}/logout`, {
                    method: 'POST',
                    credentials: 'omit',
                    body: { refreshToken },
                })
            }
            await tokenStore.clearTokens()
        } else {
            await $fetch(`${apiUrl}/logout`, {
                method: 'POST',
                credentials: 'include'
            })
        }
    }

    const api = $fetch.create({
        baseURL: apiUrl,
        credentials: isCapacitor ? 'omit' : 'include',
        retry: 1,
        retryStatusCodes: [401],
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Accept-Language': userLocale
        },
        async onRequest({ options }) {
            if (isCapacitor) {
                // Capacitor: attach Bearer token from token store
                const accessToken = await tokenStore.getAccessToken()
                if (accessToken) {
                    options.headers = {
                        ...options.headers,
                        Authorization: `Bearer ${accessToken}`,
                    }
                }
            } else if (import.meta.server) {
                // Web SSR: forward cookies
                const event = useRequestEvent()
                const cookies = event?.node.req.headers.cookie
                const serverLocale = useCookie('i18n_redirected').value ?? 'fr'

                if (cookies) {
                    options.headers = {
                        ...options.headers,
                        // @ts-expect-error cookie is not in the HeadersInit type but needed for SSR forwarding
                        cookie: cookies,
                        'Accept-Language': serverLocale
                    }
                }
            }
        },
        async onResponse({ response }) {
            // Capacitor: extract tokens from response body and store them
            if (isCapacitor && response._data) {
                const { accessToken, refreshToken } = response._data as { accessToken?: string; refreshToken?: string }
                if (accessToken && refreshToken) {
                    await tokenStore.setTokens(accessToken, refreshToken)
                }
            }
        },
        async onResponseError({ response, request, options }) {
            if (response.status === 401 &&
                !request.toString().includes('/tokens/refresh') &&
                !request.toString().includes('login')) {
                try {
                    if (!import.meta.server) {
                        await refreshAuth()
                        // @ts-expect-error $fetch accepts the original request/options but types don't align
                        return $fetch(request, options)
                    }
                } catch {
                    try { await logoutAndClear() } catch { /* Ignore logout errors */ }
                    navigateTo(localePath('login'))
                }
            }
        }
    })

    return { provide: { api } }
})
