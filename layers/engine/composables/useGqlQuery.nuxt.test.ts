// useGqlQuery: a GraphQL query as Nuxt async data. Asserts what the callers rely on: the key (document + variables +
// language), the refetch triggers, the older-document fallback for a backend that does not know a field, and what is
// taken from the SSR payload. useAsyncData and the Nuxt payload are real; the transport ($gqlFetch) is the boundary.
// Run: `vp test run layers/engine/composables/useGqlQuery.nuxt.test.ts`.
import { GqlError, unwrapGqlError } from '#engine/utils/gqlError'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { clearNuxtData, useNuxtApp } from '#imports'
import { nextTick, ref } from 'vue'
import { gqlQueryKey } from '#engine/utils/gqlQueryKey'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { setFlags } from '../../../test/flags'

const gqlFetch = vi.hoisted(() => vi.fn())
const locale = vi.hoisted(() => ({ current: null as null | { value: string } }))
const asyncDataCalls = vi.hoisted(() => [] as unknown[][])

mockNuxtImport('useNuxtApp', async (original) => {
  const { withGqlFetch } = await import('../../../test/helpers/gqlFetch')
  return () => withGqlFetch(original(), gqlFetch)
})
// The real useAsyncData, observed: the options a caller's flags turn into are part of the contract.
mockNuxtImport('useAsyncData', (original) => (...args: unknown[]) => {
  asyncDataCalls.push(args)
  return (original as (...a: unknown[]) => unknown)(...args)
})
vi.mock('vue-i18n', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-i18n')>()),
  useI18n: () => ({ locale: locale.current }),
}))

const { useGqlQuery } = await import('./useGqlQuery')

/**
 * `await useGqlQuery()` is typed as the bare AsyncData (an AsyncData is itself awaitable, so TypeScript flattens the
 * promise and loses `refetch`); at run time the object has it.
 */
const withRefetch = <T>(asyncData: T) => asyncData as T & { refetch: () => Promise<void> }

let n = 0
/** A document no other test asks: Nuxt keeps async data by key. */
const doc = () => `query Q${++n} { thing { id } }`

const unsupported = (err: unknown) =>
  err instanceof GqlError && err.code === 'GRAPHQL_VALIDATION_FAILED'
const validationError = () =>
  new GqlError([{ message: 'unknown field', extensions: { code: 'GRAPHQL_VALIDATION_FAILED' } }])

beforeEach(() => {
  vi.resetAllMocks()
  asyncDataCalls.length = 0
  clearNuxtData()
  locale.current = ref('fr')
  const nuxtApp = useNuxtApp()
  nuxtApp.isHydrating = false
  for (const key of Object.keys(nuxtApp.payload.data)) delete nuxtApp.payload.data[key]
})

describe('asking', () => {
  it('asks through the shared transport with the variables, and exposes the answer', async () => {
    const query = doc()
    gqlFetch.mockResolvedValue({ thing: { id: 't1' } })

    const { data, error, pending } = await useGqlQuery<{ thing: { id: string } }>(query, { id: 1 })

    expect(gqlFetch).toHaveBeenCalledExactlyOnceWith(query, { variables: { id: 1 } })
    expect(data.value).toEqual({ thing: { id: 't1' } })
    expect(error.value).toBeUndefined()
    expect(pending.value).toBe(false)
  })

  it('asks without variables by default', async () => {
    const query = doc()
    gqlFetch.mockResolvedValue({})
    await useGqlQuery(query)
    expect(gqlFetch).toHaveBeenCalledExactlyOnceWith(query, { variables: {} })
  })

  it('evaluates variables given as a function at the time of the call', async () => {
    const query = doc()
    gqlFetch.mockResolvedValue({})
    const page = ref(2)
    await useGqlQuery(query, () => ({ page: page.value }))
    expect(gqlFetch).toHaveBeenCalledExactlyOnceWith(query, { variables: { page: 2 } })
  })

  it('surfaces a failed call as `error` with no data; Nuxt wraps it, the GqlError stays reachable for the error messages', async () => {
    const failure = new GqlError([{ message: 'down', extensions: { code: 'FORBIDDEN' } }], {
      status: 503,
    })
    gqlFetch.mockRejectedValue(failure)
    const { data, error } = await useGqlQuery(doc())
    expect(error.value).toMatchObject({ message: 'down', statusCode: 503 })
    expect(unwrapGqlError(error.value)).toBe(failure)
    expect(data.value).toBeUndefined()
  })

  it('does not ask before it is told to when `immediate` is false', async () => {
    const query = doc()
    gqlFetch.mockResolvedValue({ thing: 1 })
    const result = withRefetch(await useGqlQuery(query, {}, { immediate: false }))
    expect(gqlFetch).not.toHaveBeenCalled()
    await result.refetch()
    expect(gqlFetch).toHaveBeenCalledOnce()
    expect(result.data.value).toEqual({ thing: 1 })
  })
})

