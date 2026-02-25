import { defineNuxtPlugin, useRouter, useRuntimeConfig } from '#imports'
import posthog, { type PostHog } from 'posthog-js'
import { useAuthStore } from '~/stores/auth'

export default defineNuxtPlugin((): { provide: { posthog: PostHog | null } } => {
    const config = useRuntimeConfig()
    const apiKey = config.public.posthogApiKey as string

    if (!apiKey) {
        return { provide: { posthog: null } }
    }

    const posthogInstance = posthog.init(apiKey, {
        api_host: config.public.posthogHost as string,
        autocapture: false,
        capture_pageview: false,
        capture_pageleave: true,
        respect_dnt: true,
        persistence: 'localStorage+cookie',
        session_recording: {
            maskAllInputs: true,
        },
        disable_session_recording: true,
        loaded: (ph) => {
            // Re-identify persisted user on load
            const authStore = useAuthStore()
            if (authStore.user) {
                ph.identify(authStore.user.id, {
                    email: authStore.user.email,
                    name: `${authStore.user.firstName} ${authStore.user.lastName}`,
                })
            }
        },
    })!

    // Router hook for manual pageview tracking
    const router = useRouter()
    router.afterEach((to) => {
        // Strip i18n locale suffix (e.g. "menu___fr" -> "menu")
        const rawName = typeof to.name === 'string' ? to.name : ''
        const pageName = rawName.replace(/___[a-z]{2}$/, '')

        posthogInstance.capture('$pageview', {
            $current_url: to.fullPath,
            page_name: pageName,
        })
    })

    return { provide: { posthog: posthogInstance } }
})
