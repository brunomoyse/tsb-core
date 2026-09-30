import { navigateTo, useCartStore, useLocalePath } from '#imports'
import type { CartItem } from '~/types'
import { useCartItemEdit } from './useCartItemEdit'
import { useI18n } from 'vue-i18n'
import { useNotificationsStore } from '~/stores/notifications'
import { useTracking } from './useTracking'

/*
 * Cart line actions shared by every cart surface: removal with an Undo toast,
 * and "Edit" for customized lines (reopens the product modal prefilled).
 */
export function useCartItemActions() {
    const cartStore = useCartStore()
    const localePath = useLocalePath()
    const { t } = useI18n()
    const notifications = useNotificationsStore()
    const { trackEvent } = useTracking()
    const cartItemEdit = useCartItemEdit()

    const removeWithUndo = (item: CartItem): void => {
        const { product, selectedChoice, selectedChoices, quantity } = item
        trackEvent('product_removed_from_cart', { product_id: product.id, product_name: product.name })
        cartStore.removeFromCart(product, { choice: selectedChoice, selections: selectedChoices })
        notifications.notify({
            message: t('cart.removedUndo', { name: product.name }),
            duration: 4000,
            variant: 'neutral',
            action: {
                label: t('cart.undo'),
                handler: () => {
                    cartStore.addProduct(product, quantity, { choice: selectedChoice, selections: selectedChoices })
                    trackEvent('product_removal_undone', { product_id: product.id, quantity })
                },
            },
        })
    }

    const editItem = async (item: CartItem): Promise<void> => {
        cartItemEdit.value = { ...item }
        cartStore.setCartVisibility(false)
        trackEvent('cart_item_edit_opened', { product_id: item.product.id })
        await navigateTo({ path: localePath('/menu'), query: { product: item.product.id } })
    }

    return { removeWithUndo, editItem }
}