describe('refetch', () => {
  it('asks again and replaces the answer', async () => {
    gqlFetch.mockResolvedValueOnce({ v: 1 }).mockResolvedValueOnce({ v: 2 })
    const result = withRefetch(await useGqlQuery(doc()))
    expect(result.data.value).toEqual({ v: 1 })

    await result.refetch()

    expect(gqlFetch).toHaveBeenCalledTimes(2)
    expect(result.data.value).toEqual({ v: 2 })
  })

  it('is the refresh of the async data', async () => {
    gqlFetch.mockResolvedValue({})
    const result = withRefetch(await useGqlQuery(doc()))
    expect(result.refetch).toBe(result.refresh)
  })
})

describe('the key: document, variables and language', () => {
  it('is gqlQueryKey(document, variables, language)', async () => {
    const query = doc()
    gqlFetch.mockResolvedValue({})
    await useGqlQuery(query, { id: 7 })
    const key = asyncDataCalls[0]![0] as () => string
    expect(key()).toBe(gqlQueryKey(query, { id: 7 }, 'fr'))
    locale.current!.value = 'nl'
    expect(key()).toBe(gqlQueryKey(query, { id: 7 }, 'nl'))
  })

  it('asks again, under the new key, when a variable from a getter changes', async () => {
    const query = doc()
    gqlFetch.mockImplementation((_q: string, { variables }: { variables: { id: number } }) =>
      Promise.resolve({ id: variables.id }),
    )
    const id = ref(1)
    const { data } = await useGqlQuery<{ id: number }>(query, () => ({ id: id.value }))
    expect(data.value).toEqual({ id: 1 })

    id.value = 2
    await vi.waitFor(() => {
      expect(data.value).toEqual({ id: 2 })
    })
    expect(gqlFetch).toHaveBeenCalledTimes(2)
    expect(gqlFetch).toHaveBeenLastCalledWith(query, { variables: { id: 2 } })
  })

  it('a slow answer for the old variables never lands on the new ones', async () => {
    const query = doc()
    let releaseOld: (value: unknown) => void = () => undefined
    gqlFetch.mockImplementation((_q: string, { variables }: { variables: { id: number } }) =>
      variables.id === 1
        ? new Promise((resolve) => {
            releaseOld = resolve
          })
        : Promise.resolve({ id: variables.id }),
    )
    const id = ref(1)
    const pendingCall = useGqlQuery<{ id: number }>(query, () => ({ id: id.value }), { lazy: true })
    await nextTick()
    id.value = 2
    await vi.waitFor(() => {
      expect(gqlFetch).toHaveBeenCalledTimes(2)
    })
    releaseOld({ id: 1 }) // The old request answers last
    const { data } = await pendingCall
    await vi.waitFor(() => {
      expect(data.value).toEqual({ id: 2 })
    })
    await nextTick()
    expect(data.value).toEqual({ id: 2 })
  })

  it('asks again in the new language when the locale changes', async () => {
    const query = doc()
    let language = 'fr'
    gqlFetch.mockImplementation(() => Promise.resolve({ name: `name-${language}` }))
    const { data } = await useGqlQuery<{ name: string }>(query)
    expect(data.value).toEqual({ name: 'name-fr' })

    language = 'nl'
    locale.current!.value = 'nl'
    await vi.waitFor(() => {
      expect(data.value).toEqual({ name: 'name-nl' })
    })
    expect(gqlFetch).toHaveBeenCalledTimes(2)
  })
})

