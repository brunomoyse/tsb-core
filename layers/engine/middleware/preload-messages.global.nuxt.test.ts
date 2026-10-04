// Global route middleware: on the server render it links the page's language file (a hashed static JSON) in the HTML head
// So the browser fetches it while the HTML is parsed. useHead is the boundary; the runtime config is the real one.
// Run: `vp test run layers/engine/middleware/preload-messages.global.nuxt.test.ts`.
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import type { RouteLocationNormalized } from 'vue-router'
import { useRuntimeConfig } from '#imports'
import { setFlags } from '../../../test/flags'

const useHead = vi.hoisted(() => vi.fn())
mockNuxtImport('useHead', () => useHead)

const { default: preloadMessages } = await import('./preload-messages.global')

const run = (path: string) =>
  (preloadMessages as unknown as (to: RouteLocationNormalized) => unknown)({
    path,
  } as unknown as RouteLocationNormalized)

const messageUrls = () =>
  useRuntimeConfig() as unknown as { tsbI18nMessageUrls: Record<string, string> }
let original: Record<string, string>

beforeEach(() => {
  vi.resetAllMocks()
  const config = messageUrls()
  original = config.tsbI18nMessageUrls
  config.tsbI18nMessageUrls = { fr: '/_i18n/fr.1a2b.json', nl: '/_i18n/nl.3c4d.json' }
})

afterEach(() => {
  messageUrls().tsbI18nMessageUrls = original
})

describe('during the server render', () => {
  beforeEach(() => {
    setFlags({ server: true })
  })

  it("preloads the language file of the page's language with a CORS-mode fetch hint", () => {
    run('/nl/menu')
    expect(useHead).toHaveBeenCalledExactlyOnceWith({
      link: [
        {
          key: 'i18n-messages',
          rel: 'preload',
          as: 'fetch',
          href: '/_i18n/nl.3c4d.json',
          crossorigin: 'anonymous',
        },
      ],
    })
  })

  it('preloads from the language segment alone, whatever the rest of the path', () => {
    run('/fr')
    run('/fr/me/orders/123')
    expect(useHead.mock.calls.map((call) => call[0].link[0].href)).toEqual([
      '/_i18n/fr.1a2b.json',
      '/_i18n/fr.1a2b.json',
    ])
  })

  it.each([
    ['a language without a messages file', '/de/menu'],
    ['the root (the language module redirects it, no HTML is sent)', '/'],
    ['an empty path', ''],
    ['an asset path', '/_nuxt/entry.js'],
  ])('preloads nothing for %s', (_label, path) => {
    run(path)
    expect(useHead).not.toHaveBeenCalled()
  })

  it('preloads nothing in development (there the files come from the module loaders)', () => {
    setFlags({ server: true, dev: true })
    run('/fr/menu')
    expect(useHead).not.toHaveBeenCalled()
  })
})

describe('in the browser', () => {
  it('does nothing (the head of a client-side navigation is not preloaded)', () => {
    run('/fr/menu')
    expect(useHead).not.toHaveBeenCalled()
  })
})
