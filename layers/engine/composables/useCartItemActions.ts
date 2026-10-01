import { navigateTo, useCartStore, useLocalePath } from '#imports'
import type { CartItem } from '~/types'
import { useCartItemEdit } from './useCartItemEdit'
import { useCartRemoval } from './useCartRemoval'
import { useTracking } from './useTracking'

/*
 * Cart line actions shared by every cart surface: removal with an Undo toast (useCartRemoval),
 * and "Edit" for customized lines (reopens the product modal prefilled).
 */
export function useCartItemActions() {
    const cartStore = useCartStore()
    const localePath = useLocalePath()
    const { trackEvent } = useTracking()
    const cartItemEdit = useCartItemEdit()

    // One removal flow for every surface: the line goes, and a merged "removed, Undo" toast can restore it.
    const { removeLine: removeWithUndo } = useCartRemoval()

    const editItem = async (item: CartItem): Promise<void> => {
        cartItemEdit.value = { ...item }
        cartStore.setCartVisibility(false)
        trackEvent('cart_item_edit_opened', { product_id: item.product.id })
        await navigateTo({ path: localePath('/menu'), query: { product: item.product.id } })
    }

    return { removeWithUndo, editItem }
}
