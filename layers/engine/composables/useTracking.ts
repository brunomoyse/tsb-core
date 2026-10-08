interface Umami {
  track: (name: string, data?: Record<string, unknown>) => void
}
const isUmami = (value: unknown): value is Umami =>
  typeof value === 'object' &&
  value !== null &&
  'track' in value &&
  typeof value.track === 'function'

export function useTracking() {
  const getUmami = () => {
    if (typeof window === 'undefined') return null
    const umami: unknown = Reflect.get(window, 'umami')
    return isUmami(umami) ? umami : null
  }

  const trackEvent = (name: string, props?: Record<string, unknown>) => {
    getUmami()?.track(name, props)
  }

  const identifyUser = () => {
    // Umami is anonymous by design; no-op
  }

  const resetUser = () => {
    // Umami is anonymous by design; no-op
  }

  return {
    trackEvent,
    identifyUser,
    resetUser,
  }
}
