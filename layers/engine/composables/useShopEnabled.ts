import { isMenuOpen, isShopEnabledValue } from '#engine/utils/shopGate'
import { useAppConfig, useRuntimeConfig } from '#imports'

/**
 * Whether the online shop is open to visitors (`NUXT_PUBLIC_SHOP_ENABLED`, read at container start, see
 * utils/shopGate.ts). Fixed for the life of the process, so a plain boolean rather than a ref.
 */
export const useShopEnabled = (): boolean =>
  isShopEnabledValue(useRuntimeConfig().public.shopEnabled)

/** Whether /menu is reachable: with the shop on, or with it off for a brand with a static menu (utils/shopGate.ts). */
export const useMenuOpen = (): boolean =>
  isMenuOpen(useShopEnabled(), useAppConfig().brand.staticMenuWhenShopClosed)
