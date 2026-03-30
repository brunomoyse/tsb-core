import { usePlatform } from '~/composables/usePlatform'

export function useHaptics() {
    const { isCapacitor } = usePlatform()

    const impact = async (style: 'Light' | 'Medium' | 'Heavy' = 'Light') => {
        if (!isCapacitor) return
        const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
        await Haptics.impact({ style: ImpactStyle[style] }).catch(() => {})
    }

    const notification = async (type: 'Success' | 'Warning' | 'Error' = 'Success') => {
        if (!isCapacitor) return
        const { Haptics, NotificationType } = await import('@capacitor/haptics')
        await Haptics.notification({ type: NotificationType[type] }).catch(() => {})
    }

    const selection = async () => {
        if (!isCapacitor) return
        const { Haptics } = await import('@capacitor/haptics')
        await Haptics.selectionChanged().catch(() => {})
    }

    return { impact, notification, selection }
}
