import { createI18n } from 'vue-i18n'
import { describe, expect, it } from 'vite-plus/test'
import { frenchPlural } from './frenchPlural'

describe('frenchPlural', () => {
  it('two forms: 0 and 1 are singular, 2 and more are plural', () => {
    expect([0, 1, 2, 3, 100].map((n) => frenchPlural(n, 2))).toEqual([0, 0, 1, 1, 1])
  })

  it('two forms: the sign does not matter', () => {
    expect([-1, -2].map((n) => frenchPlural(n, 2))).toEqual([0, 1])
  })

  it('three forms: zero / one / many, as vue-i18n does by default', () => {
    expect([0, 1, 2, 7, -3].map((n) => frenchPlural(n, 3))).toEqual([0, 1, 2, 2, 2])
  })
})

describe('frenchPlural in vue-i18n', () => {
  const messages = {
    fr: { items: '{count} article | {count} articles', cart: 'aucun | {count} | {count} articles' },
    en: { items: '{count} item | {count} items', cart: 'none | {count} | {count} items' },
  }
  const i18n = createI18n<{ message: Record<string, string> }, 'fr' | 'en', false>({
    legacy: false,
    locale: 'fr',
    messages,
    pluralRules: { fr: frenchPlural },
  })
  const { t } = i18n.global

  it('says "0 article" in French, not "0 articles"', () => {
    expect(t('items', { count: 0 }, 0)).toBe('0 article')
    expect(t('items', { count: 1 }, 1)).toBe('1 article')
    expect(t('items', { count: 2 }, 2)).toBe('2 articles')
  })

  it('keeps the zero form of a three-form message', () => {
    expect(t('cart', { count: 0 }, 0)).toBe('aucun')
    expect(t('cart', { count: 1 }, 1)).toBe('1')
    expect(t('cart', { count: 5 }, 5)).toBe('5 articles')
  })

  it('leaves the other languages on the vue-i18n default (0 is plural in English)', () => {
    expect(t('items', { count: 0 }, { plural: 0, locale: 'en' })).toBe('0 items')
    expect(t('items', { count: 1 }, { plural: 1, locale: 'en' })).toBe('1 item')
  })
})
