// $gqlFetch (plugins/gqlFetch.ts) in the browser: the one GraphQL transport of the shop. The HTTP call ($fetch) and
// the OIDC client are the boundaries, mocked; the real runtime config, cookies and i18n of the Nuxt app are used.
// Run: `vp test run layers/engine/plugins/gqlFetch.nuxt.test.ts`.
import { GQL_HTTP_ERROR, GQL_NETWORK_ERROR, GqlError } from '#engine/utils/gqlError'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { SilentRenewUnavailableError } from '#engine/utils/silentRenewError'
import { fakeUserManagers, refusal } from '../../../test/helpers/fakeOidc'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { setFlags } from '../../../test/flags'
import { useRuntimeConfig } from '#imports'

const oidc = vi.hoisted(() => ({
  getAccessToken: vi.fn<() => Promise<string | null>>(),
  silentRenew: vi.fn<() => Promise<unknown>>(),
}))
const navigateTo = vi.hoisted(() => vi.fn())
const $fetchMock = vi.hoisted(() => vi.fn())
const useRequestEvent = vi.hoisted(() => vi.fn())

vi.mock('#engine/composables/useOidc', () => ({ useOidc: () => oidc }))
vi.mock('oidc-client-ts', async () =>
  (await import('../../../test/helpers/fakeOidc')).oidcClientTsFake(),
)
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

