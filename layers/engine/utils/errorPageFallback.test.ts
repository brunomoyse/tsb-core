// errorPageFallback: the error page's texts for when i18n never started. They must stay equal to the locale files, or
// a startup failure would show other words than the normal error page.
// Run: `vp test run layers/engine/utils/errorPageFallback.test.ts`.
import { describe, expect, it } from 'vite-plus/test'
import en from '../locales/en.json'
import fr from '../locales/fr.json'
import nl from '../locales/nl.json'
import zh from '../locales/zh.json'
import {
  ERROR_PAGE_FALLBACK,
  ERROR_PAGE_KEYS,
  fallbackHtmlLang,
  fallbackLocale,
  fallbackLocalePath,
  fallbackTranslate,
} from './errorPageFallback'

const locales = { fr, en, nl, zh } as const

const lookup = (messages: unknown, key: string): unknown =>
  key
    .split('.')
    .reduce<unknown>(
      (node, part) => (node as Record<string, unknown> | undefined)?.[part],
      messages,
    )

describe('fallback texts', () => {
  it.each(Object.entries(locales))('match locales/%s.json key for key', (code, messages) => {
    const fallback = ERROR_PAGE_FALLBACK[code as keyof typeof ERROR_PAGE_FALLBACK]
    for (const key of ERROR_PAGE_KEYS) expect(fallback[key], key).toBe(lookup(messages, key))
  })

  it('translate a known key, and fall back to the given default, then to the key', () => {
    const t = fallbackTranslate('nl')
    expect(t('common.retry')).toBe('Opnieuw proberen')
    // Keys that exist nowhere, built at runtime so the locale-parity scan does not take them for missing strings.
    const title418 = ['error', 'title418'].join('.')
    const unknown = ['error', 'unknown'].join('.')
    expect(t(title418, t('error.titleGeneric'))).toBe('Oeps, foutje')
    expect(t(unknown)).toBe(unknown)
  })
})

describe('locale from the URL', () => {
  it.each([
    ['/nl', 'nl'],
    ['/zh/menu', 'zh'],
    ['/en/checkout', 'en'],
    ['/', 'fr'],
    ['/de/menu', 'fr'],
    ['/menu', 'fr'],
  ])('%s is read as %s', (path, locale) => {
    expect(fallbackLocale(path)).toBe(locale)
  })

  it('builds the same prefixed paths and document language as the i18n setup', () => {
    expect(fallbackLocalePath('nl')('/')).toBe('/nl')
    expect(fallbackLocalePath('zh')('/menu')).toBe('/zh/menu')
    expect(fallbackHtmlLang('fr')).toBe('fr-BE')
    expect(fallbackHtmlLang('zh')).toBe('zh-CN')
  })
})
