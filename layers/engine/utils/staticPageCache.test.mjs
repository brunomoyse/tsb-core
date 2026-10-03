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

test('preferredLocale orders by quality, then position, and ignores q=0', () => {
  const l = config.locales
  assert.equal(preferredLocale('en;q=0.5,fr;q=0.9', l), 'fr')
  assert.equal(preferredLocale('en,fr', l), 'en')
  assert.equal(preferredLocale('en;q=0,fr;q=0.1', l), 'fr')
  assert.equal(preferredLocale('zh-CN,zh;q=0.9', l), 'zh')
  assert.equal(preferredLocale('FR-be', l), 'fr')
  assert.equal(preferredLocale(undefined, l), null)
})

test('cookieValue finds a cookie by exact name', () => {
  assert.equal(cookieValue('i18n_redirected=nl', 'i18n_redirected'), 'nl')
  assert.equal(cookieValue('my_i18n_redirected=nl', 'i18n_redirected'), null)
  assert.equal(cookieValue(null, 'i18n_redirected'), null)
})
