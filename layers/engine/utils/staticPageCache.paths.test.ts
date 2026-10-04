// cacheableLocale on paths that are not static pages at all (the middleware has already filtered them, but the rule must not
// depend on that). The rest of the cache rules are in staticPageCache.test.mjs.
// Run: `vp test run layers/engine/utils/staticPageCache.paths.test.ts`.
import { describe, expect, it } from 'vite-plus/test'
import { cacheableLocale } from './staticPageCache.ts'

const config = { locales: ['fr', 'en'], pages: ['terms'], cookie: 'i18n_redirected' }

describe('cacheableLocale', () => {
  it.each([
    ['a page that is not listed', '/fr/menu'],
    ['a locale we do not have', '/de/terms'],
    ['the root', '/'],
    ['a trailing slash', '/fr/terms/'],
  ])('is null for %s, whatever the cookie says', (_label, pathname) => {
    expect(cacheableLocale({ pathname }, config)).toBeNull()
    expect(cacheableLocale({ pathname, cookie: 'i18n_redirected=fr' }, config)).toBeNull()
  })

  it('is the locale of a listed page', () => {
    expect(cacheableLocale({ pathname: '/en/terms' }, config)).toBe('en')
  })
})
