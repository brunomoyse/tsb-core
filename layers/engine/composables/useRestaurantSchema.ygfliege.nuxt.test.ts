// useRestaurantSchema in the real app of ygfliege: the JSON-LD is this brand's (name, phone, address, hours).
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { describe, expect, it, vi } from 'vite-plus/test'
import { useRuntimeConfig } from '#imports'
import { mountComposableInNuxt } from '../../../test/helpers/mountComposable'

const useHead = vi.hoisted(() => vi.fn())
mockNuxtImport('useHead', () => useHead)

const { useRestaurantSchema } = await import('#engine/composables/useRestaurantSchema')

async function restaurant(openingHours: Parameters<typeof useRestaurantSchema>[0]) {
  const { unmount } = await mountComposableInNuxt(() => {
    useRestaurantSchema(openingHours)
  })
  unmount()
  const input = (useHead.mock.calls[0]![0] as () => { script: { innerHTML: string }[] })()
  const json = JSON.parse(input.script[0]!.innerHTML) as { '@graph': Record<string, unknown>[] }
  return json['@graph'][0]!
}

describe('useRestaurantSchema in the ygfliege app', () => {
  it('describes Yangguofu Malatang Liège with its address, phone number and the site origin', async () => {
    const node = await restaurant(() => null)
    expect(node).toMatchObject({
      '@type': 'Restaurant',
      name: 'Yangguofu Malatang Liège',
      telephone: '+3242866820',
      url: useRuntimeConfig().public.baseUrl,
      servesCuisine: ['Chinese', 'Malatang'],
      address: expect.objectContaining({
        streetAddress: 'Rue de la Cathédrale 51',
        postalCode: '4000',
      }),
    })
  })

  it("falls back to this brand's own opening hours (11:30 to 22:00, seven days), not another brand's", async () => {
    const node = await restaurant(() => null)
    expect(JSON.stringify(node)).toContain('11:30')
    expect(JSON.stringify(node)).toContain('22:00')
    expect(JSON.stringify(node)).not.toContain('22:30')
  })
})
