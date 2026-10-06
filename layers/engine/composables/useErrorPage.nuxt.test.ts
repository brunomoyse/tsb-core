// useErrorPage: what a brand's error.vue shows and does. The point under test is that it still works when i18n never
// started (a plugin before it failed at startup: TSB-CORE-C), where `useI18n()` used to throw vue-i18n error 27 and
// leave a blank page. The Nuxt app (with or without `$i18n`), the route and the Sentry report are the boundaries.
// Run: `vp test run layers/engine/composables/useErrorPage.nuxt.test.ts`.
import type { NuxtError } from '#app'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { defineComponent, h } from 'vue'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { useErrorPage } from './useErrorPage'

const state = vi.hoisted(() => ({ withoutI18n: false, path: '/nl' }))
const reportPageError = vi.hoisted(() => vi.fn())

mockNuxtImport('useNuxtApp', (original) => () => {
  const app = original()
  return state.withoutI18n
    ? new Proxy(app, { get: (t, k) => (k === '$i18n' ? undefined : Reflect.get(t, k)) })
    : app
})
mockNuxtImport(
  'useRoute',
  (original) => () => (state.withoutI18n ? { path: state.path } : original()),
)
vi.mock('#engine/utils/reportError', () => ({ reportPageError }))

const nuxtError = (statusCode: number) =>
  Object.assign(new Error('boom'), { status: statusCode, fatal: true }) as unknown as NuxtError

async function mountWith(error: NuxtError) {
  let page!: ReturnType<typeof useErrorPage>
  await mountSuspended(
    defineComponent({
      setup() {
        page = useErrorPage(() => error)
        return () => h('div')
      },
    }),
  )
  return page
}

beforeEach(() => {
  state.withoutI18n = false
  state.path = '/nl'
  reportPageError.mockReset()
})

describe('with i18n running', () => {
  it('uses the app translations and reports the error it shows once mounted', async () => {
    const error = nuxtError(500)
    const page = await mountWith(error)
    expect(page.statusCode.value).toBe(500)
    expect(page.isServerError.value).toBe(true)
    expect(page.errorTitle.value).toBeTruthy()
    expect(page.errorTitle.value).not.toBe('error.title500')
    expect(reportPageError).toHaveBeenCalledExactlyOnceWith(error)
  })
})

describe('when i18n never started', () => {
  beforeEach(() => {
    state.withoutI18n = true
  })

  it('does not throw, and shows the fallback texts in the language of the URL', async () => {
    state.path = '/nl/menu'
    const page = await mountWith(nuxtError(500))
    expect(page.errorTitle.value).toBe('Probleem in de keuken')
    expect(page.errorMessage.value).toBe('Er is een fout opgetreden. Probeer het later opnieuw.')
    expect(page.t('common.retry')).toBe('Opnieuw proberen')
    expect(page.t('error.title500', page.t('error.titleGeneric'))).toBe('Probleem in de keuken')
  })

  it('falls back to French for an unprefixed URL, and still reports the error', async () => {
    state.path = '/'
    const error = nuxtError(404)
    const page = await mountWith(error)
    expect(page.errorTitle.value).toBe("Rien dans l'assiette")
    expect(page.isServerError.value).toBe(false)
    expect(reportPageError).toHaveBeenCalledExactlyOnceWith(error)
  })
})