describe('an older document for a backend that does not know a field (legacy)', () => {
  const setup = (query: string, flag = ref(false), variables?: Record<string, unknown>) => ({
    flag,
    legacy: { query: `${query} legacy`, variables, isUnsupported: unsupported, unsupported: flag },
  })

  it('asks the main document only when the backend knows it', async () => {
    const query = doc()
    const { flag, legacy } = setup(query)
    gqlFetch.mockResolvedValue({ ok: true })
    await useGqlQuery(query, {}, { legacy })
    expect(gqlFetch).toHaveBeenCalledExactlyOnceWith(query, { variables: {} })
    expect(flag.value).toBe(false)
  })

  it('falls back to the legacy document when the backend rejects the main one, and remembers it', async () => {
    const query = doc()
    const { flag, legacy } = setup(query)
    gqlFetch.mockRejectedValueOnce(validationError()).mockResolvedValueOnce({ legacy: true })

    const { data, error } = await useGqlQuery(query, { id: 1 }, { legacy })

    expect(gqlFetch.mock.calls).toEqual([
      [query, { variables: { id: 1 } }],
      [`${query} legacy`, { variables: { id: 1 } }],
    ])
    expect(data.value).toEqual({ legacy: true })
    expect(error.value).toBeUndefined()
    expect(flag.value).toBe(true)
  })

  it('asks the legacy document straight away once the backend is known to be old', async () => {
    const query = doc()
    const { legacy } = setup(query, ref(true))
    gqlFetch.mockResolvedValue({ legacy: true })
    await useGqlQuery(query, {}, { legacy })
    expect(gqlFetch).toHaveBeenCalledExactlyOnceWith(`${query} legacy`, { variables: {} })
  })

  it('asks the legacy document with its own variables when it has some (it must not be sent one it does not declare)', async () => {
    const query = doc()
    const { legacy } = setup(query, ref(true), { id: 1 })
    gqlFetch.mockResolvedValue({})
    await useGqlQuery(query, { id: 1, withPolicy: true }, { legacy })
    expect(gqlFetch).toHaveBeenCalledExactlyOnceWith(`${query} legacy`, { variables: { id: 1 } })
  })

  it('keeps the key of the main document', async () => {
    const query = doc()
    const { legacy } = setup(query, ref(true))
    gqlFetch.mockResolvedValue({})
    await useGqlQuery(query, {}, { legacy })
    expect((asyncDataCalls[0]![0] as () => string)()).toBe(gqlQueryKey(query, {}, 'fr'))
  })

  it('rethrows any other error without switching to the legacy document', async () => {
    const query = doc()
    const { flag, legacy } = setup(query)
    const failure = new GqlError([{ message: 'down' }], { status: 503 })
    gqlFetch.mockRejectedValue(failure)

    const { error } = await useGqlQuery(query, {}, { legacy })

    expect(unwrapGqlError(error.value)).toBe(failure)
    expect(gqlFetch).toHaveBeenCalledOnce()
    expect(flag.value).toBe(false)
  })

  it('fails when the legacy document fails too', async () => {
    const query = doc()
    const { legacy } = setup(query)
    const failure = new Error('still failing')
    gqlFetch.mockRejectedValueOnce(validationError()).mockRejectedValueOnce(failure)
    const { error } = await useGqlQuery(query, {}, { legacy })
    expect(error.value).toMatchObject({ message: 'still failing', cause: failure })
  })
})

describe('the options of the callers', () => {
  it('asks at once and the answer is there when the call resolves (immediate, blocking)', async () => {
    gqlFetch.mockResolvedValue({ ready: true })
    const { data, pending } = await useGqlQuery(doc())
    expect(data.value).toEqual({ ready: true })
    expect(pending.value).toBe(false)
  })

  it('two concurrent callers of the same query share one request with dedupe: defer', async () => {
    const query = doc()
    let finish: (value: unknown) => void = () => undefined
    gqlFetch.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve
      }),
    )
    const first = useGqlQuery(query, {}, { dedupe: 'defer', immediate: true })
    const second = useGqlQuery(query, {}, { dedupe: 'defer', immediate: true })
    await nextTick()
    finish({ shared: true })
    const [a, b] = await Promise.all([first, second])
    expect(gqlFetch).toHaveBeenCalledOnce()
    expect(a.data.value).toEqual({ shared: true })
    expect(b.data.value).toEqual({ shared: true })
  })

  it('by default (cancel) a second caller of a query in flight asks again, and both end with the newest answer', async () => {
    const query = doc()
    let call = 0
    gqlFetch.mockImplementation(() => Promise.resolve({ call: ++call }))
    const first = useGqlQuery<{ call: number }>(query, {}, { immediate: true })
    const second = useGqlQuery<{ call: number }>(query, {}, { immediate: true })
    const [a, b] = await Promise.all([first, second])
    expect(gqlFetch).toHaveBeenCalledTimes(2)
    expect(a.data.value).toEqual({ call: 2 })
    expect(b.data.value).toEqual({ call: 2 })
  })
})

