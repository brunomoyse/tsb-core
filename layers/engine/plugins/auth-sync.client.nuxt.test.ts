// Auth-sync plugin: once the app is ready, reconciles the Pinia user record with the OIDC token store (they can drift
// apart after a release or an interrupted logout). The OIDC client, $fetch (the /me call) and the error reporter are the
// boundaries; the auth store (real Pinia + localStorage) is the state that is checked.
// Run: `vp test run layers/engine/plugins/auth-sync.client.nuxt.test.ts`.
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { createPinia, setActivePinia } from 'pinia'
import { SilentRenewUnavailableError } from '#engine/utils/silentRenewError'
import { makeUser } from '../../../test/fixtures/auth'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { setFlags } from '../../../test/flags'
import { useRuntimeConfig } from '#imports'

const oidc = vi.hoisted(() => ({
  isAuthenticated: vi.fn<() => Promise<boolean>>(),
  silentRenew: vi.fn<() => Promise<unknown>>(),
  removeUser: vi.fn<() => Promise<void>>(),
  getAccessToken: vi.fn<() => Promise<string | null>>(),
}))
const $fetchMock = vi.hoisted(() => vi.fn())
const reportError = vi.hoisted(() => vi.fn())
const whenReady = vi.hoisted(() => ({ callbacks: [] as (() => void)[] }))

vi.mock('#engine/composables/useOidc', () => ({ useOidc: () => oidc }))
vi.mock('#engine/utils/reportError', () => ({ reportError }))
mockNuxtImport('$fetch', () => $fetchMock)
mockNuxtImport('onNuxtReady', () => (callback: () => void) => {
  whenReady.callbacks.push(callback)
})

const { default: plugin } = await import('./auth-sync.client')
const { useAuthStore } = await import('#engine/stores/auth')

// defineNuxtPlugin({ name, parallel, setup }) is the setup function carrying the other fields as properties.
const definition = Object.assign(plugin as unknown as (nuxtApp: unknown) => void, {
  setup: plugin as unknown as (nuxtApp: unknown) => void,
})

/** Runs the plugin as the app does and returns the promise of the reconciliation. */
async function sync(): Promise<void> {
  let reconciliation: Promise<void> = Promise.resolve()
  definition.setup({
    runWithContext: (fn: () => Promise<void>) => {
      reconciliation = fn()
      return reconciliation
    },
  })
  expect(whenReady.callbacks).toHaveLength(1)
  whenReady.callbacks[0]!()
  await reconciliation
}

const freshStore = (user: ReturnType<typeof makeUser> | null) => {
  setActivePinia(createPinia())
  const store = useAuthStore()
  store.user = user
  return store
}

beforeEach(() => {
  vi.resetAllMocks()
  whenReady.callbacks.length = 0
  oidc.isAuthenticated.mockResolvedValue(false)
  oidc.silentRenew.mockResolvedValue(null)
  oidc.removeUser.mockResolvedValue(undefined)
  oidc.getAccessToken.mockResolvedValue('token-1')
})

describe('registration', () => {
  it('is a parallel, non-blocking plugin that waits for the app to be ready before doing anything', () => {
    const meta = plugin as unknown as { _name: string; parallel: boolean }
    expect(meta._name).toBe('auth-sync')
    expect(meta.parallel).toBe(true)
    definition.setup({ runWithContext: vi.fn(() => Promise.resolve()) })
    expect(whenReady.callbacks).toHaveLength(1)
    expect(oidc.isAuthenticated).not.toHaveBeenCalled()
  })

  it('reports a reconciliation that fails instead of breaking the app', async () => {
    const failure = new Error('oidc storage unavailable')
    definition.setup({ runWithContext: () => Promise.reject(failure) })
    whenReady.callbacks[0]!()
    await vi.waitFor(() => {
      expect(reportError).toHaveBeenCalledExactlyOnceWith(failure, 'auth.sync')
    })
  })

  it('reports it when the OIDC client throws while reading the session', async () => {
    const failure = new Error('localStorage blocked')
    oidc.isAuthenticated.mockRejectedValue(failure)
    freshStore(null)
    const reconciliation = Promise.resolve().then(async () => {
      let run: Promise<void> = Promise.resolve()
      definition.setup({
        runWithContext: (fn: () => Promise<void>) => {
          run = fn()
          return run
        },
      })
      whenReady.callbacks[0]!()
      await run
    })
    await expect(reconciliation).rejects.toBe(failure)
    expect(reportError).toHaveBeenCalledExactlyOnceWith(failure, 'auth.sync')
  })
})

