// seo-defaults in the real app of ygfliege: the share card names this brand, not the other one.
import { describe, expect, it, vi } from 'vite-plus/test'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useRuntimeConfig } from '#imports'

const useSeoMeta = vi.hoisted(() => vi.fn())
mockNuxtImport('useSeoMeta', () => useSeoMeta)

const { default: plugin } = await import('./seo-defaults')

describe('seo-defaults plugin in the ygfliege app', () => {
  it('registers the share card of Yangguofu Malatang Liège under the site origin', () => {
    ;(plugin as unknown as () => void)()
    const origin = useRuntimeConfig().public.baseUrl
    expect(useSeoMeta).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        ogSiteName: 'Yangguofu Malatang Liège',
        ogImage: `${origin}/images/og-default.jpg`,
        ogImageAlt: 'Yangguofu Malatang Liège, Liège',
        twitterImageAlt: 'Yangguofu Malatang Liège, Liège',
      }),
    )
  })
})
