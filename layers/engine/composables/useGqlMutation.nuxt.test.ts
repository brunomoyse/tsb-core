// useGqlMutation: `mutate()` through the shared GraphQL transport, with reactive data / loading / error for the UI.
// The transport ($gqlFetch, provided by the gqlFetch plugin) is the boundary, replaced on the real nuxtApp.
// Run: `vp test run layers/engine/composables/useGqlMutation.nuxt.test.ts`.
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { GqlError } from '#engine/utils/gqlError'

const gqlFetch = vi.hoisted(() => vi.fn())
mockNuxtImport('useNuxtApp', async (original) => {
  const { withGqlFetch } = await import('../../../test/helpers/gqlFetch')
  return () => withGqlFetch(original(), gqlFetch)
})

const { useGqlMutation } = await import('./useGqlMutation')

const MUTATION = 'mutation UpdateMe($firstName: String!) { updateMe(firstName: $firstName) { id } }'

beforeEach(() => {
  vi.resetAllMocks()
})

describe('mutate', () => {
  it('sends the mutation with its variables and resolves with the answer, which `data` also holds', async () => {
    gqlFetch.mockResolvedValue({ updateMe: { id: 'u1' } })
    const { mutate, data } = useGqlMutation<{ updateMe: { id: string } }>(MUTATION)

    await expect(mutate({ firstName: 'Ada' })).resolves.toEqual({ updateMe: { id: 'u1' } })

    expect(gqlFetch).toHaveBeenCalledExactlyOnceWith(MUTATION, { variables: { firstName: 'Ada' } })
    expect(data.value).toEqual({ updateMe: { id: 'u1' } })
  })

  it('sends empty variables when none are given', async () => {
    gqlFetch.mockResolvedValue({})
    await useGqlMutation('mutation { logout }').mutate()
    expect(gqlFetch).toHaveBeenCalledExactlyOnceWith('mutation { logout }', { variables: {} })
  })

  it('is loading while the request is in flight, and not before or after', async () => {
    let finish: (value: unknown) => void = () => undefined
    gqlFetch.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve
      }),
    )
    const { mutate, loading } = useGqlMutation(MUTATION)
    expect(loading.value).toBe(false)

    const pending = mutate({ firstName: 'Ada' })
    expect(loading.value).toBe(true)
    finish({ ok: true })
    await pending

    expect(loading.value).toBe(false)
  })
})

describe('a failed mutation', () => {
  it('throws the GqlError to the caller, keeps it in `error` and stops loading', async () => {
    const failure = new GqlError([{ message: 'nope', extensions: { code: 'FORBIDDEN' } }])
    gqlFetch.mockRejectedValue(failure)
    const { mutate, data, error, loading } = useGqlMutation(MUTATION)

    await expect(mutate({ firstName: 'Ada' })).rejects.toBe(failure)

    expect(error.value).toBe(failure)
    expect(data.value).toBeUndefined()
    expect(loading.value).toBe(false)
  })

  it('clears the previous error when the next call starts, and keeps the previous data until it answers', async () => {
    const { mutate, data, error } = useGqlMutation<{ n: number }>(MUTATION)
    gqlFetch.mockResolvedValueOnce({ n: 1 })
    await mutate()
    gqlFetch.mockRejectedValueOnce(new Error('offline'))
    await mutate().catch(() => undefined)
    expect(error.value).toBeInstanceOf(Error)
    // Data of the earlier success is left alone by a failure.
    expect(data.value).toEqual({ n: 1 })

    let finish: (value: unknown) => void = () => undefined
    gqlFetch.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve
      }),
    )
    const retry = mutate()
    expect(error.value).toBeUndefined()
    finish({ n: 2 })
    await retry
    expect(data.value).toEqual({ n: 2 })
  })
})
