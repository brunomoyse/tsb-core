/**
 * Haptics shim. The web platform has no reliable cross-browser haptics API, so
 * these are no-ops — kept as a stable interface for the components that call
 * them (cart, menu, pull-to-refresh, swipe-back…) without per-call guards.
 * (Native haptics lived in the now-removed Capacitor build.)
 */
export function useHaptics() {
    const impact = async (_style: 'Light' | 'Medium' | 'Heavy' = 'Light') => {}
    const notification = async (_type: 'Success' | 'Warning' | 'Error' = 'Success') => {}
    const selection = async () => {}

    return { impact, notification, selection }
}