describe('the server-rendered answer (SSR payload)', () => {
  const payloadKey = (query: string, variables: Record<string, unknown> = {}, language = 'fr') =>
    gqlQueryKey(query, variables, language)

  it('is adopted by the first run while the browser hydrates, instead of asking again', async () => {
    const query = doc()
    const nuxtApp = useNuxtApp()
    nuxtApp.isHydrating = true
    nuxtApp.payload.data[payloadKey(query)] = { fromServer: true }

    const { data } = await useGqlQuery<{ fromServer: boolean }>(query)

    expect(gqlFetch).not.toHaveBeenCalled()
    expect(data.value).toEqual({ fromServer: true })
  })

  it('is not used for a refetch once the app has hydrated: it goes to the network and replaces the answer', async () => {
    const query = doc()
    const nuxtApp = useNuxtApp()
    nuxtApp.isHydrating = true
    nuxtApp.payload.data[payloadKey(query)] = { fromServer: true }
    const result = withRefetch(await useGqlQuery<Record<string, boolean>>(query))
    expect(gqlFetch).not.toHaveBeenCalled()

    nuxtApp.isHydrating = false
    gqlFetch.mockResolvedValue({ fresh: true })
    await result.refetch()

    expect(gqlFetch).toHaveBeenCalledOnce()
    expect(result.data.value).toEqual({ fresh: true })
  })

  it('is not used for a refetch asked while the app is still hydrating either: only the first run adopts it', async () => {
    const query = doc()
    const nuxtApp = useNuxtApp()
    nuxtApp.isHydrating = true
    nuxtApp.payload.data[payloadKey(query)] = { fromServer: true }
    const result = withRefetch(await useGqlQuery<Record<string, boolean>>(query))
    expect(gqlFetch).not.toHaveBeenCalled()

    gqlFetch.mockResolvedValue({ fresh: true })
    await result.refetch()

    expect(gqlFetch).toHaveBeenCalledOnce()
    expect(result.data.value).toEqual({ fresh: true })
  })

  it('is not used for the answer under a new key (language or variables change) after hydration, even if the payload holds one', async () => {
    const query = doc()
    const nuxtApp = useNuxtApp()
    nuxtApp.payload.data[payloadKey(query, { id: 2 })] = { stale: true }
    gqlFetch.mockImplementation((_q: string, { variables }: { variables: { id: number } }) =>
      Promise.resolve({ id: variables.id }),
    )
    const id = ref(1)
    const { data } = await useGqlQuery<Record<string, unknown>>(query, () => ({ id: id.value }))
    expect(data.value).toEqual({ id: 1 })

    id.value = 2
    await vi.waitFor(() => {
      expect(data.value).toEqual({ id: 2 })
    })
    expect(gqlFetch).toHaveBeenLastCalledWith(query, { variables: { id: 2 } })
  })

  it('is reused during the server render itself: a second component asking for the same document costs no request', async () => {
    const query = doc()
    gqlFetch.mockResolvedValue({ answered: true })
    setFlags({ server: true })
    const first = await useGqlQuery<Record<string, boolean>>(query)
    const second = await useGqlQuery<Record<string, boolean>>(query)
    expect(first.data.value).toEqual({ answered: true })
    expect(second.data.value).toEqual({ answered: true })
    expect(gqlFetch).toHaveBeenCalledOnce()
  })

  it('is not used outside hydration and the server render (a client-side navigation asks for fresh data)', async () => {
    const query = doc()
    gqlFetch.mockResolvedValue({ fresh: true })
    useNuxtApp().payload.data[payloadKey(query)] = { stale: true }
    const { data } = await useGqlQuery<Record<string, boolean>>(query)
    expect(gqlFetch).toHaveBeenCalledOnce()
    expect(data.value).toEqual({ fresh: true })
  })
})