describe('case 1: a profile is stored but the OIDC session is gone or expired', () => {
  it('drops the profile even when the OIDC store cannot be cleaned (no ghost user), and reports it', async () => {
    const store = freshStore(makeUser())
    const failure = new Error('localStorage blocked')
    oidc.removeUser.mockRejectedValue(failure)
    let run: Promise<void> = Promise.resolve()
    definition.setup({
      runWithContext: (fn: () => Promise<void>) => {
        run = fn()
        return run
      },
    })
    whenReady.callbacks[0]!()
    await expect(run).rejects.toBe(failure)
    expect(store.user).toBeNull()
    expect(reportError).toHaveBeenCalledExactlyOnceWith(failure, 'auth.sync')
  })

  it('keeps both when the session renews silently', async () => {
    const store = freshStore(makeUser())
    oidc.silentRenew.mockResolvedValue({ access_token: 'fresh' })

    await sync()

    expect(store.user).toEqual(makeUser())
    expect(oidc.removeUser).not.toHaveBeenCalled()
  })

  it('clears both the OIDC session and the profile when the renewal fails (the navbar must not show a ghost user)', async () => {
    const store = freshStore(makeUser())
    oidc.silentRenew.mockResolvedValue(null)

    await sync()

    expect(oidc.removeUser).toHaveBeenCalledOnce()
    expect(store.user).toBeNull()
    expect($fetchMock).not.toHaveBeenCalled()
  })
})

describe('case 1 when Zitadel cannot be reached', () => {
  it('keeps both the profile and the OIDC session (offline is not a dead session)', async () => {
    const store = freshStore(makeUser())
    oidc.silentRenew.mockRejectedValue(new SilentRenewUnavailableError())

    await sync()

    expect(oidc.removeUser).not.toHaveBeenCalled()
    expect(store.user).toEqual(makeUser())
    expect(reportError).not.toHaveBeenCalled()
  })

  it('reports an unexpected failure of the renewal, and leaves the profile alone', async () => {
    const store = freshStore(makeUser())
    const bug = new TypeError('boom')
    oidc.silentRenew.mockRejectedValue(bug)
    let run: Promise<void> = Promise.resolve()
    definition.setup({
      runWithContext: (fn: () => Promise<void>) => {
        run = fn()
        return run
      },
    })
    whenReady.callbacks[0]!()
    await expect(run).rejects.toBe(bug)

    expect(reportError).toHaveBeenCalledExactlyOnceWith(bug, 'auth.sync')
    expect(store.user).toEqual(makeUser())
  })
})

