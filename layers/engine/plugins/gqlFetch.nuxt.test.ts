// $gqlFetch (plugins/gqlFetch.ts) in the browser: the one GraphQL transport of the shop. The HTTP call ($fetch) and
// the OIDC client are the boundaries, mocked; the real runtime config, cookies and i18n of the Nuxt app are used.
// Run: `vp test run layers/engine/plugins/gqlFetch.nuxt.test.ts`.
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { useRuntimeConfig } from '#imports'
import { setFlags } from '../../../test/flags'
import { GQL_HTTP_ERROR, GQL_NETWORK_ERROR, GqlError } from '#engine/utils/gqlError'

const oidc = vi.hoisted(() => ({
  getAccessToken: vi.fn<() => Promise<string | null>>(),
  silentRenew: vi.fn<() => Promise<unknown>>(),
}))
const navigateTo = vi.hoisted(() => vi.fn())
const $fetchMock = vi.hoisted(() => vi.fn())
const useRequestEvent = vi.hoisted(() => vi.fn())

vi.mock('#engine/composables/useOidc', () => ({ useOidc: () => oidc }))
mockNuxtImport('navigateTo', () => navigateTo)
mockNuxtImport('$fetch', () => $fetchMock)
mockNuxtImport('useRequestEvent', () => useRequestEvent)

const { default: gqlFetchPlugin } = await import('./gqlFetch')

type GqlFetch = <T = unknown>(
  query: string,
  options?: { variables?: Record<string, unknown>; signal?: AbortSignal },
) => Promise<T>

const install = (locale?: string): GqlFetch => {
  const nuxtApp = { $i18n: locale ? { locale: { value: locale } } : undefined }
  const result = (
    gqlFetchPlugin as unknown as (app: unknown) => { provide: { gqlFetch: GqlFetch } }
  )(nuxtApp)
  return result.provide.gqlFetch
}

/** What ofetch throws for an HTTP error status. */
const httpError = (status: number, data?: unknown) =>
  Object.assign(new Error(`${status} error`), {
    name: 'FetchError',
    status,
    statusCode: status,
    data,
  })

const abortError = () =>
  Object.assign(new Error('The operation was aborted'), { name: 'AbortError' })

/** The language cookie of the visitor, written where useCookie reads it (document.cookie). */
const setLanguageCookie = (value: string | null) => {
  document.cookie = value
    ? `i18n_redirected=${value}; path=/`
    : 'i18n_redirected=; path=/; max-age=0'
}

const QUERY = 'query ProductList { products { id } }'
const ok = (data: unknown) => ({ data })
const unauthenticated = () => ({
  errors: [{ message: 'not signed in', extensions: { code: 'UNAUTHENTICATED' } }],
})

beforeEach(() => {
  vi.resetAllMocks()
  oidc.getAccessToken.mockResolvedValue('token-1')
  oidc.silentRenew.mockResolvedValue({ access_token: 'token-2' })
  setLanguageCookie(null)
})

