// useLocalizedUrl: absolute, localized URL for structured data and share tags (real i18n, real runtime config).
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test'
import { useNuxtApp, useRuntimeConfig } from '#imports'
import { useLocalizedUrl } from '#engine/composables/useLocalizedUrl'
import { mountComposableInNuxt } from '../../../test/helpers/mountComposable'

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
    expect(await localizedUrl('fr')).toBeTypeOf('function')
    expect((await localizedUrl('fr'))('/menu')).toBe('https://tokyosushi.test/fr/menu')
    expect((await localizedUrl('nl'))('/menu')).toBe('https://tokyosushi.test/nl/menu')
  })

  it('without an argument it is the home page of the locale', async () => {
    expect((await localizedUrl('en'))()).toBe('https://tokyosushi.test/en')
  })

  it('does not double the slash when the base URL ends with one', async () => {
    useRuntimeConfig().public.baseUrl = 'https://tokyosushi.test/'
    expect((await localizedUrl('fr'))('/menu')).toBe('https://tokyosushi.test/fr/menu')
  })
})
