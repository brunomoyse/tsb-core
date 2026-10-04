// Seo-defaults plugin: the share-card defaults of every page (brand image with dimensions, site name, Twitter card).
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { useRuntimeConfig } from '#imports'

const useSeoMeta = vi.hoisted(() => vi.fn())
mockNuxtImport('useSeoMeta', () => useSeoMeta)

const { default: plugin } = await import('./seo-defaults')
const run = () => {
  ;(plugin as unknown as () => void)()
}

beforeEach(() => useSeoMeta.mockReset())

describe('seo-defaults plugin', () => {
  it('registers the brand share card under the site origin', () => {
    run()
    expect(useSeoMeta).toHaveBeenCalledExactlyOnceWith({
      ogSiteName: 'Tokyo Sushi Bar',
      ogImage: 'https://tokyosushi.test/images/og-default.jpg',
      ogImageType: 'image/jpeg',
      ogImageWidth: 1200,
      ogImageHeight: 630,
      ogImageAlt: 'Tokyo Sushi Bar, Liège',
      twitterCard: 'summary_large_image',
      twitterImage: 'https://tokyosushi.test/images/og-default.jpg',
      twitterImageAlt: 'Tokyo Sushi Bar, Liège',
    })
  })

  it('does not double the slash of a base URL that ends with one', () => {
    const config = useRuntimeConfig().public
    const original = config.baseUrl
    config.baseUrl = 'https://tokyosushi.test/'
    try {
      run()
      expect(useSeoMeta.mock.calls[0]![0].ogImage).toBe(
        'https://tokyosushi.test/images/og-default.jpg',
      )
    } finally {
      config.baseUrl = original
    }
  })
})
