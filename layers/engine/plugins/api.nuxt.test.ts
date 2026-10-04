// $api plugin: the REST client of the shop (ofetch with the API base URL), with the Accept-Language header, the OIDC
// bearer token in the browser, the visitor's cookies on the server, and one silent renewal + retry after a 401.
// $fetch.create (the HTTP layer), the OIDC client and navigation are the boundaries; the runtime config and the localised
// paths are real.
// Run: `vp test run layers/engine/plugins/api.nuxt.test.ts`.
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { SilentRenewUnavailableError } from '#engine/utils/silentRenewError'
import { useNuxtApp, useRuntimeConfig } from '#imports'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { setFlags } from '../../../test/flags'

interface CreateOptions {
  baseURL: string
  credentials: string
  headers: Record<string, string>
  onRequest: (context: { options: { headers: Headers } }) => Promise<void>
}

const oidc = vi.hoisted(() => ({
  getAccessToken: vi.fn<() => Promise<string | null>>(),
  silentRenew: vi.fn<() => Promise<unknown>>(),
}))
const baseApi = vi.hoisted(() => vi.fn())
const created = vi.hoisted(() => ({ options: null as unknown }))
const $fetchMock = vi.hoisted(() => {
  const fetchMock = vi.fn() as ReturnType<typeof vi.fn> & { create: ReturnType<typeof vi.fn> }
  fetchMock.create = vi.fn()
  return fetchMock
})
const navigateTo = vi.hoisted(() => vi.fn())
const useRequestEvent = vi.hoisted(() => vi.fn())

vi.mock('#engine/composables/useOidc', () => ({ useOidc: () => oidc }))
mockNuxtImport('$fetch', () => $fetchMock)
mockNuxtImport('navigateTo', () => navigateTo)
mockNuxtImport('useRequestEvent', () => useRequestEvent)

const { default: apiPlugin } = await import('./api')

type Api = <T>(request: string, options?: Record<string, unknown>) => Promise<T>

const install = (locale?: string): Api => {
  const nuxtApp = { $i18n: locale ? { locale: { value: locale } } : undefined }
  const result = (apiPlugin as unknown as (app: unknown) => { provide: { api: Api } })(nuxtApp)
  return result.provide.api
}
const createOptions = () => created.options as CreateOptions

/** What ofetch throws for an HTTP error status. */
const httpError = (status: number) =>
  Object.assign(new Error(`${status} error`), { name: 'FetchError', status })

/** Runs the request hook of the created client and returns the headers it left. */
async function requestHeaders(): Promise<Headers> {
  const headers = new Headers()
  await createOptions().onRequest({ options: { headers } })
  return headers
}

beforeEach(() => {
  vi.resetAllMocks()
  sessionStorage.clear()
  $fetchMock.create.mockImplementation((options: unknown) => {
    created.options = options
    return baseApi
  })
  useNuxtApp().$i18n.locale.value = 'fr'
  document.cookie = 'i18n_redirected=; path=/; max-age=0'
  oidc.getAccessToken.mockResolvedValue('token-1')
  oidc.silentRenew.mockResolvedValue({ access_token: 'token-2' })
})

describe('the client', () => {
  it('is created for the API base URL, with JSON headers and no cookies (the session is a Bearer token)', () => {
    install('fr')
    expect(createOptions()).toMatchObject({
      baseURL: useRuntimeConfig().public.api,
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    })
  })

  it('is exposed as nuxtApp.$api: the provided function is the one that reaches the client', async () => {
    const provided = (apiPlugin as unknown as (app: unknown) => { provide: { api: Api } })({})
    expect(Object.keys(provided.provide)).toEqual(['api'])
    baseApi.mockResolvedValue({ ok: true })
    await expect(provided.provide.api('/me', { method: 'GET' })).resolves.toEqual({ ok: true })
    expect(baseApi).toHaveBeenCalledExactlyOnceWith('/me', { method: 'GET' })
  })
})

describe('every request in the browser', () => {
  it('carries the language the app shows (read at request time) and the OIDC Bearer token', async () => {
    const nuxtApp = { $i18n: { locale: { value: 'nl' } } }
    ;(apiPlugin as unknown as (app: unknown) => unknown)(nuxtApp)

    let headers = await requestHeaders()
    expect(headers.get('Accept-Language')).toBe('nl')
    expect(headers.get('Authorization')).toBe('Bearer token-1')

    nuxtApp.$i18n.locale.value = 'zh'
    headers = await requestHeaders()
    expect(headers.get('Accept-Language')).toBe('zh')
  })

  it('sends no Authorization header to an anonymous visitor', async () => {
    oidc.getAccessToken.mockResolvedValue(null)
    install('fr')
    expect((await requestHeaders()).has('Authorization')).toBe(false)
  })

  it('falls back to the language cookie, then to French, when the app has no locale yet', async () => {
    install()
    document.cookie = 'i18n_redirected=nl; path=/'
    expect((await requestHeaders()).get('Accept-Language')).toBe('nl')
    document.cookie = 'i18n_redirected=; path=/; max-age=0'
    expect((await requestHeaders()).get('Accept-Language')).toBe('fr')
  })

  it('does the same while the i18n module is installed but has no locale yet', async () => {
    ;(apiPlugin as unknown as (app: unknown) => unknown)({ $i18n: {} })
    document.cookie = 'i18n_redirected=zh; path=/'
    expect((await requestHeaders()).get('Accept-Language')).toBe('zh')
  })
})

