// useDateLocale: the Intl locale of the UI language, Belgian French when unknown.
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test'
import { mountComposableInNuxt } from '../../../test/helpers/mountComposable'
import { nextTick } from 'vue'
import { useDateLocale } from '#engine/composables/useDateLocale'
import { useNuxtApp } from '#imports'

const i18n = () => useNuxtApp().$i18n as unknown as { locale: { value: string } }
let original = ''
beforeEach(() => {
  original = i18n().locale.value
})
afterEach(() => {
  i18n().locale.value = original
})

describe('useDateLocale', () => {
  it.each([
    ['fr', 'fr-BE'],
    ['en', 'en-GB'],
    ['zh', 'zh-CN'],
    ['nl', 'nl-BE'],
  ])('%s formats as %s', async (code, expected) => {
    i18n().locale.value = code
    const { result, unmount } = await mountComposableInNuxt(() => useDateLocale())
    expect(result.value).toBe(expected)
    unmount()
  })

  it('follows a language change reactively', async () => {
    i18n().locale.value = 'fr'
    const { result, unmount } = await mountComposableInNuxt(() => useDateLocale())
    i18n().locale.value = 'nl'
    await nextTick()
    expect(result.value).toBe('nl-BE')
    unmount()
  })

  it('falls back to fr-BE for a locale it does not know', async () => {
    i18n().locale.value = 'de'
    const { result, unmount } = await mountComposableInNuxt(() => useDateLocale())
    expect(result.value).toBe('fr-BE')
    unmount()
  })
})
