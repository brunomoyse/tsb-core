export function useTracking() {
    const getUmami = () => {
        if (typeof window === 'undefined') return null
        return (window as { umami?: { track: (name: string, data?: Record<string, unknown>) => void } }).umami ?? null
    }

    const trackEvent = (name: string, props?: Record<string, unknown>) => {
        getUmami()?.track(name, props)
    }

    const identifyUser = () => {
        // Umami is anonymous by design — no-op
    }

    const resetUser = () => {
        // Umami is anonymous by design — no-op
    }

    return {
        trackEvent,
        identifyUser,
        resetUser,
    }
}
