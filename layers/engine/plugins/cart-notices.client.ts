import { useCartStore } from '#engine/stores/cart'
import { useNotificationsStore } from '#engine/stores/notifications'
import { watch } from 'vue'

/*
 * Tells the customer, once, that lines of their saved cart could not be recovered when it was
 * loaded (a shape nobody can read any more, see utils/cartPersistence.ts). The cart store counts
 * them in `droppedOnHydrate` (transient, never persisted); the migrated cart is written back
 * right away, so the next visit does not announce the same loss again.
 *
 * Waits for the app to be mounted: the translation function and the toast host exist by then.
 */
export default defineNuxtPlugin((nuxtApp) => {
    nuxtApp.hook('app:mounted', () => {
        const cartStore = useCartStore(nuxtApp.$pinia as Parameters<typeof useCartStore>[0])
        const notifications = useNotificationsStore(nuxtApp.$pinia as Parameters<typeof useNotificationsStore>[0])
        const i18n = nuxtApp.$i18n as { t: (key: string) => string }

        watch(() => cartStore.droppedOnHydrate, (dropped) => {
            if (dropped <= 0) return
            notifications.notify({
                message: i18n.t('cart.removedUnavailable'),
                variant: 'warning',
                duration: 8000,
            })
            cartStore.droppedOnHydrate = 0
        }, { immediate: true })
    })
})
