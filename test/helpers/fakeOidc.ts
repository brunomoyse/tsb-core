// A fake of oidc-client-ts (the boundary to Zitadel) for the tests of `useOidc` and of everything that uses it for real.
// `useOidc` builds one `UserManager` per module load; the managers it created are listed in `fakeUserManagers()`.
//
//   vi.mock('oidc-client-ts', async () => (await import('../../../test/helpers/fakeOidc')).oidcClientTsFake())
//   fakeUserManagers().length = 0                                 // before each test
//   const [manager] = fakeUserManagers()                          // after the first call that needs the manager
//
// The list (and the ErrorResponse class) lives on `globalThis`, so that it survives `vi.resetModules()` (a reset
// re-evaluates this module).
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

/** oidc-client-ts's `ErrorResponse`: what the token endpoint answered (`error` is the OAuth error code). */
class ErrorResponseImpl extends Error {
  error: string
  error_description: string | null
  constructor(args: { error: string; error_description?: string }) {
    super(args.error_description || args.error)
    this.name = 'ErrorResponse'
    this.error = args.error
    this.error_description = args.error_description ?? null
  }
}

// One class for every copy of this module (a `vi.resetModules()` re-evaluates it): `useOidc` tests it with `instanceof`.
const classHolder = globalThis as { __fakeErrorResponse?: typeof ErrorResponseImpl }
export const FakeErrorResponse = (classHolder.__fakeErrorResponse ??= ErrorResponseImpl)

/** A refusal as Zitadel answers it: `refusal('invalid_grant')` is an expired, revoked or already used refresh token. */
export const refusal = (error: string) => new FakeErrorResponse({ error })

export function fakeUserManagers(): FakeUserManager[] {
  const holder = globalThis as { __fakeUserManagers?: FakeUserManager[] }
  return (holder.__fakeUserManagers ??= [])
}

/** The module factory for `vi.mock('oidc-client-ts', ...)`. */
export function oidcClientTsFake() {
  return {
    UserManager: FakeUserManager,
    WebStorageStateStore: FakeWebStorageStateStore,
    ErrorResponse: FakeErrorResponse,
  }
}
