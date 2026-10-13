import { brand } from '#brand/brand'
import { isShopEnabledValue } from '../../utils/shopGate'
import { useRuntimeConfig } from '#imports'

const PRODUCTION_BASE_URL = `https://${brand.domain}`

export default defineEventHandler((event) => {
  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')

  // Same source as the sitemap and schema.org (public runtime config).
  // Baked at build time, overridable via NUXT_PUBLIC_BASE_URL.
  // Reading process.env.BASE_URL here depended on a runtime-only env var.
  const config = useRuntimeConfig(event).public
  const baseUrl = (config.baseUrl ?? '').replace(/\/+$/u, '')
  const isProduction = baseUrl === PRODUCTION_BASE_URL

  if (!isProduction) {
    return 'User-agent: *\nDisallow: /\n'
  }

  // Disallow paths must stay aligned with `sitemap.exclude` in nuxt.config.ts.
  // Routes are locale-prefixed (/fr/checkout, /en/me, ...).
  // So each private path is listed with a `/*/` locale wildcard and unprefixed.
  // Login and logout live under /auth/.
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /auth/',
    'Disallow: /*/auth/',
    'Disallow: /cart',
    'Disallow: /*/cart',
    'Disallow: /checkout',
    'Disallow: /*/checkout',
    // The trailing `$` keeps `/*/me` from also matching /fr/menu.
    'Disallow: /me$',
    'Disallow: /me/',
    'Disallow: /*/me$',
    'Disallow: /*/me/',
    'Disallow: /order-completed/',
    'Disallow: /*/order-completed/',
    // The shop switched off (NUXT_PUBLIC_SHOP_ENABLED=false): the menu redirects home, keep it out as well.
    ...(isShopEnabledValue(config.shopEnabled) ? [] : ['Disallow: /menu', 'Disallow: /*/menu']),
    '',
    // The index itself: /sitemap.xml is only an HTML page that refreshes to it (one sitemap per language).
    `Sitemap: ${baseUrl}/sitemap_index.xml`,
    '',
  ].join('\n')
})
