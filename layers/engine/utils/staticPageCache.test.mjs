// The static-page cache only answers requests the language module would not redirect (audit PR 6.1, P10).
// Run: `vp test run layers/engine/utils/staticPageCache.test.mjs`.

import {
  cacheableLocale,
  cookieValue,
  preferredLocale,
  staticPageLocale,
} from './staticPageCache.ts'
import assert from 'node:assert/strict'
import { test } from 'vite-plus/test'

const config = {
  locales: ['fr', 'en', 'nl', 'zh'],
  pages: ['terms', 'privacy', 'about'],
  cookie: 'i18n_redirected',
}
const hit = (req) => cacheableLocale({ pathname: '/fr/terms', ...req }, config)

test('only the listed pages of a known locale are cacheable paths', () => {
  assert.equal(staticPageLocale('/fr/terms', config), 'fr')
  assert.equal(staticPageLocale('/zh/about', config), 'zh')
  for (const path of ['/terms', '/xx/terms', '/fr/menu', '/fr/terms/', '/fr/terms/x', '/fr', '/']) {
    assert.equal(staticPageLocale(path, config), null, path)
  }
})

test('a request with no cookie and no Accept-Language cannot redirect: cacheable', () => {
  assert.equal(hit({}), 'fr')
  assert.equal(hit({ acceptLanguage: '' }), 'fr')
  assert.equal(hit({ cookie: 'a=b; c=d' }), 'fr')
})

test('the language cookie decides when there is one', () => {
  assert.equal(hit({ cookie: 'i18n_redirected=fr' }), 'fr')
  assert.equal(hit({ cookie: 'x=1; i18n_redirected=fr; y=2' }), 'fr')
  assert.equal(hit({ cookie: 'i18n_redirected=en' }), null)
  assert.equal(hit({ cookie: 'i18n_redirected=' }), null)
  assert.equal(hit({ cookie: 'i18n_redirected=xx' }), null)
  // The cookie wins over Accept-Language, as it does in the language module.
  assert.equal(hit({ cookie: 'i18n_redirected=fr', acceptLanguage: 'en' }), 'fr')
  assert.equal(hit({ cookie: 'i18n_redirected=en', acceptLanguage: 'fr' }), null)
})

test('without a cookie the first supported language of Accept-Language decides', () => {
  assert.equal(hit({ acceptLanguage: 'fr-BE,fr;q=0.9,en;q=0.8' }), 'fr')
  assert.equal(hit({ acceptLanguage: 'en-US,en;q=0.9,fr;q=0.8' }), null)
  assert.equal(hit({ acceptLanguage: 'de,fr;q=0.5' }), 'fr')
  assert.equal(hit({ acceptLanguage: 'nl-BE' }), null)
  assert.equal(hit({ acceptLanguage: 'de-DE,de;q=0.9' }), null)
  assert.equal(hit({ acceptLanguage: '*' }), null)
})

test('preferredLocale does what @nuxtjs/i18n does: header order, quality ignored, nothing trimmed', () => {
  const l = config.locales
  assert.equal(preferredLocale('en,fr', l), 'en')
  assert.equal(preferredLocale('zh-CN,zh;q=0.9', l), 'zh')
  assert.equal(preferredLocale('FR-be', l), 'fr')
  assert.equal(preferredLocale(undefined, l), null)
  // The module cuts at ";" and never reads q: the first tag decides, even with a lower quality than a later one.
  assert.equal(preferredLocale('en;q=0.5,fr;q=0.9', l), 'en')
  assert.equal(preferredLocale('en;q=0,fr', l), 'en')
  // Nothing is trimmed: " fr" is not "fr" for the module, so English is the only language it sees.
  assert.equal(preferredLocale('en;q=0.1, fr', l), 'en')
  assert.equal(preferredLocale('de, fr', l), null)
  assert.equal(preferredLocale('de,fr', l), 'fr')
  assert.equal(preferredLocale(' ,*,,fr', l), 'fr')
  assert.equal(preferredLocale(' ,*,, fr', l), null)
})

test('the cache leaves to the live render what the module would redirect (q values, spaces)', () => {
  // On /fr/terms the module sends these visitors to /en/terms, so none of them may be answered from the cache.
  for (const acceptLanguage of [
    'en;q=0.5,fr;q=0.9',
    'en;q=0,fr',
    'en;q=0.1, fr',
    'en-US;q=0.1,fr',
  ]) {
    assert.equal(hit({ acceptLanguage }), null, acceptLanguage)
  }
  // And a header whose first usable tag is French is a hit, whatever the q of the later ones.
  assert.equal(hit({ acceptLanguage: 'fr;q=0.1,en;q=0.9' }), 'fr')
})

// The module's own detection (the `header` detector of runtime/shared/detection.js), imported from node_modules: the
// Functions are pure. When a module upgrade changes the algorithm this test fails and preferredLocale must follow.
test('preferredLocale agrees with the installed @nuxtjs/i18n on generated Accept-Language headers', async () => {
  const { findBrowserLocale } =
    await import('../../../node_modules/@nuxtjs/i18n/dist/runtime/kit/browser.js')
  const { parseAcceptLanguage } = await import('@intlify/utils')
  const normalized = [
    { code: 'fr', language: 'fr-BE' },
    { code: 'en', language: 'en' },
    { code: 'zh', language: 'zh-CN' },
    { code: 'nl', language: 'nl-BE' },
  ]
  const tags = [
    'fr',
    'fr-BE',
    'FR-ca',
    'en',
    'en-US',
    'zh-CN',
    'zh',
    'nl-BE',
    'nl',
    'de',
    'de-DE',
    'es',
    '*',
    '',
    ' fr',
    ' en',
  ]
  const params = ['', ';q=0.9', ';q=0.1', ';q=0', '; q=0.5']
  let seed = 7
  const rand = (n) => (seed = (seed * 1103515245 + 12345) % 2147483648) % n
  for (let i = 0; i < 3000; i++) {
    const header = Array.from(
      { length: 1 + rand(4) },
      () => tags[rand(tags.length)] + params[rand(params.length)],
    ).join(rand(2) ? ',' : ', ')
    const expected = findBrowserLocale(normalized, parseAcceptLanguage(header)) || null
    assert.equal(preferredLocale(header, config.locales), expected, header)
  }
})

test('cookieValue finds a cookie by exact name', () => {
  assert.equal(cookieValue('i18n_redirected=nl', 'i18n_redirected'), 'nl')
  assert.equal(cookieValue('my_i18n_redirected=nl', 'i18n_redirected'), null)
  assert.equal(cookieValue(null, 'i18n_redirected'), null)
})
