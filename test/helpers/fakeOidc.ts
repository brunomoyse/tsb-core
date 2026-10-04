// A fake of oidc-client-ts (the boundary to Zitadel) for the tests of `useOidc` and of everything that uses it for real.
// `useOidc` builds one `UserManager` per module load; the managers it created are listed in `fakeUserManagers()`.
//
//   vi.mock('oidc-client-ts', async () => (await import('../../../test/helpers/fakeOidc')).oidcClientTsFake())
//   fakeUserManagers().length = 0                                 // before each test
//   const [manager] = fakeUserManagers()                          // after the first call that needs the manager
//
// The list lives on `globalThis`, so that it survives `vi.resetModules()` (a reset re-evaluates this module).
import { vi } from 'vite-plus/test'

type Listener = (arg?: unknown) => unknown

export class FakeUserManager {
  listeners: Record<string, Listener> = {}
  events = {
    addUserLoaded: vi.fn((callback: Listener) => {
      this.listeners.loaded = callback
    }),
    addUserUnloaded: vi.fn((callback: Listener) => {
      this.listeners.unloaded = callback
    }),
    addAccessTokenExpired: vi.fn((callback: Listener) => {
      this.listeners.expired = callback
    }),
    addSilentRenewError: vi.fn(),
  }
  getUser = vi.fn()
  signinRedirect = vi.fn()
  signinRedirectCallback = vi.fn()
  signinSilent = vi.fn()
  signoutRedirect = vi.fn()
  removeUser = vi.fn()
  _client = { createSigninRequest: vi.fn() }
  constructor(public options: Record<string, unknown>) {
    fakeUserManagers().push(this)
  }
}

export class FakeWebStorageStateStore {
  constructor(public options: unknown) {}
}

export function fakeUserManagers(): FakeUserManager[] {
  const holder = globalThis as { __fakeUserManagers?: FakeUserManager[] }
  return (holder.__fakeUserManagers ??= [])
}

/** The module factory for `vi.mock('oidc-client-ts', ...)`. */
export function oidcClientTsFake() {
  return { UserManager: FakeUserManager, WebStorageStateStore: FakeWebStorageStateStore }
}
