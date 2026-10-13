/*
 * The shop (menu, cart, checkout, order pages, account) can be switched off at container start, before a brand opens
 * for online orders: `NUXT_PUBLIC_SHOP_ENABLED=false` (public runtime config, no rebuild). Its routes then redirect to
 * the home page and the brand UI hides every link to them; the info and legal pages stay up. The /auth pages stay up
 * too: they are Zitadel's login UI, which the staff dashboard signs in through.
 *
 * A brand with `staticMenuWhenShopClosed` keeps /menu up while the shop is off: its menu page then shows a static,
 * order-free menu (the brand's own component) and the dynamic one comes back with the shop.
 */

/** First path segment (after the language prefix) of every shop route. */
export const SHOP_ROUTE_SEGMENTS: readonly string[] = [
  'menu',
  'cart',
  'checkout',
  'order-completed',
  'me',
]

/**
 * Off only for an explicit false: an unset value keeps the shop on, so every deployment that never heard of the flag
 * is unchanged. Nitro turns the env value into a boolean, but a config given as text must work too.
 */
export const isShopEnabledValue = (value: unknown): boolean =>
  !['false', '0', 'off'].includes(String(value).trim().toLowerCase())

/** Whether /menu stays reachable: always with the shop on, and with it off for a brand that has a static menu. */
export const isMenuOpen = (
  shopEnabled: boolean,
  staticMenuWhenShopClosed: boolean | undefined,
): boolean => shopEnabled || staticMenuWhenShopClosed === true

export interface ShopGateOptions {
  /** The brand shows a static menu while the shop is off: /menu is not gated. */
  keepMenu?: boolean
}

const gatedSegments = ({ keepMenu = false }: ShopGateOptions): readonly string[] =>
  keepMenu ? SHOP_ROUTE_SEGMENTS.filter((segment) => segment !== 'menu') : SHOP_ROUTE_SEGMENTS

const segmentsOf = (path: string): string[] =>
  (path.split(/[?#]/u)[0] ?? '').split('/').filter((segment) => segment !== '')

/**
 * Where a shop route goes while the shop is off: the home page of its language (`/fr/menu` → `/fr`), or `/` for an
 * unprefixed path. Null for any other path. No language list is needed: no language code is also a shop segment, so
 * the shop segment is either the first segment (unprefixed) or the second (after the language).
 */
export const shopGateRedirect = (path: string, options: ShopGateOptions = {}): string | null => {
  const gated = gatedSegments(options)
  const [first, second] = segmentsOf(path)
  if (first === undefined) return null
  if (gated.includes(first)) return '/'
  if (second !== undefined && gated.includes(second)) return `/${first}`
  return null
}

/** True for a URL (absolute or a path) that leads into the shop. */
export const isShopUrl = (url: string, options: ShopGateOptions = {}): boolean => {
  const path = url.replace(/^[a-z][a-z\d+.-]*:\/\/[^/]+/iu, '')
  return shopGateRedirect(path, options) !== null
}
