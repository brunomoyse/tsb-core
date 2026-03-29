// Middleware: auth.global.ts — OIDC session management via Zitadel
import { defineNuxtRouteMiddleware, navigateTo, useRuntimeConfig } from 'nuxt/app'

export default defineNuxtRouteMiddleware(async (to) => {
    // Public pages skip auth check
    if (to.meta.public !== false) return

    // SSR: skip auth check — OIDC tokens live in sessionStorage (client-only).
    // Client-side middleware handles authentication after hydration.
    if (import.meta.server) return

    // Client-side: check OIDC session
    const { useOidc } = await import('~/composables/useOidc')
    const { isAuthenticated, silentRenew, signIn } = useOidc()

    // 1. Valid session exists
    if (await isAuthenticated()) return

    // 2. Attempt silent renewal
    const renewed = await silentRenew()
    if (renewed) return

    const locale = to.path.split('/')[1] || 'fr'

    // 3. Capacitor: navigate to login page without OIDC redirect (avoids opening system browser)
    const config = useRuntimeConfig()
    if (config.public.appBuild === 'capacitor') {
        return navigateTo(`/${locale}/auth/login`)
    }

    // 4. Web: start OIDC flow (redirects to Zitadel Login V2 UI)
    try {
        await signIn({ ui_locales: locale })
        return navigateTo(`/${locale}/auth/login`)
    } catch {
        return navigateTo(`/${locale}/auth/login`)
    }
})
