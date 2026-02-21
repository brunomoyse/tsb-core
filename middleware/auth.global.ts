// middleware/auth.global.ts
import { defineNuxtRouteMiddleware, useRequestEvent, navigateTo, useRuntimeConfig, useCookie} from 'nuxt/app'
import { useAuthStore } from '@/stores/auth'
import { useLocalePath } from "#imports";

export default defineNuxtRouteMiddleware(async (to) => {
    if (to.meta.public !== false) return
    const config = useRuntimeConfig()
    const localePath = useLocalePath()
    const apiUrl: string = config.public.api as string

    // Server-side handling
    if (import.meta.server) {
        const event = useRequestEvent()

        const cookies = parseCookies(event?.node.req.headers.cookie || '')

        // 1. Check for refresh token existence
        if (!cookies.refresh_token) {
            return navigateTo(localePath('login'));
        }

        // 2. Validate access token expiration if present
        if (cookies.access_token) {
            const isValid = checkTokenExpiration(cookies.access_token)
            if (isValid) return
        }

        // 3. Attempt refresh if no valid access token
        try {
            const refreshResponse = await $fetch.raw(`${apiUrl}/tokens/refresh`, {
                method: 'POST',
                headers: { cookie: event?.node.req.headers.cookie || '' }
            })
            // Update client cookies
            const setCookies = refreshResponse.headers.get('set-cookie')
            if (setCookies && event) {
                event.node.res.setHeader('set-cookie', setCookies)
                // Also update the in-memory cookie used for immediate SSR API calls
                event.node.req.headers.cookie = setCookies
            }
        } catch {
            return navigateTo(localePath('login'));
        }
    }
    // Client-side handling
    else {
        const authStore = useAuthStore()

        // 1. Check memory store first
        if (authStore.accessValid) return

        // 2. Check localStorage for expiration timestamp
        const expiresAt = localStorage.getItem('token_expires')
        if (expiresAt && Date.now() < Number(expiresAt)) return

        const refreshToken = useCookie('refresh_token')
        if (!refreshToken.value) {
            return navigateTo(localePath('login'));
        }

        try {
            // 3. Silent refresh attempt
            await $fetch(`${apiUrl}/tokens/refresh`, {
                method: 'POST',
                credentials: 'include'
            })

            // Update client-side validation state
            authStore.setAccessValid(true)
        } catch {
            await authStore.logout()
            return navigateTo(localePath('login'));
        }
    }
})

// utils/jwt.ts
function checkTokenExpiration(token: string): boolean {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]!))
        return payload.exp * 1000 > Date.now()
    } catch {
        return false
    }
}


// Simplified cookie helper functions
function parseCookies(cookieHeader: string): Record<string, string> {
    if (!cookieHeader) return {}
    return cookieHeader.split(';').reduce((cookies, item) => {
        const idx = item.indexOf('=')
        if (idx === -1) return cookies
        const name = item.substring(0, idx).trim()
        const value = item.substring(idx + 1).trim()
        try { cookies[name] = decodeURIComponent(value) } catch { cookies[name] = value }
        return cookies
    }, {} as Record<string, string>)
}
