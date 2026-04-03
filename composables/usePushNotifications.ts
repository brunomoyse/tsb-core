import gql from 'graphql-tag'
import { print } from 'graphql'
import { usePlatform } from '~/composables/usePlatform'

const REGISTER_DEVICE_TOKEN = print(gql`
    mutation ($deviceToken: String!, $platform: String!) {
        registerDeviceToken(deviceToken: $deviceToken, platform: $platform)
    }
`)

const UNREGISTER_DEVICE_TOKEN = print(gql`
    mutation ($deviceToken: String!) {
        unregisterDeviceToken(deviceToken: $deviceToken)
    }
`)

const STORAGE_KEY = 'push_device_token'

export function usePushNotifications() {
    const { isCapacitor, isIos, isAndroid } = usePlatform()
    const { $gqlFetch } = useNuxtApp()

    async function register() {
        if (!isCapacitor) return

        const { PushNotifications } = await import('@capacitor/push-notifications')

        // Check current permission status
        const permStatus = await PushNotifications.checkPermissions()
        if (permStatus.receive === 'denied') return

        // Request permission if not yet granted
        if (permStatus.receive !== 'granted') {
            const result = await PushNotifications.requestPermissions()
            if (result.receive !== 'granted') return
        }

        // Wait for APNs/FCM to return the device token before resolving.
        // So callers can safely navigate after register() completes.
        await new Promise<void>((resolve) => {
            const timeout = setTimeout(resolve, 5_000) // Don't block forever

            PushNotifications.addListener('registration', async (token) => {
                clearTimeout(timeout)
                const previousToken = localStorage.getItem(STORAGE_KEY)
                if (previousToken === token.value) {
                    resolve()
                    return
                }

                const platform = isIos ? 'ios' : isAndroid ? 'android' : 'ios'
                try {
                    await $gqlFetch(REGISTER_DEVICE_TOKEN, {
                        variables: { deviceToken: token.value, platform },
                    })
                    localStorage.setItem(STORAGE_KEY, token.value)
                } catch {
                    // Token registration failure is non-critical
                }
                resolve()
            })

            PushNotifications.addListener('registrationError', () => {
                clearTimeout(timeout)
                resolve()
            })

            PushNotifications.register()
        })

        // Handle foreground push: emit event so pages can refetch order status
        await PushNotifications.addListener('pushNotificationReceived', (notification) => {
            if (notification.data?.orderId) {
                import('~/eventBus').then(({ eventBus }) => {
                    eventBus.emit('order-status-push', { orderId: notification.data.orderId })
                })
            }
        })

        // Handle notification tap (app was backgrounded/closed)
        await PushNotifications.addListener('pushNotificationActionPerformed', () => {
            const router = useNuxtApp().$router
            const localePath = useNuxtApp().$localePath as (path: string) => string
            router.push(localePath('/me/orders'))
        })
    }

    async function unregister() {
        if (!isCapacitor) return

        const storedToken = localStorage.getItem(STORAGE_KEY)
        if (storedToken) {
            try {
                await $gqlFetch(UNREGISTER_DEVICE_TOKEN, {
                    variables: { deviceToken: storedToken },
                })
            } catch {
                // Best-effort cleanup
            }
            localStorage.removeItem(STORAGE_KEY)
        }

        try {
            const { PushNotifications } = await import('@capacitor/push-notifications')
            await PushNotifications.removeAllListeners()
        } catch {
            // Plugin may not be available
        }
    }

    return { register, unregister }
}