describe('case 2: the OIDC session is valid but no profile is stored', () => {
  it('loads /me with the token and stores the profile', async () => {
    const store = freshStore(null)
    oidc.isAuthenticated.mockResolvedValue(true)
    $fetchMock.mockResolvedValue({ data: { me: makeUser({ firstName: 'Restored' }) } })

    await sync()

    expect(store.user).toEqual(makeUser({ firstName: 'Restored' }))
    expect($fetchMock).toHaveBeenCalledExactlyOnceWith(useRuntimeConfig().public.graphqlHttp, {
      method: 'POST',
      headers: { Authorization: 'Bearer token-1' },
      body: { query: expect.stringContaining('query AuthSyncMe'), variables: {} },
    })
    expect(oidc.removeUser).not.toHaveBeenCalled()
  })

  it('does nothing when the token turns out to be unavailable', async () => {
    const store = freshStore(null)
    oidc.isAuthenticated.mockResolvedValue(true)
    oidc.getAccessToken.mockResolvedValue(null)

    await sync()

    expect($fetchMock).not.toHaveBeenCalled()
    expect(store.user).toBeNull()
    expect(oidc.removeUser).not.toHaveBeenCalled()
  })

  it.each([
    [
      'GraphQL UNAUTHENTICATED',
      { errors: [{ message: 'no', extensions: { code: 'UNAUTHENTICATED' } }] },
    ],
    [
      'UNAUTHENTICATED among other errors',
      { errors: [{ message: 'x' }, { message: 'no', extensions: { code: 'UNAUTHENTICATED' } }] },
    ],
  ])('drops the stale OIDC session when /me answers %s', async (_label, answer) => {
    const store = freshStore(null)
    oidc.isAuthenticated.mockResolvedValue(true)
    $fetchMock.mockResolvedValue(answer)

    await sync()

    expect(oidc.removeUser).toHaveBeenCalledOnce()
    expect(store.user).toBeNull()
  })

  it.each([
    ['no `me` in the answer', { data: {} }],
    [
      'a GraphQL error that is not about the token',
      { errors: [{ message: 'boom', extensions: { code: 'INTERNAL' } }] },
    ],
    ['an error without extensions', { errors: [{ message: 'boom' }] }],
    ['an empty answer', undefined],
  ])(
    'keeps the OIDC session when /me answers %s (nothing says the token is bad)',
    async (_label, answer) => {
      const store = freshStore(null)
      oidc.isAuthenticated.mockResolvedValue(true)
      $fetchMock.mockResolvedValue(answer)

      await sync()

      expect(oidc.removeUser).not.toHaveBeenCalled()
      expect(store.user).toBeNull()
    },
  )

  it.each([
    ['status', { status: 401 }],
    ['statusCode', { statusCode: 401 }],
  ])(
    'drops the stale OIDC session when the backend refuses the token with HTTP 401 (%s), without reporting it',
    async (_label, props) => {
      const store = freshStore(null)
      oidc.isAuthenticated.mockResolvedValue(true)
      $fetchMock.mockRejectedValue(Object.assign(new Error('401'), props))

      await sync()

      expect(oidc.removeUser).toHaveBeenCalledOnce()
      expect(store.user).toBeNull()
      expect(reportError).not.toHaveBeenCalled()
    },
  )

  it.each([
    ['the network dropped', new TypeError('Failed to fetch')],
    [
      'the request was aborted by a navigation',
      Object.assign(new Error('aborted'), { name: 'AbortError' }),
    ],
    ['the backend failed (502)', Object.assign(new Error('502'), { status: 502 })],
    [
      'the backend refused for another reason (403)',
      Object.assign(new Error('403'), { status: 403 }),
    ],
    ['something that is not an error was thrown', 'boom'],
    ['null was thrown', null],
  ])(
    'keeps the OIDC session when %s while loading /me: no sign-out mid-order',
    async (_label, failure) => {
      const store = freshStore(null)
      oidc.isAuthenticated.mockResolvedValue(true)
      $fetchMock.mockRejectedValue(failure)

      await sync()

      expect(oidc.removeUser).not.toHaveBeenCalled()
      expect(store.user).toBeNull()
      expect(reportError).not.toHaveBeenCalled()
    },
  )

  it('says so on the console in development', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    setFlags({ dev: true })
    freshStore(null)
    oidc.isAuthenticated.mockResolvedValue(true)
    const failure = Object.assign(new Error('401'), { status: 401 })
    $fetchMock.mockRejectedValue(failure)

    await sync()

    expect(warn).toHaveBeenCalledExactlyOnceWith('[auth-sync] /me rejected the token', failure)
    warn.mockRestore()
  })

  it('says that the session was kept when the failure is not a refusal, in development', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    setFlags({ dev: true })
    freshStore(null)
    oidc.isAuthenticated.mockResolvedValue(true)
    const failure = new TypeError('Failed to fetch')
    $fetchMock.mockRejectedValue(failure)

    await sync()

    expect(warn).toHaveBeenCalledExactlyOnceWith('[auth-sync] /me failed, session kept', failure)
    warn.mockRestore()
  })

  it('stays silent in production', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    freshStore(null)
    oidc.isAuthenticated.mockResolvedValue(true)
    $fetchMock.mockRejectedValue(Object.assign(new Error('401'), { status: 401 }))
    await sync()
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })
})

describe('case 3: nothing to reconcile', () => {
  it('leaves an anonymous visitor alone', async () => {
    const store = freshStore(null)
    await sync()
    expect(oidc.silentRenew).not.toHaveBeenCalled()
    expect(oidc.removeUser).not.toHaveBeenCalled()
    expect($fetchMock).not.toHaveBeenCalled()
    expect(store.user).toBeNull()
  })

  it('leaves a signed-in customer whose profile and session agree alone', async () => {
    const store = freshStore(makeUser())
    oidc.isAuthenticated.mockResolvedValue(true)
    await sync()
    expect(oidc.silentRenew).not.toHaveBeenCalled()
    expect(oidc.removeUser).not.toHaveBeenCalled()
    expect($fetchMock).not.toHaveBeenCalled()
    expect(store.user).toEqual(makeUser())
  })
})