/** The real localised path of the app (language prefix) with the "session expired" flag. */
const LOGIN_EXPIRED = expect.stringMatching(/^\/[a-z]{2}\/auth\/login\?session=expired$/u)

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
  sessionStorage.clear()
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

  it('exposes the transport as nuxtApp.$gqlFetch: the provided function is the one that reaches the API', async () => {
    const provided = (
      gqlFetchPlugin as unknown as (app: unknown) => { provide: { gqlFetch: GqlFetch } }
    )({})
    expect(Object.keys(provided.provide)).toEqual(['gqlFetch'])
    $fetchMock.mockResolvedValue(ok({ products: [] }))
    await expect(provided.provide.gqlFetch(QUERY)).resolves.toEqual({ products: [] })
    expect($fetchMock).toHaveBeenCalledOnce()
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

  it('fails with the 401 and sends the customer to the login page when the renewal gives no session', async () => {
    // useOidc.silentRenew resolves null (it does not reject) for a session that is gone or refused.
    oidc.silentRenew.mockResolvedValue(null)
    $fetchMock.mockRejectedValue(httpError(401))
    const error = await install('fr')(QUERY).catch((e: unknown) => e)
    expect(error).toMatchObject({ code: GQL_HTTP_ERROR, status: 401 })
    expect($fetchMock).toHaveBeenCalledOnce()
    expect(navigateTo).toHaveBeenCalledExactlyOnceWith(LOGIN_EXPIRED)
  })

  it('does not redirect when the renewal worked', async () => {
    $fetchMock.mockRejectedValueOnce(httpError(401)).mockResolvedValueOnce(ok({}))
    await install('fr')(QUERY)
    expect(navigateTo).not.toHaveBeenCalled()
  })

  it('sends the customer back to the login page when the renewal itself fails', async () => {
    oidc.silentRenew.mockRejectedValue(new Error('refresh token revoked'))
    $fetchMock.mockRejectedValue(httpError(401))
    const error = await install('fr')(QUERY).catch((e: unknown) => e)
    expect(error).toMatchObject({ status: 401 })
    expect($fetchMock).toHaveBeenCalledOnce()
    expect(navigateTo).toHaveBeenCalledExactlyOnceWith(LOGIN_EXPIRED)
  })

  it('keeps the customer where they are when Zitadel cannot be reached (offline): the 401 is thrown, no login redirect', async () => {
    oidc.silentRenew.mockRejectedValue(new SilentRenewUnavailableError())
    $fetchMock.mockRejectedValue(httpError(401))
    const error = await install('fr')(QUERY).catch((e: unknown) => e)
    expect(error).toMatchObject({ code: GQL_HTTP_ERROR, status: 401 })
    expect($fetchMock).toHaveBeenCalledOnce()
    expect(navigateTo).not.toHaveBeenCalled()
    expect(sessionStorage.getItem('oidc_return_to')).toBeNull()
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

  it('throws the original UNAUTHENTICATED error without a login redirect when Zitadel cannot be reached (offline)', async () => {
    oidc.silentRenew.mockRejectedValue(new SilentRenewUnavailableError())
    $fetchMock.mockResolvedValue(unauthenticated())
    const error = await install('fr')(QUERY).catch((e: unknown) => e)
    expect(error).toMatchObject({ code: 'UNAUTHENTICATED' })
    expect(navigateTo).not.toHaveBeenCalled()
  })

  it('throws the original UNAUTHENTICATED error and sends the customer to the login page when the session cannot be renewed', async () => {
    oidc.silentRenew.mockResolvedValue(null)
    $fetchMock.mockResolvedValue(unauthenticated())
    const error = await install('fr')(QUERY).catch((e: unknown) => e)
    expect(error).toMatchObject({ code: 'UNAUTHENTICATED' })
    expect($fetchMock).toHaveBeenCalledOnce()
    expect(navigateTo).toHaveBeenCalledExactlyOnceWith(LOGIN_EXPIRED)
  })
})

describe('the way back from a dead session', () => {
  it('remembers the page the customer was on, so that the login brings them back to it', async () => {
    window.history.replaceState({}, '', '/fr/me/orders?tab=past#o-1')
    oidc.silentRenew.mockResolvedValue(null)
    $fetchMock.mockRejectedValue(httpError(401))
    await install('fr')(QUERY).catch(() => undefined)
    expect(sessionStorage.getItem('oidc_return_to')).toBe('/fr/me/orders?tab=past#o-1')
  })

  it('never makes the login page itself the return path (it would loop)', async () => {
    window.history.replaceState({}, '', '/fr/auth/login')
    sessionStorage.setItem('oidc_return_to', '/fr/checkout')
    oidc.silentRenew.mockResolvedValue(null)
    $fetchMock.mockRejectedValue(httpError(401))
    await install('fr')(QUERY).catch(() => undefined)
    expect(sessionStorage.getItem('oidc_return_to')).toBe('/fr/checkout')
  })
})

// The same flows with the real useOidc over a fake UserManager (the boundary to Zitadel): what the tests above fake by
// hand (`silentRenew` resolves null for a dead session, it does not reject) is here the real behaviour of the client.
describe('with the real OIDC client', () => {
  const session = (accessToken: string, expired = false) => ({
    access_token: accessToken,
    refresh_token: 'refresh-1',
    expired,
  })

  /** A fresh transport over a fresh useOidc (its user manager and in-flight renewal are module state). */
  async function withRealOidc(stored: ReturnType<typeof session> | null) {
    vi.doUnmock('#engine/composables/useOidc')
    vi.resetModules()
    fakeUserManagers().length = 0
    const { default: freshPlugin } = await import('./gqlFetch')
    const { gqlFetch } = (
      freshPlugin as unknown as (app: unknown) => { provide: { gqlFetch: GqlFetch } }
    )({ $i18n: { locale: { value: 'fr' } } }).provide
    // useOidc creates its user manager when it is first used: use it once, then give the manager its answers.
    const { useOidc } = await import('#engine/composables/useOidc')
    await useOidc().getAccessToken()
    const [manager] = fakeUserManagers()
    if (!manager) throw new Error('useOidc did not create a user manager')
    manager.getUser.mockImplementation(() => Promise.resolve(stored))
    return { gqlFetch, manager }
  }

  afterEach(() => {
    vi.doMock('#engine/composables/useOidc', () => ({ useOidc: () => oidc }))
    vi.resetModules()
  })

  it('a refresh token that Zitadel refuses ends the session: wiped, back to the login page, the 401 thrown', async () => {
    window.history.replaceState({}, '', '/fr/me')
    const { gqlFetch, manager } = await withRealOidc(session('old'))
    manager.signinSilent.mockRejectedValue(refusal('invalid_grant'))
    $fetchMock.mockRejectedValue(httpError(401))

    const error = await gqlFetch(QUERY).catch((e: unknown) => e)

    expect(error).toMatchObject({ code: GQL_HTTP_ERROR, status: 401 })
    expect(manager.signinSilent).toHaveBeenCalledOnce()
    expect(manager.removeUser).toHaveBeenCalledOnce()
    expect($fetchMock).toHaveBeenCalledOnce()
    expect(navigateTo).toHaveBeenCalledExactlyOnceWith(LOGIN_EXPIRED)
    expect(sessionStorage.getItem('oidc_return_to')).toBe('/fr/me')
  })

  it('a network failure while renewing keeps the session: not wiped, no login redirect, and the next request renews', async () => {
    const { gqlFetch, manager } = await withRealOidc(session('old', true))
    // Offline: the token lookup of the first request fails, and so does the renewal the 401 asks for, without a second
    // call to Zitadel (cooldown).
    manager.signinSilent
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(session('new'))
    $fetchMock.mockRejectedValueOnce(httpError(401))

    const error = await gqlFetch(QUERY).catch((e: unknown) => e)

    expect(error).toMatchObject({ code: GQL_HTTP_ERROR, status: 401 })
    expect(manager.removeUser).not.toHaveBeenCalled()
    expect(navigateTo).not.toHaveBeenCalled()
    // The request went out without a token (none could be had); the retry never happened.
    expect($fetchMock).toHaveBeenCalledOnce()
    expect($fetchMock.mock.calls[0]![1].headers.Authorization).toBeUndefined()
    expect(manager.signinSilent).toHaveBeenCalledOnce()

    // The network is back: the next request gets a fresh token from the same refresh token.
    window.dispatchEvent(new Event('online'))
    manager.getUser.mockImplementation(() => Promise.resolve(session('old', true)))
    $fetchMock.mockResolvedValueOnce(ok({ me: { id: 'u1' } }))
    await expect(gqlFetch(QUERY)).resolves.toEqual({ me: { id: 'u1' } })
    expect($fetchMock.mock.calls[1]![1].headers.Authorization).toBe('Bearer new')
    expect(manager.signinSilent).toHaveBeenCalledTimes(2)
    expect(navigateTo).not.toHaveBeenCalled()
  })

  it('during an outage, requests fail fast: Zitadel is asked once, not twice per request', async () => {
    const { gqlFetch, manager } = await withRealOidc(session('old', true))
    manager.signinSilent.mockRejectedValue(new TypeError('Failed to fetch'))
    $fetchMock.mockRejectedValue(httpError(401))

    for (let i = 0; i < 5; i++) {
      await expect(gqlFetch(QUERY)).rejects.toMatchObject({ status: 401 })
    }

    expect(manager.signinSilent).toHaveBeenCalledOnce()
    expect(manager.removeUser).not.toHaveBeenCalled()
    expect(navigateTo).not.toHaveBeenCalled()
  })

  it('a deterministic renewal failure (id_token validation) ends the session: it would fail every time', async () => {
    window.history.replaceState({}, '', '/fr/me')
    const { gqlFetch, manager } = await withRealOidc(session('old'))
    manager.signinSilent.mockRejectedValue(new Error('sub in id_token does not match current sub'))
    $fetchMock.mockRejectedValue(httpError(401))

    await expect(gqlFetch(QUERY)).rejects.toMatchObject({ status: 401 })

    expect(manager.removeUser).toHaveBeenCalledOnce()
    expect(navigateTo).toHaveBeenCalledExactlyOnceWith(LOGIN_EXPIRED)
  })

  it('a session that is already gone ends the same way, without asking Zitadel', async () => {
    const { gqlFetch, manager } = await withRealOidc(null)
    $fetchMock.mockResolvedValue(unauthenticated())

    await expect(gqlFetch(QUERY)).rejects.toMatchObject({ code: 'UNAUTHENTICATED' })

    expect(manager.signinSilent).not.toHaveBeenCalled()
    expect(navigateTo).toHaveBeenCalledExactlyOnceWith(LOGIN_EXPIRED)
  })

  it('two requests that get a 401 together share ONE renewal (a rotated refresh token is single use) and both retry with the new token', async () => {
    const { gqlFetch, manager } = await withRealOidc(session('old'))
    let current = session('old')
    manager.getUser.mockImplementation(() => Promise.resolve(current))
    manager.signinSilent.mockImplementation(() => {
      current = session('new')
      return Promise.resolve(current)
    })
    $fetchMock.mockImplementation((_url: string, options: { headers: Record<string, string> }) =>
      options.headers.Authorization === 'Bearer old'
        ? Promise.reject(httpError(401))
        : Promise.resolve(ok({ me: { id: 'u1' } })),
    )

    const answers = await Promise.all([gqlFetch(QUERY), gqlFetch(QUERY)])

    expect(answers).toEqual([{ me: { id: 'u1' } }, { me: { id: 'u1' } }])
    expect(manager.signinSilent).toHaveBeenCalledOnce()
    expect($fetchMock.mock.calls.map((call) => call[1].headers.Authorization)).toEqual([
      'Bearer old',
      'Bearer old',
      'Bearer new',
      'Bearer new',
    ])
    expect(navigateTo).not.toHaveBeenCalled()
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
