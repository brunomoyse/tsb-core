import { Capacitor } from '@capacitor/core'
import { useRuntimeConfig } from '#imports'

export function usePlatform() {
    const config = useRuntimeConfig()
    const isCapacitor = config.public.appBuild === 'capacitor'
    // Capacitor.getPlatform() is browser-only; SSR always returns 'web' so isIos/isAndroid are false on server
    const platform = import.meta.client ? Capacitor.getPlatform() : 'web'
    return {
        isCapacitor,
        isWeb: !isCapacitor,
        isIos: isCapacitor && platform === 'ios',
        isAndroid: isCapacitor && platform === 'android',
    }
}
