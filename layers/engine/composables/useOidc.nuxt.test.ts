// useOidc: the OIDC (Authorization Code + PKCE) client of the shop on top of oidc-client-ts: sign in/out, the callback,
// the access token, and the silent renewal whose single in-flight promise protects Zitadel's rotating refresh token.
// oidc-client-ts's UserManager (which talks to Zitadel) and $fetch are the boundaries, replaced by a fake.
// Run: `vp test run layers/engine/composables/useOidc.nuxt.test.ts`.
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { fakeUserManagers } from '../../../test/helpers/fakeOidc'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useRuntimeConfig } from '#imports'

interface FakeUser {
  access_token: string
  expired: boolean
}

const $fetchMock = vi.hoisted(() => vi.fn())

vi.mock('oidc-client-ts', async () =>
  (await import('../../../test/helpers/fakeOidc')).oidcClientTsFake(),
)
mockNuxtImport('$fetch', () => $fetchMock)

const user = (overrides: Partial<FakeUser> = {}): FakeUser => ({
  access_token: 'access-1',
  expired: false,
  ...overrides,
})

/** A fresh copy of the module (its user manager and in-flight renewal are module state) and its one user manager. */
async function load() {
  vi.resetModules()
  const { useOidc } = await import('./useOidc')
  const oidc = useOidc()
  const manager = () => {
    const [created] = fakeUserManagers()
    if (!created) throw new Error('no user manager was created')
    return created
  }
  return { useOidc, oidc, manager }
}

const goTo = (path: string) => {
  window.history.replaceState({}, '', path)
}

beforeEach(() => {
  vi.resetAllMocks()
  fakeUserManagers().length = 0
  goTo('/fr/menu')
})

describe('the user manager', () => {
  it('is configured for Zitadel with the code flow, offline access and no background renewal', async () => {
    const { oidc, manager } = await load()
    await oidc.signIn()
    const { options } = manager()
    const config = useRuntimeConfig().public
    expect(options).toMatchObject({
      authority: config.zitadelAuthority,
      client_id: config.zitadelClientId,
      redirect_uri: `${config.baseUrl}/fr/auth/callback`,
      post_logout_redirect_uri: config.baseUrl,
      response_type: 'code',
      automaticSilentRenew: false,
    })
    expect(String(options.scope).split(' ')).toEqual(
      expect.arrayContaining(['openid', 'profile', 'email', 'offline_access']),
    )
    // Tokens and the login state survive closing the browser: both stores are localStorage.
    expect(options.userStore).toMatchObject({ options: { store: localStorage } })
    expect(options.stateStore).toMatchObject({ options: { store: localStorage } })
  })

  it('returns to the callback page in the language of the page the customer is on', async () => {
    goTo('/nl/me')
    const { oidc, manager } = await load()
    await oidc.signIn()
    expect(manager().options.redirect_uri).toMatch(/\/nl\/auth\/callback$/u)
  })

  // NOTE: the user manager is a singleton built on first use, so its redirect_uri keeps the language of the page where
  // that happened: a visitor who switches language afterwards still comes back from Zitadel on the first language's
  // callback page (a cosmetic detour: that page then sends them on).
  it('NOTE: the redirect URI keeps the language of the first page, a later language switch does not change it', async () => {
    goTo('/nl/me')
    const { oidc, manager } = await load()
    await oidc.signIn()
    goTo('/en/menu')
    await oidc.signIn()
    expect(fakeUserManagers()).toHaveLength(1)
    expect(manager().options.redirect_uri).toMatch(/\/nl\/auth\/callback$/u)
  })

  it('defaults to French on a path without language', async () => {
    goTo('/')
    const { oidc, manager } = await load()
    await oidc.signIn()
    expect(manager().options.redirect_uri).toMatch(/\/fr\/auth\/callback$/u)
  })

  it('defaults to French where there is no window', async () => {
    const { oidc, manager } = await load()
    vi.stubGlobal('window', undefined)
    try {
      await oidc.signIn()
    } finally {
      vi.unstubAllGlobals()
    }
    expect(manager().options.redirect_uri).toMatch(/\/fr\/auth\/callback$/u)
  })

  it('ignores trailing slashes of the configured base URL', async () => {
    const config = useRuntimeConfig().public
    const original = config.baseUrl
    config.baseUrl = 'https://shop.example///'
    try {
      const { oidc, manager } = await load()
      await oidc.signIn()
      expect(manager().options.redirect_uri).toBe('https://shop.example/fr/auth/callback')
      expect(manager().options.post_logout_redirect_uri).toBe('https://shop.example')
    } finally {
      config.baseUrl = original
    }
  })

  it('is created once and shared by every useOidc() call', async () => {
    const { useOidc, oidc } = await load()
    await oidc.signIn()
    await useOidc().signIn()
    expect(fakeUserManagers()).toHaveLength(1)
  })

  it('is not created before it is needed', async () => {
    await load()
    expect(fakeUserManagers()).toHaveLength(0)
  })

  it('does not renew in the background when a silent renewal fails (no addSilentRenewError handler)', async () => {
    const { oidc, manager } = await load()
    await oidc.signIn()
    expect(manager().events.addSilentRenewError).not.toHaveBeenCalled()
  })
})

