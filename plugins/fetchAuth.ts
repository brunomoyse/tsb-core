import { defineNuxtPlugin, storeToRefs, useAuthStore, useRuntimeConfig, useCookie } from '#imports'
import type { RefreshTokenResponse } from '~/types'
import type { FetchContext } from 'ofetch'

type HttpMethod =
    | 'get'
    | 'head'
    | 'patch'
    | 'post'
    | 'put'
    | 'delete'
    | 'connect'
    | 'options'
    | 'trace'

export default defineNuxtPlugin(() => {
    const config = useRuntimeConfig()
    const authStore = useAuthStore()
    const { accessToken } = storeToRefs(authStore)

    // Capture the refresh token cookie at plugin initialization (SSR only)
    let refreshTokenCookie: ReturnType<typeof useCookie> | undefined
    if (import.meta.server) {
        refreshTokenCookie = useCookie('refresh_token')
    }

    // This promise ensures only one refresh call happens at a time.
    let refreshTokenPromise: Promise<RefreshTokenResponse | null> | null = null

    async function refreshToken(): Promise<RefreshTokenResponse | null> {
        if (!refreshTokenPromise) {
            refreshTokenPromise = (async () => {
                try {
                    let cookieHeader = ''
                    if (import.meta.server && refreshTokenCookie) {
                        cookieHeader = `refresh_token=${refreshTokenCookie.value || ''}`
                    }

                    const newToken = await $fetch<RefreshTokenResponse>('/tokens/refresh', {
                        baseURL: config.public.api as string,
                        method: 'POST',
                        credentials: 'include',
                        headers: import.meta.server ? { cookie: cookieHeader } : undefined
                    })

                    authStore.setAccessToken(newToken.accessToken)
                    return newToken
                } catch (error) {
                    await authStore.logout({ apiUrl: config.public.api as string })
                    console.error('Token refresh failed:', error)
                    throw error
                } finally {
                    refreshTokenPromise = null
                }
            })()
        }
        return refreshTokenPromise
    }

    const $api = $fetch.create({
        baseURL: config.public.api as string,
        credentials: 'include',
        retry: 1,
        retryStatusCodes: [401],
        async onRequest({ options }) {
            let token = accessToken.value
            if (import.meta.server) {
                // As a fallback on SSR, read the access token from the 'access_token' cookie.
                const accessTokenCookie = useCookie('access_token')
                if (accessTokenCookie.value) {
                    token = accessTokenCookie.value
                }
            }

            if (token) {
                const headers = new Headers(options.headers)
                headers.set('Authorization', `Bearer ${token}`)
                options.headers = headers
            }
        },
        async onResponse(context: FetchContext<any>): Promise<any> {
            const { response, request, options } = context
            const requestUrl = typeof request === 'string' ? request : request.url

            // Only retry once for 401 errors on endpoints other than /tokens/refresh or login.
            if (
                response?.status === 401 &&
                !requestUrl.includes('/tokens/refresh') &&
                !requestUrl.includes('login') &&
                !(options as any)._retry
            ) {
                (options as any)._retry = true

                try {
                    await refreshToken()

                    const headers = new Headers(options.headers)
                    headers.set('Authorization', `Bearer ${accessToken.value}`)

                    const newRequest = request instanceof Request ? request : new Request(request)
                    const { method, ...restOptions } = options

                    return $api(newRequest, {
                        ...restOptions,
                        method: method as HttpMethod,
                        headers
                    })
                } catch (error) {
                    throw error
                }
            }
            return response
        }
    })

    return {
        provide: {
            api: $api,
            refreshToken
        }
    }
})
