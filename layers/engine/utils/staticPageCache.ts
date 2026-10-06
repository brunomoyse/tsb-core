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

/**
 * Set by the application on a render made for the cache whose restaurant config could not be fetched (the API was down):
 * the HTML has no opening hours, so the cache must not keep it for the next visitors. The cache removes it from the
 * response it replays.
 */
export const STATIC_PAGE_SKIP_HEADER = 'x-static-page-cache-skip'

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
  return locale !== undefined &&
    page !== undefined &&
    locales.includes(locale) &&
    pages.includes(page)
    ? locale
    : null
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
 * The language @nuxtjs/i18n 10.6 detects from an Accept-Language header (`header` detector -> parseAcceptLanguage +
 * findBrowserLocale): a locale code, `null` when the header names no language of ours (or is absent). It is NOT the RFC
 * 9110 algorithm and this mirrors the module on purpose, quirks included, because the cache must decide exactly as the
 * module does (a different answer either serves a page the module would have redirected, or misses for nothing):
 *  - the header is split on `,`, each part cut at the first `;` (so quality values are ignored: `en;q=0.1,fr` is
 *    English, `en;q=0,fr` too), `*` and empty parts dropped, nothing trimmed (`en, fr` is `en` and ` fr`, and ` fr`
 *    matches nothing);
 *  - the first tag, in header order, whose primary subtag (`fr` of `fr-BE`, case-insensitive) is a supported language wins.
 * layers/engine/utils/staticPageCache.test.mjs compares it with the module's own functions on generated headers.
 */
export function preferredLocale(
  header: string | null | undefined,
  locales: string[],
): string | null {
  const tags = (header ?? '')
    .split(',')
    .map((tag) => tag.replace(/;.*$/su, '')) // Cut at the first `;`
    .filter((tag) => tag !== '*' && tag !== '')
  for (const tag of tags) {
    const primary = tag.replace(/-.*$/su, '').toLowerCase()
    const locale = locales.find((code) => code.toLowerCase() === primary)
    if (locale !== undefined && locale !== '') return locale
  }
  return null
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
  if (locale === null || locale === '') return null
  const cookie = cookieValue(req.cookie, config.cookie)
  if (cookie !== null) return cookie === locale ? locale : null
  const acceptLanguage = req.acceptLanguage?.trim()
  if (acceptLanguage === undefined || acceptLanguage === '') return locale
  return preferredLocale(req.acceptLanguage, config.locales) === locale ? locale : null
}
