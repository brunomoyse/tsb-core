import { useRuntimeConfig } from '#imports'

export function usePlatform() {
    const config = useRuntimeConfig()
    const isCapacitor = config.public.appBuild === 'capacitor'
    return { isCapacitor, isWeb: !isCapacitor }
}
