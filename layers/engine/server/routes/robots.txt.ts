import { brand } from '#brand/brand'
import { useRuntimeConfig } from '#imports'

const PRODUCTION_BASE_URL = `https://${brand.domain}`

export default defineEventHandler((event) => {
  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')

  // Same source as the sitemap and schema.org (public runtime config).
  // Baked at build time, overridable via NUXT_PUBLIC_BASE_URL.
  // Reading process.env.BASE_URL here depended on a runtime-only env var.
  const baseUrl = String(useRuntimeConfig(event).public.baseUrl ?? '').replace(/\/+$/u, '')
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
    'Disallow: /checkout',
    'Disallow: /*/checkout',
    // The trailing `$` keeps `/*/me` from also matching /fr/menu.
    'Disallow: /me$',
    'Disallow: /me/',
    'Disallow: /*/me$',
    'Disallow: /*/me/',
    'Disallow: /order-completed/',
    'Disallow: /*/order-completed/',
    '',
    `Sitemap: ${baseUrl}/sitemap.xml`,
    '',
  ].join('\n')
})
