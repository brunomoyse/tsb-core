// Middleware: auth.global.ts — OIDC session management via Zitadel
import { defineNuxtRouteMiddleware, navigateTo } from 'nuxt/app'

export default defineNuxtRouteMiddleware(async (to) => {
    // Public pages skip auth check
    if (to.meta.public !== false) return

    // Server-side: redirect to login page (public). The login page initiates OIDC on client.
    if (import.meta.server) {
        const locale = to.path.split('/')[1] || 'fr'
        return navigateTo(`/${locale}/auth/login`)
    }

    // Client-side: check OIDC session
    const { useOidc } = await import('~/composables/useOidc')
    const { isAuthenticated, silentRenew, signIn } = useOidc()

    // 1. Valid session exists
    if (await isAuthenticated()) return

    // 2. Attempt silent renewal
    const renewed = await silentRenew()
    if (renewed) return

    // 3. No session — start OIDC flow (redirects to Zitadel Login V2 UI)
    const locale = to.path.split('/')[1] || 'fr'
    try {
        await signIn({ ui_locales: locale })
        // signIn triggers window.location redirect — return abortNavigation equivalent
        return navigateTo(`/${locale}/auth/login`)
    } catch {
        return navigateTo(`/${locale}/auth/login`)
    }
})