describe('every request during SSR', () => {
  beforeEach(() => {
    setFlags({ server: true })
  })

  it("forwards the visitor's cookies and never looks for an OIDC token", async () => {
    useRequestEvent.mockReturnValue({
      node: { req: { headers: { cookie: 'i18n_redirected=en; a=b' } } },
    })
    install('en')
    const headers = await requestHeaders()
    expect(headers.get('cookie')).toBe('i18n_redirected=en; a=b')
    expect(headers.get('Accept-Language')).toBe('en')
    expect(headers.has('Authorization')).toBe(false)
    expect(oidc.getAccessToken).not.toHaveBeenCalled()
  })

  it('sends no cookie when the request has none, or when there is no request', async () => {
    install('en')
    useRequestEvent.mockReturnValue({ node: { req: { headers: {} } } })
    expect((await requestHeaders()).has('cookie')).toBe(false)
    useRequestEvent.mockReturnValue(undefined)
    expect((await requestHeaders()).has('cookie')).toBe(false)
  })
})

describe('$api()', () => {
  it('passes the request and options to the client and returns its answer', async () => {
    baseApi.mockResolvedValue({ ok: true })
    await expect(install('fr')('/me/orders', { query: { page: 2 } })).resolves.toEqual({ ok: true })
    expect(baseApi).toHaveBeenCalledExactlyOnceWith('/me/orders', { query: { page: 2 } })
  })

  it('lets a non-401 failure reach the caller, without renewing anything', async () => {
    const failure = httpError(500)
    baseApi.mockRejectedValue(failure)
    await expect(install('fr')('/x')).rejects.toBe(failure)
    expect(oidc.silentRenew).not.toHaveBeenCalled()
    expect(navigateTo).not.toHaveBeenCalled()
  })

  it.each([
    ['a string', 'boom'],
    ['null', null],
    ['an error without a status', new Error('offline')],
  ])('lets %s thrown by the client reach the caller untouched', async (_label, failure) => {
    baseApi.mockRejectedValue(failure)
    await expect(install('fr')('/x')).rejects.toBe(failure)
    expect(oidc.silentRenew).not.toHaveBeenCalled()
  })
})

describe('expired session: HTTP 401', () => {
  it('renews the session silently and repeats the request once, returning its answer', async () => {
    baseApi.mockRejectedValueOnce(httpError(401)).mockResolvedValueOnce({ orders: [] })

    await expect(install('fr')('/me/orders', { method: 'GET' })).resolves.toEqual({ orders: [] })

    expect(oidc.silentRenew).toHaveBeenCalledOnce()
    expect(baseApi.mock.calls).toEqual([
      ['/me/orders', { method: 'GET' }],
      ['/me/orders', { method: 'GET' }],
    ])
    expect(navigateTo).not.toHaveBeenCalled()
  })

  it('sends the customer to the login page (in their language) when the session cannot be renewed, and still fails the call', async () => {
    oidc.silentRenew.mockResolvedValue(null)
    const failure = httpError(401)
    baseApi.mockRejectedValue(failure)

    await expect(install('fr')('/me')).rejects.toBe(failure)

    expect(baseApi).toHaveBeenCalledOnce()
    expect(navigateTo).toHaveBeenCalledExactlyOnceWith('/fr/auth/login?session=expired')
  })

  it('keeps the customer where they are when Zitadel cannot be reached: no login redirect, the 401 is thrown, the next call renews', async () => {
    oidc.silentRenew.mockRejectedValue(new SilentRenewUnavailableError())
    const failure = httpError(401)
    baseApi.mockRejectedValue(failure)

    await expect(install('fr')('/me')).rejects.toBe(failure)

    expect(baseApi).toHaveBeenCalledOnce()
    expect(navigateTo).not.toHaveBeenCalled()
    expect(sessionStorage.getItem('oidc_return_to')).toBeNull()

    // The network is back: the next call renews and goes through.
    oidc.silentRenew.mockResolvedValue({ access_token: 'token-2' })
    baseApi.mockReset()
    baseApi.mockRejectedValueOnce(httpError(401)).mockResolvedValueOnce({ id: 'u1' })
    await expect(install('fr')('/me')).resolves.toEqual({ id: 'u1' })
  })

  it('an unexpected failure of the renewal is not hidden', async () => {
    const bug = new TypeError('boom')
    oidc.silentRenew.mockRejectedValue(bug)
    baseApi.mockRejectedValue(httpError(401))
    await expect(install('fr')('/me')).rejects.toBe(bug)
  })

  it('remembers the page the customer was on, so that the login brings them back to it', async () => {
    window.history.replaceState({}, '', '/fr/me/orders?tab=past')
    oidc.silentRenew.mockResolvedValue(null)
    baseApi.mockRejectedValue(httpError(401))
    await install('fr')('/me').catch(() => undefined)
    expect(sessionStorage.getItem('oidc_return_to')).toBe('/fr/me/orders?tab=past')
  })

  it('does not renew twice: a second 401 on the repeated request is final', async () => {
    const second = httpError(401)
    baseApi.mockRejectedValueOnce(httpError(401)).mockRejectedValueOnce(second)
    await expect(install('fr')('/me')).rejects.toBe(second)
    expect(oidc.silentRenew).toHaveBeenCalledOnce()
    expect(baseApi).toHaveBeenCalledTimes(2)
  })

  it('cannot renew on the server: a 401 is final, without redirect', async () => {
    setFlags({ server: true })
    const failure = httpError(401)
    baseApi.mockRejectedValue(failure)
    await expect(install('fr')('/me')).rejects.toBe(failure)
    expect(oidc.silentRenew).not.toHaveBeenCalled()
    expect(navigateTo).not.toHaveBeenCalled()
  })
})
