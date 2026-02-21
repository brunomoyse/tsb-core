import { useCartStore, useLocalePath, navigateTo } from '#imports'
import { useI18n } from 'vue-i18n'
import { eventBus } from '~/eventBus'
import type { Order } from '~/types'

export function useReorder() {
    const cartStore = useCartStore()
    const localePath = useLocalePath()
    const { t } = useI18n()

    function reorder(order: Order) {
        cartStore.resetState()

        let added = 0
        let skipped = 0

        for (const item of order.items) {
            if (!item.product.isAvailable || !item.product.isVisible) {
                skipped += item.quantity
                continue
            }
            cartStore.addProduct(item.product, item.quantity, item.choice ?? null)
            added += item.quantity
        }

        if (added === 0) {
            eventBus.emit('notify', {
                message: t('reorder.empty'),
                variant: 'error',
            })
        } else if (skipped > 0) {
            eventBus.emit('notify', {
                message: t('reorder.partial', { added, skipped }),
                variant: 'info',
            })
        } else {
            eventBus.emit('notify', {
                message: t('reorder.success', { count: added }),
                variant: 'success',
            })
        }

        if (added > 0) {
            navigateTo(localePath('/checkout'))
        }

        return { added, skipped }
    }

    return { reorder }
}
