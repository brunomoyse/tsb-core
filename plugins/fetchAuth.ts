import {defineNuxtPlugin, storeToRefs, useAuthStore, useRequestHeaders, useRuntimeConfig} from '#imports'
import type {RefreshTokenResponse} from '~/types'
import type {FetchContext} from 'ofetch'

type HttpMethod = | 'get' | 'head' | 'patch' | 'post' | 'put' | 'delete' | 'connect' | 'options' | 'trace'

export default defineNuxtPlugin(() => {
    const config = useRuntimeConfig()
    const authStore = useAuthStore()
    const {accessToken} = storeToRefs(authStore)

    // This promise ensures only one refresh call happens at a time.
    let refreshTokenPromise: Promise<RefreshTokenResponse | null> | null = null

    // Server-side only: Capture initial request headers at plugin initialization.
    let serverCookies = ''
    if (import.meta.server) {
        const headers = useRequestHeaders(['cookie'])
        serverCookies = headers.cookie || ''
    }

    const parseAccessTokenFromCookies = (cookieString: string): string | null => {
        const match = cookieString.match(/(?:^|;\s*)access_token=([^;]+)/)
        return match ? decodeURIComponent(match[1]) : null
    }

    async function refreshToken(requestCookies?: string): Promise<RefreshTokenResponse | null> {
        if (!refreshTokenPromise) {
            refreshTokenPromise = (async () => {
                try {
                    // Use passed-in cookies (or the pre-captured server cookies) in SSR.
                    const headers = import.meta.server ? {cookie: requestCookies || serverCookies} : undefined

                    const newToken = await $fetch<RefreshTokenResponse>('/tokens/refresh', {
                        baseURL: config.public.api as string, method: 'POST', credentials: 'include', headers
                    })

                    authStore.setAccessToken(newToken.accessToken)
                    return newToken
                } catch (error) {
                    await authStore.logout({apiUrl: config.public.api as string})
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
        async onRequest({options}) {
            let token = accessToken.value

            // Server-side: Use pre-captured cookies from plugin initialization.
            if (import.meta.server) {
                const initialToken = parseAccessTokenFromCookies(serverCookies)
                if (initialToken) token = initialToken
            }

            if (token) {
                const headers = new Headers(options.headers)
                headers.set('Authorization', `Bearer ${token}`)
                options.headers = headers
            }
        },
        async onResponse(context: FetchContext<any>): Promise<any> {
            const {response, request, options} = context
            const requestUrl = typeof request === 'string' ? request : request.url

            if (response?.status === 401 && !requestUrl.includes('/tokens/refresh')) {
                try {
                    // Pass along cookies for server-side refresh if available.
                    const cookies = import.meta.server ? serverCookies : undefined
                    await refreshToken(cookies)

                    const headers = new Headers(options.headers)
                    headers.set('Authorization', `Bearer ${accessToken.value}`)

                    const newRequest = request instanceof Request ? request : new Request(request)
                    const {method, ...restOptions} = options

                    return $api(newRequest, {
                        ...restOptions, method: method as HttpMethod, headers
                    })
                } catch (error) {
                    options.retry = false
                    throw error
                }
            }
            return response
        }
    })

    return {
        provide: {
            api: $api, refreshToken
        }
    }
})
