import type { Product } from '../types/index.ts'

/*
 * The row at the top of the menu (components/menu/MenuPicksRow.vue): the customer's own products, or the most ordered
 * ones for everyone else. Pure: the composable (useMenuPicks.ts) loads the counts, this decides.
 *
 *   - A customer whose past orders still give MENU_PICKS_MIN products on sale sees them, most often ordered first:
 *     "Vos favoris" once one of them was ordered twice, "Déjà commandés" before that. On the shop's data, 85% of
 *     second orders and over 90% of later ones repeat a product ordered before (2026-10).
 *   - Everyone else, and a customer with too few of their products left, sees "Les plus commandés".
 *   - Too few of either: no row.
 *
 * Only products of the menu as it is now are shown (the server already leaves out the ones off sale, the menu's live
 * updates may have taken more away since).
 */

/** How often a product was ordered, as `myOrderedProducts` and `popularProducts` send it. */
export interface ProductOrderCount {
  productId: string
  orderCount: number
}

export type MenuPicksKind = 'favorites' | 'ordered' | 'popular'

export interface MenuPicks {
  kind: MenuPicksKind
  products: Product[]
}

/** Fewer than this and the row is not worth the space it takes above the menu. */
export const MENU_PICKS_MIN = 2
export const MENU_PICKS_MAX = 8

/** The counted products found on the menu and on sale, in the counts' order, at most `max`. */
export const matchMenuProducts = (
  counts: readonly ProductOrderCount[],
  products: readonly Product[],
  max = MENU_PICKS_MAX,
): { product: Product; orderCount: number }[] => {
  const byId = new Map(products.map((p) => [p.id, p]))
  return counts
    .flatMap(({ productId, orderCount }) => {
      const product = byId.get(productId)
      return product?.isAvailable === true ? [{ product, orderCount }] : []
    })
    .slice(0, max)
}

export const pickMenuRow = ({
  mine,
  popular,
  products,
}: {
  /** The signed-in customer's products, null when nobody is signed in or they are not loaded (yet). */
  mine: readonly ProductOrderCount[] | null
  popular: readonly ProductOrderCount[]
  products: readonly Product[]
}): MenuPicks | null => {
  const own = matchMenuProducts(mine ?? [], products)
  if (own.length >= MENU_PICKS_MIN) {
    return {
      kind: own.some((p) => p.orderCount >= 2) ? 'favorites' : 'ordered',
      products: own.map((p) => p.product),
    }
  }
  const top = matchMenuProducts(popular, products)
  if (top.length >= MENU_PICKS_MIN) return { kind: 'popular', products: top.map((p) => p.product) }
  return null
}