describe('the request', () => {
  it('POSTs the query with variables to the configured GraphQL endpoint and returns `data`', async () => {
    $fetchMock.mockResolvedValue(ok({ products: [{ id: 'p1' }] }))
    const gqlFetch = install('fr')
    const { signal } = new AbortController()

    const data = await gqlFetch<{ products: { id: string }[] }>(QUERY, {
      variables: { first: 5 },
      signal,
    })

    expect(data).toEqual({ products: [{ id: 'p1' }] })
    expect($fetchMock).toHaveBeenCalledExactlyOnceWith(useRuntimeConfig().public.graphqlHttp, {
      method: 'POST',
      body: { query: QUERY, variables: { first: 5 } },
      credentials: 'omit',
      signal,
      headers: {
        'Content-Type': 'application/json',
        'Accept-Language': 'fr',
        Authorization: 'Bearer token-1',
      },
    })
  })

  it('sends empty variables when none are given', async () => {
    $fetchMock.mockResolvedValue(ok({}))
    await install('fr')(QUERY)
    expect($fetchMock.mock.calls[0]![1].body).toEqual({ query: QUERY, variables: {} })
  })

  it('sends no Authorization header to an anonymous customer', async () => {
    oidc.getAccessToken.mockResolvedValue(null)
    $fetchMock.mockResolvedValue(ok({}))
    await install('fr')(QUERY)
    expect($fetchMock.mock.calls[0]![1].headers).not.toHaveProperty('Authorization')
  })

  it('asks for the catalogue in the language the app currently shows, read at call time', async () => {
    $fetchMock.mockResolvedValue(ok({}))
    const nuxtApp = { $i18n: { locale: { value: 'fr' } } }
    const { gqlFetch } = (
      gqlFetchPlugin as unknown as (app: unknown) => { provide: { gqlFetch: GqlFetch } }
    )(nuxtApp).provide
    await gqlFetch(QUERY)
    nuxtApp.$i18n.locale.value = 'zh'
    await gqlFetch(QUERY)
    expect($fetchMock.mock.calls.map((call) => call[1].headers['Accept-Language'])).toEqual([
      'fr',
      'zh',
    ])
  })

  it('falls back to the language cookie, then to French', async () => {
    $fetchMock.mockResolvedValue(ok({}))
    setLanguageCookie('nl')
    await install()(QUERY)
    setLanguageCookie(null)
    await install()(QUERY)
    expect($fetchMock.mock.calls.map((call) => call[1].headers['Accept-Language'])).toEqual([
      'nl',
      'fr',
    ])
  })

  it('exposes the transport as nuxtApp.$gqlFetch', () => {
    const result = (gqlFetchPlugin as unknown as (app: unknown) => unknown)({})
    expect(result).toEqual({ provide: { gqlFetch: expect.any(Function) } })
  })
})

describe('GraphQL errors', () => {
  it('throws a GqlError carrying the response errors, the code and the operation name', async () => {
    $fetchMock.mockResolvedValue({
      errors: [
        {
          message: 'product not found',
          extensions: { code: 'PRODUCT_NOT_FOUND', productId: 'p1' },
        },
        { message: 'second' },
      ],
    })
    const error = await install('fr')(QUERY).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(GqlError)
    expect(error).toMatchObject({
      code: 'PRODUCT_NOT_FOUND',
      operationName: 'ProductList',
      extensions: { code: 'PRODUCT_NOT_FOUND', productId: 'p1' },
    })
    expect((error as GqlError).errors).toHaveLength(2)
    // Not a session problem: no renewal, no retry.
    expect(oidc.silentRenew).not.toHaveBeenCalled()
    expect($fetchMock).toHaveBeenCalledOnce()
  })

  it('an empty errors array is not an error', async () => {
    $fetchMock.mockResolvedValue({ data: { ok: true }, errors: [] })
    await expect(install('fr')(QUERY)).resolves.toEqual({ ok: true })
  })

  it('names no operation for an anonymous query', async () => {
    $fetchMock.mockResolvedValue({ errors: [{ message: 'boom' }] })
    const error = await install('fr')('{ products { id } }').catch((e: unknown) => e)
    expect(error).toMatchObject({ operationName: null, code: null })
  })
})

describe('transport failures', () => {
  it('wraps a dropped connection as NETWORK_ERROR', async () => {
    $fetchMock.mockRejectedValue(new TypeError('fetch failed'))
    const error = await install('fr')(QUERY).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(GqlError)
    expect(error).toMatchObject({
      code: GQL_NETWORK_ERROR,
      status: null,
      operationName: 'ProductList',
    })
    expect(oidc.silentRenew).not.toHaveBeenCalled()
  })

  it('wraps a failed HTTP status as HTTP_ERROR with the status', async () => {
    $fetchMock.mockRejectedValue(httpError(503))
    const error = await install('fr')(QUERY).catch((e: unknown) => e)
    expect(error).toMatchObject({ code: GQL_HTTP_ERROR, status: 503 })
  })

  it('keeps the GraphQL errors of a non-2xx answer (validation failures come as 422)', async () => {
    $fetchMock.mockRejectedValue(
      httpError(422, {
        errors: [{ message: 'unknown field', extensions: { code: 'GRAPHQL_VALIDATION_FAILED' } }],
      }),
    )
    const error = await install('fr')(QUERY).catch((e: unknown) => e)
    expect(error).toMatchObject({ code: 'GRAPHQL_VALIDATION_FAILED', status: 422 })
  })

  it('lets an aborted request keep its AbortError identity (control flow, not a failure)', async () => {
    const abort = abortError()
    $fetchMock.mockRejectedValue(abort)
    await expect(install('fr')(QUERY)).rejects.toBe(abort)
  })

  it('also recognises an abort wrapped by ofetch (error.cause)', async () => {
    const wrapped = Object.assign(new Error('fetch failed'), { cause: abortError() })
    $fetchMock.mockRejectedValue(wrapped)
    await expect(install('fr')(QUERY)).rejects.toBe(wrapped)
  })
})

