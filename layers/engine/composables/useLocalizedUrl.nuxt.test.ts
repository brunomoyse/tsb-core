// useLocalizedUrl: absolute, localized URL for structured data and share tags (real i18n, real runtime config).
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test'
import { useNuxtApp, useRuntimeConfig } from '#imports'
import { mountComposableInNuxt } from '../../../test/helpers/mountComposable'
import { useLocalizedUrl } from '#engine/composables/useLocalizedUrl'

const i18n = () => useNuxtApp().$i18n as unknown as { locale: { value: string } }
let original = ''
let originalBase = ''
beforeEach(() => {
  original = i18n().locale.value
  originalBase = useRuntimeConfig().public.baseUrl
})
afterEach(() => {
  i18n().locale.value = original
  useRuntimeConfig().public.baseUrl = originalBase
})

async function localizedUrl(locale: string) {
  i18n().locale.value = locale
  const { result, unmount } = await mountComposableInNuxt(() => useLocalizedUrl())
  unmount()
  return result
}

describe('useLocalizedUrl', () => {
  it('prefixes the path with the site origin and the active locale', async () => {
    const origin = originalBase
    expect((await localizedUrl('fr'))('/menu')).toBe(`${origin}/fr/menu`)
    expect((await localizedUrl('nl'))('/menu')).toBe(`${origin}/nl/menu`)
  })

  it('without an argument it is the home page of the locale', async () => {
    expect((await localizedUrl('en'))()).toBe(`${originalBase}/en`)
  })

  it('does not double the slash when the base URL ends with one', async () => {
    useRuntimeConfig().public.baseUrl = 'https://shop.example/'
    expect((await localizedUrl('fr'))('/menu')).toBe('https://shop.example/fr/menu')
  })
})
