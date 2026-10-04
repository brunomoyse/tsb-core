// formatCents / formatPrice: the display edge of the money pipeline. The active i18n locale comes from the Nuxt app
// (mocked boundary: reactive locale, no app, or an app lookup that throws).
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'

type App = { $i18n?: { locale?: { value?: string } } } | undefined
const state = vi.hoisted(() => ({
  app: undefined as unknown,
  throws: false,
}))
vi.mock('#app', () => ({
  tryUseNuxtApp: () => {
    if (state.throws) throw new Error('no context')
    return state.app as App
  },
}))

const { formatCents, formatPrice } = await import('./price')
const plain = (s: string) => s.replaceAll(/\s/gu, ' ')

beforeEach(() => {
  state.app = undefined
  state.throws = false
})

describe('formatCents', () => {
  it('formats integer cents in the locale of the app', () => {
    state.app = { $i18n: { locale: { value: 'fr' } } }
    expect(plain(formatCents(2415))).toBe('24,15 €')
    state.app = { $i18n: { locale: { value: 'en' } } }
    expect(plain(formatCents(2415))).toBe('€24.15')
    state.app = { $i18n: { locale: { value: 'nl' } } }
    expect(plain(formatCents(2415))).toBe('€ 24,15')
  })

  it('uses the default locale (French) outside a Nuxt context', () => {
    expect(plain(formatCents(2415))).toBe('24,15 €')
  })

  it('uses the default locale when the app has no i18n yet', () => {
    state.app = {}
    expect(plain(formatCents(5))).toBe('0,05 €')
  })

  it('uses the default locale when looking the app up throws', () => {
    state.throws = true
    expect(plain(formatCents(100))).toBe('1,00 €')
  })
})

describe('formatPrice', () => {
  it('parses an API decimal (string or number) to cents first', () => {
    state.app = { $i18n: { locale: { value: 'fr' } } }
    expect(plain(formatPrice('24.15'))).toBe('24,15 €')
    expect(plain(formatPrice(8.9))).toBe('8,90 €')
    expect(plain(formatPrice('0'))).toBe('0,00 €')
  })
})