describe('expired session: HTTP 401', () => {
  it('renews the session silently and retries once with the fresh token', async () => {
    oidc.getAccessToken.mockResolvedValueOnce('expired-token').mockResolvedValueOnce('fresh-token')
    $fetchMock.mockRejectedValueOnce(httpError(401)).mockResolvedValueOnce(ok({ me: { id: 'u1' } }))

    await expect(install('fr')(QUERY)).resolves.toEqual({ me: { id: 'u1' } })

    expect(oidc.silentRenew).toHaveBeenCalledOnce()
    expect($fetchMock).toHaveBeenCalledTimes(2)
    expect($fetchMock.mock.calls[0]![1].headers.Authorization).toBe('Bearer expired-token')
    expect($fetchMock.mock.calls[1]![1].headers.Authorization).toBe('Bearer fresh-token')
    expect(navigateTo).not.toHaveBeenCalled()
  })

  it('fails with the 401 when the renewal gives no session, without retrying or redirecting', async () => {
    oidc.silentRenew.mockResolvedValue(null)
    $fetchMock.mockRejectedValue(httpError(401))
    const error = await install('fr')(QUERY).catch((e: unknown) => e)
    expect(error).toMatchObject({ code: GQL_HTTP_ERROR, status: 401 })
    expect($fetchMock).toHaveBeenCalledOnce()
    expect(navigateTo).not.toHaveBeenCalled()
  })

  it('sends the customer back to the login page when the renewal itself fails', async () => {
    oidc.silentRenew.mockRejectedValue(new Error('refresh token revoked'))
    $fetchMock.mockRejectedValue(httpError(401))
    const error = await install('fr')(QUERY).catch((e: unknown) => e)
    expect(error).toMatchObject({ status: 401 })
    expect($fetchMock).toHaveBeenCalledOnce()
    // The real localised path of the app (language prefix) with the "session expired" flag.
    expect(navigateTo).toHaveBeenCalledExactlyOnceWith(
      expect.stringMatching(/^\/[a-z]{2}\/auth\/login\?session=expired$/u),
    )
  })

  it('reports the failure of the retry, and keeps an abort of the retry as an abort', async () => {
    $fetchMock.mockRejectedValueOnce(httpError(401)).mockRejectedValueOnce(httpError(500))
    const failed = await install('fr')(QUERY).catch((e: unknown) => e)
    expect(failed).toMatchObject({ code: GQL_HTTP_ERROR, status: 500 })

    const abort = abortError()
    $fetchMock.mockReset()
    $fetchMock.mockRejectedValueOnce(httpError(401)).mockRejectedValueOnce(abort)
    await expect(install('fr')(QUERY)).rejects.toBe(abort)
  })

  it('does not renew or retry twice: a second 401 on the retry is final', async () => {
    $fetchMock.mockRejectedValue(httpError(401))
    const error = await install('fr')(QUERY).catch((e: unknown) => e)
    expect(error).toMatchObject({ status: 401 })
    expect(oidc.silentRenew).toHaveBeenCalledOnce()
    expect($fetchMock).toHaveBeenCalledTimes(2)
  })

  it('does not treat other failures as a session problem', async () => {
    $fetchMock.mockRejectedValue(httpError(403))
    await install('fr')(QUERY).catch(() => undefined)
    expect(oidc.silentRenew).not.toHaveBeenCalled()
  })
})

