// UseLocaleSeoMeta: og:locale of the current language and the alternates (the other three).
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test'
import { useNuxtApp } from '#imports'
import { useLocaleSeoMeta } from '#engine/composables/useLocaleSeoMeta'
import { mountComposableInNuxt } from '../../../test/helpers/mountComposable'

const i18n = () => useNuxtApp().$i18n as unknown as { locale: { value: string } }
let original = ''
beforeEach(() => {
  original = i18n().locale.value
})
afterEach(() => {
  i18n().locale.value = original
})

async function metaFor(code: string) {
  i18n().locale.value = code
  const { result, unmount } = await mountComposableInNuxt(() => useLocaleSeoMeta())
  unmount()
  return result
}

describe('useLocaleSeoMeta', () => {
  it.each([
    ['fr', 'fr_BE', ['en_US', 'zh_CN', 'nl_BE']],
    ['en', 'en_US', ['fr_BE', 'zh_CN', 'nl_BE']],
    ['nl', 'nl_BE', ['fr_BE', 'en_US', 'zh_CN']],
    ['zh', 'zh_CN', ['fr_BE', 'en_US', 'nl_BE']],
  ])('%s: og:locale %s, alternates %j', async (code, og, alternates) => {
    expect(await metaFor(code)).toEqual({ ogLocale: og, ogLocaleAlternate: alternates })
  })

  it('an unknown locale falls back to French and lists every language as alternate', async () => {
    expect(await metaFor('de')).toEqual({
      ogLocale: 'fr_BE',
      ogLocaleAlternate: ['fr_BE', 'en_US', 'zh_CN', 'nl_BE'],
    })
  })
})
