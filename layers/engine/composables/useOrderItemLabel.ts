import { cartLineMeta, orderItemChoiceText, orderLineSegments } from '#engine/utils/orderItemLabel'
import { useAppConfig } from '#imports'

/**
 * How an order line (history, confirmation page) is labelled: the compact meta line, the name, the segments of the
 * name line and the choices. The brand decides whether the menu code shows (`brand.showProductCode`), exactly as on the cart surfaces.
 */
export function useOrderItemLabel() {
  const { showProductCode = false } = useAppConfig().brand

  type Item = Parameters<typeof orderLineSegments>[0]
  return {
    // Spaced ("E5 · Plateaux"): the line wraps at the separators like on the cart surfaces instead of breaking inside a word.
    orderItemMeta: (item: Item): string | undefined =>
      cartLineMeta(item, { showProductCode, spaced: true }),
    orderItemName: (item: Item): string => item.product.name,
    orderItemSegments: (item: Item) => orderLineSegments(item, showProductCode),
    orderItemChoice: (item: Item): string | undefined => orderItemChoiceText(item),
  }
}