describe('oidcUser', () => {
  it('follows the user loaded and unloaded events of the user manager', async () => {
    const { oidc, manager } = await load()
    await oidc.signIn()
    expect(oidc.oidcUser.value).toBeNull()
    const loaded = user()
    manager().listeners.loaded!(loaded)
    expect(oidc.oidcUser.value).toEqual(loaded)
    manager().listeners.unloaded!()
    expect(oidc.oidcUser.value).toBeNull()
  })

  it('is one shared value across useOidc() calls', async () => {
    const { useOidc, oidc, manager } = await load()
    await oidc.signIn()
    const loaded = user()
    manager().listeners.loaded!(loaded)
    expect(useOidc().oidcUser.value).toEqual(loaded)
  })
})

describe('signIn', () => {
  it('starts the authorize redirect with the extra parameters (language of the login page)', async () => {
    const { oidc, manager } = await load()
    await oidc.signIn({ ui_locales: 'nl' })
    expect(manager().signinRedirect).toHaveBeenCalledExactlyOnceWith({
      extraQueryParams: { ui_locales: 'nl' },
    })
  })

  it('starts it without extra parameters', async () => {
    const { oidc, manager } = await load()
    await oidc.signIn()
    expect(manager().signinRedirect).toHaveBeenCalledExactlyOnceWith({
      extraQueryParams: undefined,
    })
  })

  it('lets a failure of the redirect reach the caller', async () => {
    const { oidc, manager } = await load()
    await oidc.signIn().catch(() => undefined)
    const failure = new Error('discovery failed')
    manager().signinRedirect.mockRejectedValue(failure)
    await expect(oidc.signIn()).rejects.toBe(failure)
  })
})

describe('getAuthRequestId (inline login at checkout)', () => {
  it("sends the authorize URL to the service's proxy and returns the auth request id", async () => {
    const { oidc, manager } = await load()
    await oidc.signIn()
    manager()._client.createSigninRequest.mockResolvedValue({
      url: 'https://auth.test/authorize?x=1',
    })
    $fetchMock.mockResolvedValue({ authRequestId: 'req-42' })

    await expect(oidc.getAuthRequestId()).resolves.toBe('req-42')

    expect(manager()._client.createSigninRequest).toHaveBeenCalledExactlyOnceWith({})
    expect($fetchMock).toHaveBeenCalledExactlyOnceWith(
      `${useRuntimeConfig().public.api}/auth/authorize-proxy`,
      { method: 'POST', body: { authorizeUrl: 'https://auth.test/authorize?x=1' } },
    )
  })

  it('fails when the proxy returns no auth request id', async () => {
    const { oidc, manager } = await load()
    await oidc.signIn()
    manager()._client.createSigninRequest.mockResolvedValue({ url: 'https://auth.test/authorize' })
    $fetchMock.mockResolvedValue({ authRequestId: '' })
    await expect(oidc.getAuthRequestId()).rejects.toThrow(
      'Failed to obtain authRequestID from Zitadel',
    )
  })

  it('lets a proxy failure reach the caller', async () => {
    const { oidc, manager } = await load()
    await oidc.signIn()
    manager()._client.createSigninRequest.mockResolvedValue({ url: 'u' })
    const failure = Object.assign(new Error('502'), { status: 502 })
    $fetchMock.mockRejectedValue(failure)
    await expect(oidc.getAuthRequestId()).rejects.toBe(failure)
  })
})

describe('handleCallback', () => {
  it('exchanges the authorization code and publishes the user', async () => {
    const { oidc, manager } = await load()
    await oidc.signIn()
    const signedIn = user()
    manager().signinRedirectCallback.mockResolvedValue(signedIn)
    await expect(oidc.handleCallback()).resolves.toBe(signedIn)
    expect(oidc.oidcUser.value).toEqual(signedIn)
  })

  it('fails on an invalid callback (state mismatch, code rejected) and publishes no user', async () => {
    const { oidc, manager } = await load()
    await oidc.signIn()
    const failure = new Error('No matching state found in storage')
    manager().signinRedirectCallback.mockRejectedValue(failure)
    await expect(oidc.handleCallback()).rejects.toBe(failure)
    expect(oidc.oidcUser.value).toBeNull()
  })
})

