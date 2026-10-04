import { describe, expect, it } from 'vite-plus/test'
import { cacheableLocale, cookieValue, preferredLocale } from './staticPageCache'

const config = { locales: ['fr', 'en', 'nl', 'zh'], pages: ['terms'], cookie: 'i18n_redirected' }

describe('headers that are absent', () => {
  it('no Accept-Language names no language; no Cookie header has no cookie', () => {
    expect(preferredLocale(null, config.locales)).toBeNull()
    expect(preferredLocale(undefined, config.locales)).toBeNull()
    expect(preferredLocale('', config.locales)).toBeNull()
    expect(cookieValue(null, 'a')).toBeNull()
    expect(cookieValue(undefined, 'a')).toBeNull()
  })
})

describe('cacheableLocale', () => {
  const req = (extra: Record<string, string | null> = {}) => ({ pathname: '/fr/terms', ...extra })

  it('a request with neither cookie nor Accept-Language (a crawler) is served from the cache', () => {
    expect(cacheableLocale(req(), config)).toBe('fr')
    expect(cacheableLocale(req({ acceptLanguage: '   ' }), config)).toBe('fr')
  })

  it('an Accept-Language whose first supported language is the page language is served from the cache', () => {
    expect(cacheableLocale(req({ acceptLanguage: 'fr-BE,en;q=0.8' }), config)).toBe('fr')
    expect(cacheableLocale(req({ acceptLanguage: 'en,fr' }), config)).toBeNull()
    expect(cacheableLocale(req({ acceptLanguage: 'de,*' }), config)).toBeNull()
  })

  it('the cookie decides when there is one', () => {
    expect(cacheableLocale(req({ cookie: 'x=1; i18n_redirected=fr' }), config)).toBe('fr')
    expect(
      cacheableLocale(req({ cookie: 'i18n_redirected=en', acceptLanguage: 'fr' }), config),
    ).toBeNull()
  })

  it('a page that is not cacheable is never served from the cache', () => {
    expect(cacheableLocale({ pathname: '/fr/menu' }, config)).toBeNull()
  })
})
