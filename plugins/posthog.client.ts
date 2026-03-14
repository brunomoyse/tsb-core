import { defineNuxtPlugin, useRouter, useRuntimeConfig } from '#imports'
import posthog, { type PostHog } from 'posthog-js'
import { useAuthStore } from '~/stores/auth'

export default defineNuxtPlugin((): { provide: { posthog: PostHog | null } } => {
    const config = useRuntimeConfig()
    const apiKey = config.public.posthogApiKey as string

    if (!apiKey) {
        return { provide: { posthog: null } }
    }

    const isCapacitor = config.public.appBuild === 'capacitor'

    const posthogInstance = posthog.init(apiKey, {
        api_host: config.public.posthogHost as string,
        autocapture: false,
        capture_pageview: false,
        capture_pageleave: true,
        respect_dnt: true,
        persistence: 'localStorage+cookie',
        opt_out_capturing_by_default: true,
        session_recording: {
            maskAllInputs: true,
        },
        disable_session_recording: true,
        loaded: (ph) => {
            // Set platform super property for analytics segmentation
            if (isCapacitor) {
                ph.register({ platform: 'mobile' })
            }
            // Re-identify persisted user on load (only if user has consented)
            if (ph.has_opted_in_capturing()) {
                const authStore = useAuthStore()
                if (authStore.user) {
                    ph.identify(authStore.user.id, {
                        email: authStore.user.email,
                        name: `${authStore.user.firstName} ${authStore.user.lastName}`,
                    })
                }
            }
        },
    })!

    // Router hook for manual pageview tracking
    const router = useRouter()
    router.afterEach((to) => {
        if (!posthogInstance.has_opted_in_capturing()) return

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
