import type { CartItem } from '#engine/types'
import { formatCents } from '#engine/lib/price'
import { useAnnouncer } from '#engine/composables/useAnnouncer'
import { useCartStore } from '#engine/stores/cart'
import { useI18n } from 'vue-i18n'

/*
 * Says what the cart did, for every surface at once (audit PR 3.6, A7): the cards, the product modal, the bowl
 * composer, the stepper of the side cart, the mobile sheet and /cart all go through the same store actions, so
 * one subscription covers them and no component needs its own live region.
 *
 *  - a unit was ADDED (new line, or an add from a modal merging into an existing line):
 *      "{name} added to cart, {count} items, total {total}"
 *  - the quantity of a line changed (a stepper "+" or "−"):  "{name}, quantity {n}"
 *  - a line went away: the removal toast (with its Undo) is already announced by <ToastAnnouncer>, so nothing is said twice.
 *
 * The total is the basket's subtotal in cents (what every surface shows as "Subtotal"): it is known the moment
 * the action ends, while delivery and the online fee depend on a server quote.
 */
export function useCartAnnouncements(): void {
  const cartStore = useCartStore()
  const { announce } = useAnnouncer()
  const { t } = useI18n()

  cartStore.$onAction(
    ({ name, after }: { name: string; after: (callback: () => void) => void }) => {
      if (name !== 'addProduct' && name !== 'incrementQuantity' && name !== 'decrementQuantity')
        return
      const before = new Map<CartItem, number>(
        cartStore.products.map((item: CartItem): [CartItem, number] => [item, item.quantity]),
      )
      after(() => {
        // Lines are mutated in place by the store, so identity tells a changed line from a new one.
        const changed = cartStore.products.find(
          (item: CartItem) => before.get(item) !== item.quantity,
        )
        if (!changed) return
        const isNewLine = !before.has(changed)
        const grew = isNewLine || changed.quantity > (before.get(changed) ?? 0)
        const added = grew && (isNewLine || name === 'addProduct')
        const count = cartStore.totalItems
        announce(
          added
            ? t(
                'cart.announce.added',
                { name: changed.product.name, count, total: formatCents(cartStore.subtotalCents) },
                count,
              )
            : t('cart.announce.quantity', {
                name: changed.product.name,
                quantity: changed.quantity,
              }),
        )
      })
    },
  )
}
