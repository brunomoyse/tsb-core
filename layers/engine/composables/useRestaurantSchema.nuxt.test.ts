// useRestaurantSchema: the site-wide Restaurant JSON-LD. useHead is the boundary; brand, runtime config, locale and the
// schema builder are real (tokyosushi brand, https://tokyosushi.test).
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { useNuxtApp, useRuntimeConfig } from '#imports'
import { mountComposableInNuxt } from '../../../test/helpers/mountComposable'

interface Script {
  type: string
  innerHTML: string
  tagPosition: string
  key: string
}
const useHead = vi.hoisted(() => vi.fn())
mockNuxtImport('useHead', () => useHead)

const { useRestaurantSchema } = await import('#engine/composables/useRestaurantSchema')

const i18n = () => useNuxtApp().$i18n as unknown as { locale: { value: string } }
let originalLocale = ''
let originalBase = ''
beforeEach(() => {
  useHead.mockReset()
  originalLocale = i18n().locale.value
  originalBase = useRuntimeConfig().public.baseUrl
})
afterEach(() => {
  i18n().locale.value = originalLocale
  useRuntimeConfig().public.baseUrl = originalBase
})

/** Registers the schema and evaluates the reactive head input as Nuxt would. */
async function schema(openingHours: Parameters<typeof useRestaurantSchema>[0]) {
  const { unmount } = await mountComposableInNuxt(() => {
    useRestaurantSchema(openingHours)
  })
  unmount()
  const input = (useHead.mock.calls[0]![0] as () => { script: Script[] })()
  const script = input.script[0]!
  return { script, json: JSON.parse(script.innerHTML) as Record<string, unknown> }
}

describe('useRestaurantSchema', () => {
  it('registers one ld+json script in the head under a stable key', async () => {
    const { script } = await schema(() => null)
    expect(useHead).toHaveBeenCalledOnce()
    expect(script).toMatchObject({
      type: 'application/ld+json',
      tagPosition: 'head',
      key: 'tsb-jsonld',
    })
  })

  it('describes the brand with localized URLs under the site origin', async () => {
    i18n().locale.value = 'nl'
    const { json } = await schema(() => null)
    const [restaurant] = json['@graph'] as Record<string, unknown>[]
    expect(restaurant).toMatchObject({
      '@type': 'Restaurant',
      name: 'Tokyo Sushi Bar',
      telephone: '+3242229888',
      url: 'https://tokyosushi.test',
    })
    expect(JSON.stringify(json)).toContain('https://tokyosushi.test/nl/menu')
  })

  it('strips a trailing slash from the base URL', async () => {
    useRuntimeConfig().public.baseUrl = 'https://tokyosushi.test/'
    const { script } = await schema(() => null)
    expect(script.innerHTML).toContain('https://tokyosushi.test/')
    expect(script.innerHTML).not.toContain('https://tokyosushi.test//')
  })

  it('uses the live opening hours when given, not the brand fallback', async () => {
    const live = { friday: { open: '11:00', close: '13:00' } }
    const { script } = await schema(() => live)
    expect(script.innerHTML).toContain('11:00')
    expect(script.innerHTML).not.toContain('22:30')
  })

  it('falls back to the brand hours when there are none', async () => {
    const { script } = await schema(() => undefined)
    expect(script.innerHTML).toContain('22:30')
  })

  it('reads the hours lazily, so the head follows a config that arrives later', async () => {
    let hours: Record<string, { open: string; close: string }> | null = null
    await mountComposableInNuxt(() => {
      useRestaurantSchema(() => hours)
    })
    const evaluate = () =>
      (useHead.mock.calls[0]![0] as () => { script: Script[] })().script[0]!.innerHTML
    expect(evaluate()).toContain('22:30')
    hours = { monday: { open: '10:00', close: '12:00' } }
    expect(evaluate()).toContain('10:00')
  })
})
