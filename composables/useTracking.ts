import type { User } from '~/types'
import { useNuxtApp } from '#imports'



export function useTracking() {
    const getPosthog = () => {
        try {
            const { $posthog } = useNuxtApp()
            return $posthog ?? null
        } catch {
            return null
        }
    }

    const trackEvent = (name: string, props?: Record<string, unknown>) => {
        const ph = getPosthog()
        if (!ph) return
        ph.capture(name, props)
    }

    const identifyUser = (user: User) => {
        const ph = getPosthog()
        if (!ph) return
        ph.identify(user.id, {
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
        })
    }

    const resetUser = () => {
        const ph = getPosthog()
        if (!ph) return
        ph.reset()
    }

    const optIn = () => {
        localStorage.setItem('cookie_consent', 'accepted')
        const ph = getPosthog()
        if (!ph) return
        ph.opt_in_capturing()
        // Enable session recording after consent
        ph.startSessionRecording()
    }

    const optOut = () => {
        localStorage.setItem('cookie_consent', 'declined')
        const ph = getPosthog()
        if (!ph) return
        ph.opt_out_capturing()
    }

    const hasOptedIn = (): boolean => {
        const ph = getPosthog()
        if (!ph) return false
        return ph.has_opted_in_capturing()
    }

    const hasConsentChoice = (): boolean => {
        if (typeof localStorage === 'undefined') return false
        return localStorage.getItem('cookie_consent') !== null
    }

    return {
        trackEvent,
        identifyUser,
        resetUser,
        optIn,
        optOut,
        hasOptedIn,
        hasConsentChoice,
    }
}