describe('getAccessToken', () => {
  it('returns the token of a valid session without renewing', async () => {
    const { oidc, manager } = await load()
    await oidc.signIn()
    manager().getUser.mockResolvedValue(user())
    await expect(oidc.getAccessToken()).resolves.toBe('access-1')
    expect(manager().signinSilent).not.toHaveBeenCalled()
  })

  it('returns null without a session and does not try to renew anything', async () => {
    const { oidc, manager } = await load()
    await oidc.signIn()
    manager().getUser.mockResolvedValue(null)
    await expect(oidc.getAccessToken()).resolves.toBeNull()
    expect(manager().signinSilent).not.toHaveBeenCalled()
  })

  it('renews an expired session and returns the new token', async () => {
    const { oidc, manager } = await load()
    await oidc.signIn()
    manager().getUser.mockResolvedValue(user({ expired: true }))
    manager().signinSilent.mockResolvedValue(user({ access_token: 'access-2' }))
    await expect(oidc.getAccessToken()).resolves.toBe('access-2')
  })

  it('returns null when the expired session cannot be renewed (refresh token revoked or expired)', async () => {
    const { oidc, manager } = await load()
    await oidc.signIn()
    manager().getUser.mockResolvedValue(user({ expired: true }))
    manager().signinSilent.mockRejectedValue(new Error('invalid_grant'))
    await expect(oidc.getAccessToken()).resolves.toBeNull()
  })

  it('makes concurrent callers with an expired token share one renewal', async () => {
    const { oidc, manager } = await load()
    await oidc.signIn()
    manager().getUser.mockResolvedValue(user({ expired: true }))
    manager().signinSilent.mockResolvedValue(user({ access_token: 'access-2' }))
    const tokens = await Promise.all([
      oidc.getAccessToken(),
      oidc.getAccessToken(),
      oidc.getAccessToken(),
    ])
    expect(tokens).toEqual(['access-2', 'access-2', 'access-2'])
    expect(manager().signinSilent).toHaveBeenCalledOnce()
  })
})

describe('silentRenew', () => {
  it('does nothing without a session', async () => {
    const { oidc, manager } = await load()
    await oidc.signIn()
    manager().getUser.mockResolvedValue(null)
    await expect(oidc.silentRenew()).resolves.toBeNull()
    expect(manager().signinSilent).not.toHaveBeenCalled()
    expect(manager().removeUser).not.toHaveBeenCalled()
  })

  it('returns the renewed user and publishes it', async () => {
    const { oidc, manager } = await load()
    await oidc.signIn()
    const renewed = user({ access_token: 'access-2' })
    manager().getUser.mockResolvedValue(user({ expired: true }))
    manager().signinSilent.mockResolvedValue(renewed)
    await expect(oidc.silentRenew()).resolves.toBe(renewed)
    expect(oidc.oidcUser.value).toEqual(renewed)
    expect(manager().removeUser).not.toHaveBeenCalled()
  })

  it('wipes the stale session when Zitadel refuses the refresh token', async () => {
    const { oidc, manager } = await load()
    await oidc.signIn()
    manager().getUser.mockResolvedValue(user({ expired: true }))
    manager().signinSilent.mockRejectedValue(new Error('invalid_grant'))
    manager().listeners.loaded!(user())

    await expect(oidc.silentRenew()).resolves.toBeNull()

    expect(manager().removeUser).toHaveBeenCalledOnce()
    expect(oidc.oidcUser.value).toBeNull()
  })

  // NOTE (owner decision pending, not asserted as desirable): every failure of signinSilent wipes the session, a dropped
  // connection (a TypeError from fetch, e.g. a phone coming back from sleep with no network yet) included, although
  // the refresh token would still be valid. Telling "refused by Zitadel" from "could not reach it" needs the shapes
  // oidc-client-ts throws against a real Zitadel; until then the safe side is to wipe, as the comment in useOidc says.
  it('NOTE: a network failure while renewing wipes the session just like a refused refresh token', async () => {
    const { oidc, manager } = await load()
    await oidc.signIn()
    manager().getUser.mockResolvedValue(user({ expired: true }))
    manager().signinSilent.mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(oidc.silentRenew()).resolves.toBeNull()

    expect(manager().removeUser).toHaveBeenCalledOnce()
    expect(oidc.oidcUser.value).toBeNull()
  })

  it('still reports the session as lost when wiping it fails too', async () => {
    const { oidc, manager } = await load()
    await oidc.signIn()
    manager().getUser.mockResolvedValue(user({ expired: true }))
    manager().signinSilent.mockRejectedValue(new Error('invalid_grant'))
    manager().removeUser.mockRejectedValue(new Error('storage unavailable'))
    await expect(oidc.silentRenew()).resolves.toBeNull()
    expect(oidc.oidcUser.value).toBeNull()
  })

  it('shares one in-flight renewal between concurrent callers (the refresh token rotates on first use)', async () => {
    const { useOidc, oidc, manager } = await load()
    await oidc.signIn()
    manager().getUser.mockResolvedValue(user({ expired: true }))
    let resolveRenewal: (u: FakeUser) => void = () => undefined
    manager().signinSilent.mockReturnValue(
      new Promise<FakeUser>((resolve) => {
        resolveRenewal = resolve
      }),
    )

    const first = oidc.silentRenew()
    const second = useOidc().silentRenew()
    expect(second).toBe(first)
    await vi.waitFor(() => {
      expect(manager().signinSilent).toHaveBeenCalledOnce()
    })
    const renewed = user({ access_token: 'access-2' })
    resolveRenewal(renewed)

    await expect(Promise.all([first, second])).resolves.toEqual([renewed, renewed])
    expect(manager().signinSilent).toHaveBeenCalledOnce()
  })

  it('renews again for a later call once the first renewal is over, after a success as after a failure', async () => {
    const { oidc, manager } = await load()
    await oidc.signIn()
    manager().getUser.mockResolvedValue(user({ expired: true }))
    manager()
      .signinSilent.mockRejectedValueOnce(new Error('invalid_grant'))
      .mockResolvedValueOnce(user({ access_token: 'access-3' }))
      .mockRejectedValueOnce(new Error('invalid_grant'))

    await expect(oidc.silentRenew()).resolves.toBeNull()
    await expect(oidc.silentRenew()).resolves.toMatchObject({ access_token: 'access-3' })
    await expect(oidc.silentRenew()).resolves.toBeNull()
    expect(manager().signinSilent).toHaveBeenCalledTimes(3)
  })

  it('also serves the access-token-expired event of the user manager, through the same in-flight renewal', async () => {
    const { oidc, manager } = await load()
    await oidc.signIn()
    manager().getUser.mockResolvedValue(user({ expired: true }))
    manager().signinSilent.mockResolvedValue(user({ access_token: 'access-2' }))

    const fromEvent = manager().listeners.expired!()
    const fromCaller = oidc.silentRenew()
    await Promise.all([fromEvent, fromCaller])

    expect(manager().signinSilent).toHaveBeenCalledOnce()
    expect(oidc.oidcUser.value).toMatchObject({ access_token: 'access-2' })
  })
})

