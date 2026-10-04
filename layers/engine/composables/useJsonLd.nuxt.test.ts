// UseJsonLd / breadcrumbList: the head script of structured data (useHead is the boundary).
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'

const useHead = vi.hoisted(() => vi.fn())
mockNuxtImport('useHead', () => useHead)

const { breadcrumbList, useJsonLd } = await import('#engine/composables/useJsonLd')

interface HeadInput {
  script: { type: string; innerHTML: string; tagPosition: string; key: string }[]
}
const injected = (): HeadInput['script'][number] =>
  (useHead.mock.calls[0]![0] as HeadInput).script[0]!

beforeEach(() => useHead.mockReset())

describe('useJsonLd', () => {
  it('wraps one node in a schema.org @graph script of the head', () => {
    useJsonLd({ '@type': 'Restaurant', name: 'Tokyo' })
    expect(useHead).toHaveBeenCalledOnce()
    const script = injected()
    expect(script.type).toBe('application/ld+json')
    expect(script.tagPosition).toBe('head')
    expect(JSON.parse(script.innerHTML)).toEqual({
      '@context': 'https://schema.org',
      '@graph': [{ '@type': 'Restaurant', name: 'Tokyo' }],
    })
  })

  it('keeps an array of nodes as is, and defaults the key to "jsonld"', () => {
    useJsonLd([{ '@type': 'A' }, { '@type': 'B' }])
    expect(JSON.parse(injected().innerHTML)['@graph']).toEqual([{ '@type': 'A' }, { '@type': 'B' }])
    expect(injected().key).toBe('jsonld')
  })

  it('uses the key it is given, so two blocks can coexist', () => {
    useJsonLd({ '@type': 'A' }, 'menu-jsonld')
    expect(injected().key).toBe('menu-jsonld')
  })
})

describe('breadcrumbList', () => {
  it('numbers the items from 1 in order', () => {
    expect(
      breadcrumbList([
        { name: 'Home', item: 'https://x.test/fr' },
        { name: 'Menu', item: 'https://x.test/fr/menu' },
      ]),
    ).toEqual({
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://x.test/fr' },
        { '@type': 'ListItem', position: 2, name: 'Menu', item: 'https://x.test/fr/menu' },
      ],
    })
  })

  it('an empty trail is an empty list', () => {
    expect(breadcrumbList([])).toEqual({ '@type': 'BreadcrumbList', itemListElement: [] })
  })
})
