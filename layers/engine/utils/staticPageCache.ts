/*
 * Which requests the static-page cache (server/middleware/static-page-cache.ts) may answer from memory (audit PR 6.1, P10).
 *
 * The pages it covers (terms, privacy, faq, ...) are the same for everybody, so one render per locale is shared. The one
 * thing that is not the same for everybody is the language redirect: with `detectBrowserLanguage.redirectOn: 'all'` a
 * visitor whose `i18n_redirected` cookie (or, without a cookie, Accept-Language) names another language than the one in
 * the URL is sent to the page in his language, and the cached render is made WITHOUT the visitor's cookie and
 * Accept-Language, so it never redirects. A request is therefore served from the cache only when the language module
 * would not have redirected it; every other request (and anything this file cannot tell) goes to the live render, which
 * redirects exactly as before.
 *
 * Pure (no Nuxt imports) so it is unit-tested with node: layers/engine/utils/staticPageCache.test.mjs.
 */

/** Sent by the cache on the render it asks for itself: the server then knows its HTML may be replayed to later visitors. */
export const STATIC_PAGE_FILL_HEADER = 'x-static-page-cache-fill'

export interface StaticPageCacheConfig {
  /** Locale codes of the `strategy: 'prefix'` routes (`/fr/...`). */
  locales: string[]
  /** Page paths without the locale prefix: `terms` is cached as `/fr/terms`, `/en/terms`, ... */
  pages: string[]
  /** The language module's cookie (`detectBrowserLanguage.cookieKey`). */
  cookie: string
}

export interface StaticPageRequest {
  pathname: string
  /** The raw `Cookie` request header. */
  cookie?: string | null
  /** The raw `Accept-Language` request header. */
  acceptLanguage?: string | null
}

/** "/fr/terms" is a cacheable page of the `fr` locale; anything else (other path, trailing slash, query) is not. */
export function staticPageLocale(
  pathname: string,
  { locales, pages }: Pick<StaticPageCacheConfig, 'locales' | 'pages'>,
): string | null {
  const match = /^\/(?<locale>[^/]+)\/(?<page>[^/]+)$/u.exec(pathname)
  const { locale, page } = match?.groups ?? {}
  return locale && page && locales.includes(locale) && pages.includes(page) ? locale : null
}

/** The value of one cookie of a `Cookie` header, or null. */
export function cookieValue(header: string | null | undefined, name: string): string | null {
  for (const part of (header ?? '').split(';')) {
    const eq = part.indexOf('=')
    if (eq > 0 && part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim()
  }
  return null
}

/**
 * The first supported language of an Accept-Language header, by quality then by position: a locale code, `null` when the
 * header names no language of ours (or is absent).
 */
export function preferredLocale(
  header: string | null | undefined,
  locales: string[],
): string | null {
  const tags = (header ?? '')
    .split(',')
    .map((part, position) => {
      const [tag = '', ...params] = part.trim().split(';')
      const q = params.map((p) => /^\s*q\s*=\s*(?<q>[\d.]+)\s*$/iu.exec(p)?.groups?.q).find(Boolean)
      return {
        primary: (tag.trim().split('-')[0] ?? '').toLowerCase(),
        q: q ? Number(q) : 1,
        position,
      }
    })
    .filter((t) => t.primary && t.q > 0)
    .toSorted((a, b) => b.q - a.q || a.position - b.position)
  return tags.map((t) => t.primary).find((primary) => locales.includes(primary)) ?? null
}

/**
 * The locale of the page when this request may be served from the cache, else null.
 *  - a cookie names a language: only when it is the page's own (any other value, valid or not, may redirect);
 *  - no cookie, no Accept-Language: nothing to detect, no redirect (a crawler, a first request without headers);
 *  - no cookie, Accept-Language: only when its first language we support is the page's own. A header that names
 *    only languages we do not have is left to the live render, which decides what to do with it.
 */
export function cacheableLocale(
  req: StaticPageRequest,
  config: StaticPageCacheConfig,
): string | null {
  const locale = staticPageLocale(req.pathname, config)
  if (!locale) return null
  const cookie = cookieValue(req.cookie, config.cookie)
  if (cookie !== null) return cookie === locale ? locale : null
  if (!req.acceptLanguage?.trim()) return locale
  return preferredLocale(req.acceptLanguage, config.locales) === locale ? locale : null
}