describe('signOut', () => {
  it('wipes the local session before the end-session redirect (which never returns)', async () => {
    const { oidc, manager } = await load()
    const order: string[] = []
    await oidc.signIn()
    manager().removeUser.mockImplementation(() => {
      order.push('removeUser')
      return Promise.resolve()
    })
    manager().signoutRedirect.mockImplementation(() => {
      order.push('signoutRedirect')
      return Promise.resolve()
    })
    await oidc.signOut()
    expect(order).toEqual(['removeUser', 'signoutRedirect'])
  })

  it('redirects anyway when the local wipe fails', async () => {
    const { oidc, manager } = await load()
    await oidc.signIn()
    manager().removeUser.mockRejectedValue(new Error('storage unavailable'))
    await oidc.signOut()
    expect(manager().signoutRedirect).toHaveBeenCalledOnce()
  })

  it('lets a failed end-session redirect reach the caller', async () => {
    const { oidc, manager } = await load()
    await oidc.signIn()
    const failure = new Error('no end_session_endpoint')
    manager().signoutRedirect.mockRejectedValue(failure)
    await expect(oidc.signOut()).rejects.toBe(failure)
  })
})

describe('session queries', () => {
  it.each([
    ['a valid session', user(), true],
    ['an expired session', user({ expired: true }), false],
    ['no session', null, false],
  ])('isAuthenticated is %s -> %s', async (_label, stored, expected) => {
    const { oidc, manager } = await load()
    await oidc.signIn()
    manager().getUser.mockResolvedValue(stored)
    await expect(oidc.isAuthenticated()).resolves.toBe(expected)
  })

  it('getUser returns the stored user, expired or not', async () => {
    const { oidc, manager } = await load()
    await oidc.signIn()
    const stored = user({ expired: true })
    manager().getUser.mockResolvedValue(stored)
    await expect(oidc.getUser()).resolves.toBe(stored)
  })

  it('removeUser clears the stored session', async () => {
    const { oidc, manager } = await load()
    await oidc.signIn()
    manager().removeUser.mockResolvedValue(undefined)
    await oidc.removeUser()
    expect(manager().removeUser).toHaveBeenCalledOnce()
  })
})
