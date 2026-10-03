import { navigateTo, useCartStore, useLocalePath } from '#imports'
import type { CartItem } from '#engine/types'
import { useCartItemEdit } from './useCartItemEdit'
import { type CartLineFocusOptions } from './useCartLineFocus'
import { useCartRemoval } from './useCartRemoval'
import { useTracking } from './useTracking'

/*
 * Cart line actions shared by every cart surface: removal with an Undo toast (useCartRemoval),
 * and "Edit" for customized lines (reopens the product modal prefilled). A surface that lists the lines passes `focus`
 * (see useCartLineFocus) so that removing a line with the keyboard does not drop focus on <body>.
 */
export function useCartItemActions(focus?: CartLineFocusOptions) {
  const cartStore = useCartStore()
  const localePath = useLocalePath()
  const { trackEvent } = useTracking()
  const cartItemEdit = useCartItemEdit()

  // One removal flow for every surface: the line goes, and a merged "removed, Undo" toast can restore it.
  const { removeLine: removeWithUndo } = useCartRemoval(focus)

  const editItem = async (item: CartItem): Promise<void> => {
    cartItemEdit.value = { ...item }
    cartStore.setCartVisibility(false)
    trackEvent('cart_item_edit_opened', { product_id: item.product.id })
    await navigateTo({ path: localePath('/menu'), query: { product: item.product.id } })
  }

  return { removeWithUndo, editItem }
}