describe('expired session: UNAUTHENTICATED GraphQL error', () => {
  it('renews and retries once, returning the data of the retry', async () => {
    $fetchMock
      .mockResolvedValueOnce(unauthenticated())
      .mockResolvedValueOnce(ok({ me: { id: 'u1' } }))
    await expect(install('fr')(QUERY)).resolves.toEqual({ me: { id: 'u1' } })
    expect(oidc.silentRenew).toHaveBeenCalledOnce()
    expect($fetchMock).toHaveBeenCalledTimes(2)
  })

  it('throws the errors of the retry when it fails again', async () => {
    $fetchMock.mockResolvedValueOnce(unauthenticated()).mockResolvedValueOnce({
      errors: [{ message: 'forbidden', extensions: { code: 'FORBIDDEN' } }],
    })
    const error = await install('fr')(QUERY).catch((e: unknown) => e)
    expect(error).toMatchObject({ code: 'FORBIDDEN' })
  })

  it('throws a transport failure of the retry as a GqlError, and keeps an abort', async () => {
    $fetchMock
      .mockResolvedValueOnce(unauthenticated())
      .mockRejectedValueOnce(new TypeError('offline'))
    const error = await install('fr')(QUERY).catch((e: unknown) => e)
    expect(error).toMatchObject({ code: GQL_NETWORK_ERROR })

    const abort = abortError()
    $fetchMock.mockReset()
    $fetchMock.mockResolvedValueOnce(unauthenticated()).mockRejectedValueOnce(abort)
    await expect(install('fr')(QUERY)).rejects.toBe(abort)
  })

  it('throws the original UNAUTHENTICATED error when the session cannot be renewed', async () => {
    oidc.silentRenew.mockResolvedValue(null)
    $fetchMock.mockResolvedValue(unauthenticated())
    const error = await install('fr')(QUERY).catch((e: unknown) => e)
    expect(error).toMatchObject({ code: 'UNAUTHENTICATED' })
    expect($fetchMock).toHaveBeenCalledOnce()
  })
})

describe('development', () => {
  it('logs why a silent renewal failed', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    setFlags({ dev: true })
    const failure = new Error('refresh token revoked')
    oidc.silentRenew.mockRejectedValue(failure)
    $fetchMock.mockRejectedValue(httpError(401))
    await install('fr')(QUERY).catch(() => undefined)
    expect(warn).toHaveBeenCalledExactlyOnceWith('[gqlFetch] silent renew failed', failure)
    warn.mockRestore()
  })

  it('stays silent in production', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    oidc.silentRenew.mockRejectedValue(new Error('revoked'))
    $fetchMock.mockRejectedValue(httpError(401))
    await install('fr')(QUERY).catch(() => undefined)
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })
})

describe('during SSR', () => {
  beforeEach(() => {
    setFlags({ server: true })
  })

  it("forwards the visitor's cookies and language, and never looks for an OIDC token", async () => {
    useRequestEvent.mockReturnValue({
      node: { req: { headers: { cookie: 'i18n_redirected=en; a=b' } } },
    })
    $fetchMock.mockResolvedValue(ok({ products: [] }))

    await expect(install('en')(QUERY)).resolves.toEqual({ products: [] })

    expect($fetchMock.mock.calls[0]![1].headers).toEqual({
      'Content-Type': 'application/json',
      'Accept-Language': 'en',
      cookie: 'i18n_redirected=en; a=b',
    })
    expect(oidc.getAccessToken).not.toHaveBeenCalled()
  })

  it('sends no cookie header when the request has none, or when there is no request', async () => {
    $fetchMock.mockResolvedValue(ok({}))
    useRequestEvent.mockReturnValue({ node: { req: { headers: {} } } })
    await install('en')(QUERY)
    useRequestEvent.mockReturnValue(undefined)
    await install('en')(QUERY)
    for (const call of $fetchMock.mock.calls) expect(call[1].headers).not.toHaveProperty('cookie')
  })

  it('cannot renew a session on the server: a 401 is final, without a redirect', async () => {
    useRequestEvent.mockReturnValue(undefined)
    $fetchMock.mockRejectedValue(httpError(401))
    const error = await install('en')(QUERY).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(GqlError)
    expect(error).toMatchObject({ code: GQL_HTTP_ERROR, status: 401 })
    expect($fetchMock).toHaveBeenCalledOnce()
    expect(navigateTo).not.toHaveBeenCalled()
    expect(oidc.silentRenew).not.toHaveBeenCalled()
  })

  it('cannot renew a session on the server: UNAUTHENTICATED is thrown as it came', async () => {
    useRequestEvent.mockReturnValue(undefined)
    $fetchMock.mockResolvedValue(unauthenticated())
    await expect(install('en')(QUERY)).rejects.toMatchObject({ code: 'UNAUTHENTICATED' })
    expect($fetchMock).toHaveBeenCalledOnce()
    expect(oidc.silentRenew).not.toHaveBeenCalled()
  })
})
