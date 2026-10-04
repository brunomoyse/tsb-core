// Auth store: the signed-in customer's profile, logout and account-deletion clean-up, and its localStorage persistence.
// The OIDC client (Zitadel) and the error reporter are the boundaries, mocked.
// Run: `vp test run layers/engine/stores/auth.nuxt.test.ts`.
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { createApp, nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { createPersistedState } from 'pinia-plugin-persistedstate'
import { makeUser } from '../../../test/fixtures/auth'
import { setFlags } from '../../../test/flags'

const oidc = vi.hoisted(() => ({
  signOut: vi.fn<() => Promise<void>>(),
  removeUser: vi.fn<() => Promise<void>>(),
}))
const reportError = vi.hoisted(() => vi.fn())

vi.mock('#engine/composables/useOidc', () => ({ useOidc: () => oidc }))
vi.mock('#engine/utils/reportError', () => ({ reportError }))

const { useAuthStore } = await import('./auth')

function freshStore() {
  setActivePinia(createPinia())
  return useAuthStore()
}

/** A pinia with the real persistence plugin, as @pinia/nuxt installs it, over happy-dom's localStorage. */
function persistedStore() {
  const pinia = createPinia()
  pinia.use(createPersistedState())
  createApp({}).use(pinia)
  setActivePinia(pinia)
  return useAuthStore()
}

beforeEach(() => {
  vi.resetAllMocks()
  oidc.signOut.mockResolvedValue(undefined)
  oidc.removeUser.mockResolvedValue(undefined)
  localStorage.clear()
})

describe('the profile', () => {
  it('starts anonymous', () => {
    expect(freshStore().user).toBeNull()
  })

  it('setUser stores the profile, clearUser forgets it', () => {
    const auth = freshStore()
    const user = makeUser()
    auth.setUser(user)
    expect(auth.user).toEqual(user)
    auth.clearUser()
    expect(auth.user).toBeNull()
  })

  it('updateUser merges the changed fields into the loaded profile', () => {
    const auth = freshStore()
    auth.setUser(makeUser())
    auth.updateUser({ firstName: 'Grace', phoneNumber: null })
    expect(auth.user).toEqual(makeUser({ firstName: 'Grace', phoneNumber: null }))
  })

  it('updateUser adopts the given profile when no user is loaded yet', () => {
    const auth = freshStore()
    const profile = makeUser({ id: 'user-2' })
    auth.updateUser(profile)
    expect(auth.user).toEqual(profile)
  })
})

describe('logout', () => {
  it('forgets the user, wipes the persisted copy and signs out of Zitadel', async () => {
    const auth = freshStore()
    auth.setUser(makeUser())
    localStorage.setItem('auth', '{"user":{"id":"user-1"}}')

    await auth.logout()

    expect(auth.user).toBeNull()
    expect(localStorage.getItem('auth')).toBeNull()
    expect(oidc.signOut).toHaveBeenCalledOnce()
    expect(oidc.removeUser).not.toHaveBeenCalled()
    expect(reportError).not.toHaveBeenCalled()
  })

  it('has already cleared the local session when the redirect to Zitadel starts', async () => {
    const auth = freshStore()
    auth.setUser(makeUser())
    localStorage.setItem('auth', 'persisted')
    let seenAtSignOut: unknown
    oidc.signOut.mockImplementation(() => {
      seenAtSignOut = { user: auth.user, persisted: localStorage.getItem('auth') }
      return Promise.resolve()
    })
    await auth.logout()
    expect(seenAtSignOut).toEqual({ user: null, persisted: null })
  })

  it('reports a failed Zitadel sign-out but the customer stays logged out locally', async () => {
    const auth = freshStore()
    auth.setUser(makeUser())
    const failure = new Error('end-session unreachable')
    oidc.signOut.mockRejectedValue(failure)

    await expect(auth.logout()).resolves.toBeUndefined()

    expect(reportError).toHaveBeenCalledExactlyOnceWith(failure, 'auth.logout')
    expect(auth.user).toBeNull()
  })

  it('leaves localStorage alone during SSR', async () => {
    setFlags({ server: true })
    const auth = freshStore()
    localStorage.setItem('auth', 'persisted')
    await auth.logout()
    expect(localStorage.getItem('auth')).toBe('persisted')
    expect(auth.user).toBeNull()
  })
})

describe('deleteAccountSession', () => {
  it('wipes the local session without the Zitadel end-session round-trip', async () => {
    const auth = freshStore()
    auth.setUser(makeUser())
    localStorage.setItem('auth', 'persisted')

    await auth.deleteAccountSession()

    expect(auth.user).toBeNull()
    expect(localStorage.getItem('auth')).toBeNull()
    expect(oidc.removeUser).toHaveBeenCalledOnce()
    expect(oidc.signOut).not.toHaveBeenCalled()
  })

  it('reports a failure to remove the OIDC user and still clears the profile', async () => {
    const auth = freshStore()
    auth.setUser(makeUser())
    const failure = new Error('storage unavailable')
    oidc.removeUser.mockRejectedValue(failure)

    await expect(auth.deleteAccountSession()).resolves.toBeUndefined()

    expect(reportError).toHaveBeenCalledExactlyOnceWith(failure, 'auth.deleteAccountClearSession')
    expect(auth.user).toBeNull()
  })

  it('leaves localStorage alone during SSR', async () => {
    setFlags({ server: true })
    const auth = freshStore()
    localStorage.setItem('auth', 'persisted')
    await auth.deleteAccountSession()
    expect(localStorage.getItem('auth')).toBe('persisted')
    expect(oidc.removeUser).toHaveBeenCalledOnce()
  })
})

describe('persistence', () => {
  it('writes the user to localStorage under "auth" when it changes', async () => {
    const auth = persistedStore()
    await nextTick()
    auth.setUser(makeUser())
    await nextTick()
    expect(JSON.parse(localStorage.getItem('auth') ?? 'null')).toEqual({ user: makeUser() })
  })

  it('restores the user from localStorage when the store is created', () => {
    localStorage.setItem('auth', JSON.stringify({ user: makeUser({ firstName: 'Restored' }) }))
    expect(persistedStore().user).toMatchObject({ firstName: 'Restored' })
  })

  it('reads and writes nothing on the server (the persisted copy is a browser matter)', async () => {
    setFlags({ server: true })
    localStorage.setItem('auth', JSON.stringify({ user: makeUser() }))
    const auth = persistedStore()
    expect(auth.user).toBeNull()
    await nextTick()
    auth.setUser(makeUser({ firstName: 'Server' }))
    await nextTick()
    expect(JSON.parse(localStorage.getItem('auth') ?? 'null')).toEqual({ user: makeUser() })
  })
})
