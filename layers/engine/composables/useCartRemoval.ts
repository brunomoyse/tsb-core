import type { CartItem, Product, ProductChoice, ProductChoiceSelection } from '#engine/types'
import { type CartLineFocusOptions, useCartLineFocus } from '#engine/composables/useCartLineFocus'
import { REMOVAL_TOAST_GROUP, nextRemovalBatch, removalToastMessage } from '#engine/utils/cartRemoval'
import { matchesLine } from '#engine/utils/cartLines'
import { useCartStore } from '#engine/stores/cart'
import { useHaptics } from '#engine/composables/useHaptics'
import { useI18n } from 'vue-i18n'
import { useNotificationsStore } from '#engine/stores/notifications'
import { useTracking } from '#engine/composables/useTracking'

interface RemovedLine {
    product: Product
    choice: ProductChoice | null
    selections: ProductChoiceSelection[]
    quantity: number
}

/*
 * The lines whose removal toast is still alive, so one Undo can restore them all. Module scope on
 * purpose (not Pinia state): it only matters in the browser while a toast is on screen, and a
 * removal made on one cart surface must merge with one made a second earlier on another.
 */
let removedBatch: RemovedLine[] = []

/**
 * THE way a cart line leaves the cart, for every surface (drawer, side cart, /cart, checkout summary,
 * product card, quantity going down to 0): the line is removed, and an "X removed, Undo" toast offers
 * to put it back (audit finding M8: only /cart had it, the other surfaces dropped lines silently).
 * Removing several lines in a row keeps every Undo reachable: they merge into one toast (M19).
 *
 * A surface that lists the lines passes `focus` (see useCartLineFocus) so that removing a line with the keyboard
 * does not drop focus on <body>.
 */
export function useCartRemoval(focus?: CartLineFocusOptions) {
    const cartStore = useCartStore()
    const notifications = useNotificationsStore()
    const { t } = useI18n()
    const { impact } = useHaptics()
    const { trackEvent } = useTracking()

    const restore = (lines: RemovedLine[]): void => {
        for (const line of lines) {
            cartStore.addProduct(line.product, line.quantity, { choice: line.choice, selections: line.selections })
            trackEvent('product_removal_undone', { product_id: line.product.id, quantity: line.quantity })
        }
        impact('Light')
    }

    const removeLine = (item: CartItem): void => {
        const removed: RemovedLine = {
            product: item.product,
            choice: item.selectedChoice,
            selections: item.selectedChoices ?? [],
            quantity: item.quantity,
        }
        removedBatch = nextRemovalBatch(removedBatch, removed, notifications.hasGroup(REMOVAL_TOAST_GROUP))
        const restorable = [...removedBatch]

        cartStore.removeFromCart(item.product, { choice: item.selectedChoice, selections: item.selectedChoices, quantity: item.quantity })
        notifications.notify({
            message: removalToastMessage(restorable.length) === 'one'
                ? t('cart.removedUndo', { name: item.product.name })
                : t('cart.removedManyUndo', { count: restorable.length }),
            duration: 5000,
            variant: 'neutral',
            group: REMOVAL_TOAST_GROUP,
            action: { label: t('cart.undo'), handler: () => restore(restorable) },
        })
        impact('Medium')
        trackEvent('product_removed_from_cart', { product_id: item.product.id, product_name: item.product.name })
    }

    /** The "−" of a line: one unit less, and the last unit is a removal (with its Undo), never a silent drop. */
    const decrementLine = (item: CartItem): void => {
        if (item.quantity <= 1) {
            removeLine(item)
            return
        }
        cartStore.decrementQuantity(item.product, { choice: item.selectedChoice, selections: item.selectedChoices, quantity: item.quantity })
        impact('Light')
        trackEvent('product_quantity_decremented', { product_id: item.product.id, new_quantity: item.quantity })
    }

    /** The "−" of a product card: it steps the plain line (no choices) of that product. */
    const decrementProduct = (product: Product): void => {
        const line = cartStore.products.find((candidate: CartItem) => matchesLine(candidate, { productId: product.id, selections: [] }))
        if (line) decrementLine(line)
    }

    const { keepFocus } = useCartLineFocus(focus ?? { container: () => null, fallback: () => null })
    return {
        removeLine: (item: CartItem): void => { void keepFocus(() => removeLine(item)) },
        decrementLine: (item: CartItem): void => { void keepFocus(() => decrementLine(item)) },
        decrementProduct,
    }
}
