import { cartLineChoiceText, cartLineMeta } from '#engine/utils/orderItemLabel'
import type { CartItem } from '#engine/types'
import { useAppConfig } from '#imports'
import { cartLineKey } from '#engine/utils/cartLines'
import { useI18n } from 'vue-i18n'

/**
 * How a cart line is labelled on every cart surface (cart page, drawers, checkout summary): the small meta line
 * (category, plus the menu code when `brand.showProductCode`), the name, the choices and the line key.
 * `pieces: true` is the cart page's long form, which also says how many pieces the dish has.
 */
export function useCartItemLabel(options: { pieces?: boolean } = {}) {
  const { t } = useI18n()
  const { showProductCode = false } = useAppConfig().brand

  return {
    // Resolved on each call so a language switch is picked up.
    itemLabelMeta: (item: CartItem): string | undefined =>
      cartLineMeta(item, {
        showProductCode,
        spaced: true,
        pieces: options.pieces ? { one: t('menu.pc'), many: t('menu.pcs') } : undefined,
      }),
    itemLabelName: (item: CartItem): string => item.product.name,
    itemChoice: (item: CartItem): string | undefined => cartLineChoiceText(item),
    getItemKey: (item: CartItem): string => cartLineKey(item),
  }
}
