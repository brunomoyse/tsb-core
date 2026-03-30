// Register for push notifications after auth is confirmed (Capacitor only)
export default defineNuxtPlugin(async () => {
    const config = useRuntimeConfig()
    if (config.public.appBuild !== 'capacitor') return

    const { useAuthStore } = await import('~/stores/auth')
    const authStore = useAuthStore()

    // Only register if user is authenticated
    if (!authStore.user) return

    const { usePushNotifications } = await import('~/composables/usePushNotifications')
    const { register } = usePushNotifications()
    await register()
})
