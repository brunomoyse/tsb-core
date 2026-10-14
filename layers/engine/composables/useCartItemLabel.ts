import { cartLineChoiceText, cartLineMeta } from '#engine/utils/orderItemLabel'
import type { CartItem, CartLinePresentation, CartLinePresenter } from '#engine/types'
import { useAppConfig, useNuxtApp } from '#imports'
import { cartLineKey } from '#engine/utils/cartLines'
import { useI18n } from 'vue-i18n'

declare module '#app' {
  interface NuxtApp {
    /** A brand's own look for some cart lines (provided by a brand plugin); absent for a brand without one. */
    $cartLinePresenter?: CartLinePresenter
  }
}

/**
 * How a cart line is labelled on every cart surface (cart page, drawers, checkout summary): the small meta line
 * (category, plus the menu code when `brand.showProductCode`), the name, the choices and the line key.
 * `pieces: true` is the cart page's long form, which also says how many pieces the dish has.
 * `itemPresentation` is the brand's own look for a line (its photo, a summary, the detail), or null for the default.
 */
export function useCartItemLabel(options: { pieces?: boolean } = {}) {
  const { t } = useI18n()
  const { showProductCode = false } = useAppConfig().brand
  const presenter = useNuxtApp().$cartLinePresenter

  return {
    // Resolved on each call so a language switch is picked up.
    itemLabelMeta: (item: CartItem): string | undefined =>
      cartLineMeta(item, {
        showProductCode,
        spaced: true,
        pieces: options.pieces === true ? { one: t('menu.pc'), many: t('menu.pcs') } : undefined,
      }),
    itemLabelName: (item: CartItem): string => item.product.name,
    itemChoice: (item: CartItem): string | undefined => cartLineChoiceText(item),
    getItemKey: (item: CartItem): string => cartLineKey(item),
    itemPresentation: (item: CartItem): CartLinePresentation | null => presenter?.(item) ?? null,
  }
}
