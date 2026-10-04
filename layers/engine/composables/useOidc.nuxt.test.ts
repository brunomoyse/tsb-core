// useOidc: the OIDC (Authorization Code + PKCE) client of the shop on top of oidc-client-ts: sign in/out, the callback,
// the access token, and the silent renewal whose single in-flight promise protects Zitadel's rotating refresh token.
// oidc-client-ts's UserManager (which talks to Zitadel) and $fetch are the boundaries, replaced by a fake.
// Run: `vp test run layers/engine/composables/useOidc.nuxt.test.ts`.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { fakeUserManagers, refusal } from '../../../test/helpers/fakeOidc'
import { isSilentRenewUnavailable } from '#engine/utils/silentRenewError'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useRuntimeConfig } from '#imports'

interface FakeUser {
  access_token: string
  refresh_token?: string
  expired: boolean
}

const $fetchMock = vi.hoisted(() => vi.fn())

vi.mock('oidc-client-ts', async () =>
  (await import('../../../test/helpers/fakeOidc')).oidcClientTsFake(),
)
mockNuxtImport('$fetch', () => $fetchMock)

const user = (overrides: Partial<FakeUser> = {}): FakeUser => ({
  access_token: 'access-1',
  refresh_token: 'refresh-1',
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

  // The user manager is a singleton built on first use: its settings keep the language of the first page, so every
  // sign-in passes the callback URL of the page the customer is on at that moment (see the signIn tests).
  it('builds the sign-in redirect URI from the language of the page at sign-in time, not of the first page', async () => {
    goTo('/nl/me')
    const { oidc, manager } = await load()
    await oidc.signIn()
    expect(manager().signinRedirect).toHaveBeenLastCalledWith(
      expect.objectContaining({
        redirect_uri: `${useRuntimeConfig().public.baseUrl}/nl/auth/callback`,
      }),
    )
    goTo('/en/menu')
    await oidc.signIn()
    expect(fakeUserManagers()).toHaveLength(1)
    expect(manager().signinRedirect).toHaveBeenLastCalledWith(
      expect.objectContaining({
        redirect_uri: `${useRuntimeConfig().public.baseUrl}/en/auth/callback`,
      }),
    )
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
      redirect_uri: `${useRuntimeConfig().public.baseUrl}/fr/auth/callback`,
      extraQueryParams: { ui_locales: 'nl' },
    })
  })

  it('starts it without extra parameters', async () => {
    const { oidc, manager } = await load()
    await oidc.signIn()
    expect(manager().signinRedirect).toHaveBeenCalledExactlyOnceWith({
      redirect_uri: `${useRuntimeConfig().public.baseUrl}/fr/auth/callback`,
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

    expect(manager()._client.createSigninRequest).toHaveBeenCalledExactlyOnceWith({
      redirect_uri: `${useRuntimeConfig().public.baseUrl}/fr/auth/callback`,
    })
    expect($fetchMock).toHaveBeenCalledExactlyOnceWith(
      `${useRuntimeConfig().public.api}/auth/authorize-proxy`,
      { method: 'POST', body: { authorizeUrl: 'https://auth.test/authorize?x=1' } },
    )
  })

  it('asks for the callback page of the language the customer is on now, not of the first page', async () => {
    goTo('/nl/checkout')
    const { oidc, manager } = await load()
    await oidc.signIn()
    goTo('/zh/checkout')
    manager()._client.createSigninRequest.mockResolvedValue({ url: 'https://auth.test/authorize' })
    $fetchMock.mockResolvedValue({ authRequestId: 'req-1' })

    await oidc.getAuthRequestId()

    expect(manager()._client.createSigninRequest).toHaveBeenCalledExactlyOnceWith({
      redirect_uri: `${useRuntimeConfig().public.baseUrl}/zh/auth/callback`,
    })
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
    manager().signinSilent.mockRejectedValue(refusal('invalid_grant'))
    await expect(oidc.getAccessToken()).resolves.toBeNull()
  })

  it('returns null without touching the session when the renewal cannot reach Zitadel (offline)', async () => {
    const { oidc, manager } = await load()
    await oidc.signIn()
    manager().getUser.mockResolvedValue(user({ expired: true }))
    manager().signinSilent.mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(oidc.getAccessToken()).resolves.toBeNull()
    expect(manager().removeUser).not.toHaveBeenCalled()
  })

  it('lets an unexpected failure of the renewal (the session store broke) reach the caller', async () => {
    const { oidc, manager } = await load()
    await oidc.signIn()
    const failure = new Error('localStorage blocked')
    manager()
      .getUser.mockResolvedValueOnce(user({ expired: true }))
      .mockRejectedValueOnce(failure)
    await expect(oidc.getAccessToken()).rejects.toBe(failure)
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
    manager().signinSilent.mockRejectedValue(refusal('invalid_grant'))
    manager().listeners.loaded!(user())

    await expect(oidc.silentRenew()).resolves.toBeNull()

    expect(manager().removeUser).toHaveBeenCalledOnce()
    expect(oidc.oidcUser.value).toBeNull()
  })

  // A failure is transient ONLY when we got no answer from Zitadel (no network, a timeout) or it said "later" (408, 429,
  // 5xx, OAuth server_error / temporarily_unavailable): the session is kept, and the renewal rejects so that the callers
  // do not mistake it for a dead session. Everything else will fail the same way next time: the session is wiped.
  it.each(['invalid_grant', 'login_required', 'interaction_required', 'invalid_client'])(
    'wipes the session on a definitive refusal (%s)',
    async (code) => {
      const { oidc, manager } = await load()
      await oidc.signIn()
      manager().getUser.mockResolvedValue(user({ expired: true }))
      manager().signinSilent.mockRejectedValue(refusal(code))

      await expect(oidc.silentRenew()).resolves.toBeNull()

      expect(manager().removeUser).toHaveBeenCalledOnce()
      expect(oidc.oidcUser.value).toBeNull()
    },
  )

  it.each([
    ['a dropped connection (fetch fails)', () => new TypeError('Failed to fetch')],
    ['a timeout', () => Object.assign(new Error('Network timed out'), { name: 'ErrorTimeout' })],
    ['a 5xx without an OAuth error', () => new Error('Service Unavailable (503)')],
    ['an OAuth server_error', () => refusal('server_error')],
    ['an OAuth temporarily_unavailable', () => refusal('temporarily_unavailable')],
  ])('keeps the session when the renewal fails on %s', async (_title, failure) => {
    const { oidc, manager } = await load()
    await oidc.signIn()
    const stored = user({ expired: true })
    manager().getUser.mockResolvedValue(stored)
    const cause = failure()
    manager().signinSilent.mockRejectedValue(cause)
    manager().listeners.loaded!(stored)

    const outcome = await oidc.silentRenew().catch((e: unknown) => e)

    expect(isSilentRenewUnavailable(outcome)).toBe(true)
    expect((outcome as Error).cause).toBe(cause)
    expect(manager().removeUser).not.toHaveBeenCalled()
    expect(oidc.oidcUser.value).toEqual(stored)
  })

  it.each([
    [
      'a validation error (sub of the id_token differs)',
      () => new Error('sub in id_token does not match current sub'),
    ],
    [
      'a validation error (auth_time)',
      () => new Error('auth_time in id_token does not match original auth_time'),
    ],
    ['a validation error (azp)', () => new Error('azp in id_token does not match original azp')],
    [
      'an invalid content type',
      () => new Error('Invalid response Content-Type: text/html, from URL: https://z/token'),
    ],
    [
      'a 403 without an OAuth body (a WAF)',
      () => new Error('Forbidden (403): <html>blocked</html>'),
    ],
    ['a 404 without an OAuth body (a misrouted URL)', () => new Error('Not Found (404): ')],
    ['a 400 without an OAuth body', () => new Error('Bad Request (400): ')],
    [
      'an OAuth error whose description mentions a 5xx',
      () =>
        new (refusal('invalid_request').constructor as new (a: {
          error: string
          error_description: string
        }) => Error)({ error: 'invalid_request', error_description: 'upstream (503)' }),
    ],
    ['something that is not an Error', () => 'boom'],
  ])('wipes the session on %s: it would fail the same way every time', async (_title, failure) => {
    const { oidc, manager } = await load()
    await oidc.signIn()
    manager().getUser.mockResolvedValue(user({ expired: true }))
    manager().signinSilent.mockRejectedValue(failure())
    manager().listeners.loaded!(user())

    await expect(oidc.silentRenew()).resolves.toBeNull()

    expect(manager().removeUser).toHaveBeenCalledOnce()
    expect(oidc.oidcUser.value).toBeNull()
  })

  it.each([408, 429, 500, 502, 503, 504])(
    'keeps the session on an HTTP %i without an OAuth body',
    async (status) => {
      const { oidc, manager } = await load()
      await oidc.signIn()
      manager().getUser.mockResolvedValue(user({ expired: true }))
      manager().signinSilent.mockRejectedValue(new Error(`Whatever (${status}): `))

      await expect(oidc.silentRenew()).rejects.toSatisfy(isSilentRenewUnavailable)
      expect(manager().removeUser).not.toHaveBeenCalled()
    },
  )

  it('renews again once the network is back (online event): the session was kept, the refresh token is still good', async () => {
    const { oidc, manager } = await load()
    await oidc.signIn()
    manager().getUser.mockResolvedValue(user({ expired: true }))
    manager()
      .signinSilent.mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(user({ access_token: 'access-2' }))

    await expect(oidc.silentRenew()).rejects.toSatisfy(isSilentRenewUnavailable)
    window.dispatchEvent(new Event('online'))
    await expect(oidc.silentRenew()).resolves.toMatchObject({ access_token: 'access-2' })
    expect(manager().removeUser).not.toHaveBeenCalled()
  })

  // Two tabs share localStorage but not the in-flight renewal: the second one to use the refresh token gets invalid_grant.
  describe('when another tab renewed at the same time', () => {
    it('keeps the user the other tab stored (new refresh token) instead of wiping it', async () => {
      const { oidc, manager } = await load()
      await oidc.signIn()
      const renewedByOtherTab = user({ access_token: 'access-B', refresh_token: 'refresh-2' })
      manager()
        .getUser.mockResolvedValueOnce(user({ expired: true, refresh_token: 'refresh-1' }))
        .mockResolvedValueOnce(renewedByOtherTab)
      manager().signinSilent.mockRejectedValue(refusal('invalid_grant'))

      await expect(oidc.silentRenew()).resolves.toBe(renewedByOtherTab)

      expect(manager().removeUser).not.toHaveBeenCalled()
      expect(oidc.oidcUser.value).toEqual(renewedByOtherTab)
    })

    it('lets getAccessToken hand the new token to the request', async () => {
      const { oidc, manager } = await load()
      await oidc.signIn()
      manager()
        .getUser.mockResolvedValueOnce(user({ expired: true, refresh_token: 'refresh-1' }))
        .mockResolvedValueOnce(user({ expired: true, refresh_token: 'refresh-1' }))
        .mockResolvedValueOnce(user({ access_token: 'access-B', refresh_token: 'refresh-2' }))
      manager().signinSilent.mockRejectedValue(refusal('invalid_grant'))

      await expect(oidc.getAccessToken()).resolves.toBe('access-B')
    })

    it('still wipes the session when the stored refresh token is the one that was refused', async () => {
      const { oidc, manager } = await load()
      await oidc.signIn()
      manager().getUser.mockResolvedValue(user({ expired: true, refresh_token: 'refresh-1' }))
      manager().signinSilent.mockRejectedValue(refusal('invalid_grant'))

      await expect(oidc.silentRenew()).resolves.toBeNull()
      expect(manager().removeUser).toHaveBeenCalledOnce()
    })

    it('still wipes the session when the other tab signed out (nothing stored any more)', async () => {
      const { oidc, manager } = await load()
      await oidc.signIn()
      manager()
        .getUser.mockResolvedValueOnce(user({ expired: true }))
        .mockResolvedValueOnce(null)
      manager().signinSilent.mockRejectedValue(refusal('invalid_grant'))

      await expect(oidc.silentRenew()).resolves.toBeNull()
      expect(manager().removeUser).toHaveBeenCalledOnce()
    })

    it('still wipes the session when the stored user cannot be read again', async () => {
      const { oidc, manager } = await load()
      await oidc.signIn()
      manager()
        .getUser.mockResolvedValueOnce(user({ expired: true }))
        .mockRejectedValueOnce(new Error('localStorage blocked'))
      manager().signinSilent.mockRejectedValue(refusal('invalid_grant'))

      await expect(oidc.silentRenew()).resolves.toBeNull()
      expect(manager().removeUser).toHaveBeenCalledOnce()
    })

    it('does not look at the other tab for another refusal (only a used refresh token is a race)', async () => {
      const { oidc, manager } = await load()
      await oidc.signIn()
      manager().getUser.mockResolvedValue(user({ expired: true, refresh_token: 'refresh-1' }))
      manager().signinSilent.mockRejectedValue(refusal('invalid_client'))

      await expect(oidc.silentRenew()).resolves.toBeNull()
      expect(manager().getUser).toHaveBeenCalledOnce()
      expect(manager().removeUser).toHaveBeenCalledOnce()
    })
  })

  it('wipes a session that has no refresh token: nothing can renew it, asking Zitadel would be pointless', async () => {
    const { oidc, manager } = await load()
    await oidc.signIn()
    manager().getUser.mockResolvedValue(user({ expired: true, refresh_token: undefined }))

    await expect(oidc.silentRenew()).resolves.toBeNull()

    expect(manager().signinSilent).not.toHaveBeenCalled()
    expect(manager().removeUser).toHaveBeenCalledOnce()
    expect(oidc.oidcUser.value).toBeNull()
  })

  it('still reports the session as lost when wiping it fails too', async () => {
    const { oidc, manager } = await load()
    await oidc.signIn()
    manager().getUser.mockResolvedValue(user({ expired: true }))
    manager().signinSilent.mockRejectedValue(refusal('invalid_grant'))
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
      .signinSilent.mockRejectedValueOnce(refusal('invalid_grant'))
      .mockResolvedValueOnce(user({ access_token: 'access-3' }))
      .mockRejectedValueOnce(refusal('invalid_grant'))

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

// An outage must not turn into a storm: each authenticated request renews once on its token and once more on the 401
// that follows. After a transient failure nothing calls the token endpoint for 30 s (or until the browser is online).
describe('the cooldown after a transient failure of the renewal', () => {
  const COOLDOWN_MS = 30_000

  async function outage() {
    vi.useFakeTimers({ toFake: ['Date'] })
    const loaded = await load()
    await loaded.oidc.signIn()
    loaded.manager().getUser.mockResolvedValue(user({ expired: true }))
    loaded.manager().signinSilent.mockRejectedValue(new TypeError('Failed to fetch'))
    return loaded
  }

  afterEach(() => {
    vi.useRealTimers()
  })

  it('calls the token endpoint once for any number of serial and parallel requests during the outage', async () => {
    const { oidc, manager } = await outage()

    const requests = await Promise.allSettled(
      Array.from({ length: 5 }, async () => {
        // One request: its token, then (after the 401) the renewal again.
        await oidc.getAccessToken()
        await oidc.silentRenew().catch(() => undefined)
      }),
    )
    for (let i = 0; i < 10; i++) {
      vi.advanceTimersByTime(1_000)
      await oidc.getAccessToken()
      await expect(oidc.silentRenew()).rejects.toSatisfy(isSilentRenewUnavailable)
    }

    expect(requests.every((r) => r.status === 'fulfilled')).toBe(true)
    expect(manager().signinSilent).toHaveBeenCalledOnce()
    expect(manager().removeUser).not.toHaveBeenCalled()
  })

  it('fails fast with the transient error (and its cause) while it lasts', async () => {
    const { oidc, manager } = await outage()
    await expect(oidc.silentRenew()).rejects.toSatisfy(isSilentRenewUnavailable)

    const second = await oidc.silentRenew().catch((e: unknown) => e)

    expect(isSilentRenewUnavailable(second)).toBe(true)
    expect((second as Error).cause).toBeInstanceOf(TypeError)
    expect(manager().signinSilent).toHaveBeenCalledOnce()
  })

  it('tries again once the cooldown is over, at most once per window', async () => {
    const { oidc, manager } = await outage()
    await expect(oidc.silentRenew()).rejects.toSatisfy(isSilentRenewUnavailable)

    vi.advanceTimersByTime(COOLDOWN_MS - 1)
    await expect(oidc.silentRenew()).rejects.toSatisfy(isSilentRenewUnavailable)
    expect(manager().signinSilent).toHaveBeenCalledOnce()

    vi.advanceTimersByTime(1)
    await expect(oidc.silentRenew()).rejects.toSatisfy(isSilentRenewUnavailable)
    expect(manager().signinSilent).toHaveBeenCalledTimes(2)
    await expect(oidc.silentRenew()).rejects.toSatisfy(isSilentRenewUnavailable)
    expect(manager().signinSilent).toHaveBeenCalledTimes(2)
  })

  it('ends when the browser comes back online', async () => {
    const { oidc, manager } = await outage()
    await expect(oidc.silentRenew()).rejects.toSatisfy(isSilentRenewUnavailable)
    manager().signinSilent.mockResolvedValue(user({ access_token: 'access-2' }))

    window.dispatchEvent(new Event('online'))

    await expect(oidc.getAccessToken()).resolves.toBe('access-2')
    expect(manager().signinSilent).toHaveBeenCalledTimes(2)
  })

  it('blocks the access-token-expired event too, and a success clears nothing it should not', async () => {
    const { oidc, manager } = await outage()
    await oidc.getAccessToken()
    await expect(manager().listeners.expired!()).resolves.toBeUndefined()
    expect(manager().signinSilent).toHaveBeenCalledOnce()
  })

  it('does not hold a definitive failure back: the session is wiped at once and the next renewal has nothing to do', async () => {
    const { oidc, manager } = await load()
    await oidc.signIn()
    manager()
      .getUser.mockResolvedValueOnce(user({ expired: true }))
      .mockResolvedValue(null)
    manager().signinSilent.mockRejectedValue(refusal('invalid_grant'))

    await expect(oidc.silentRenew()).resolves.toBeNull()
    await expect(oidc.silentRenew()).resolves.toBeNull()
    expect(manager().signinSilent).toHaveBeenCalledOnce()
  })

  it('does not apply to a session without refresh token: it is wiped, cooldown or not', async () => {
    const { oidc, manager } = await outage()
    await expect(oidc.silentRenew()).rejects.toSatisfy(isSilentRenewUnavailable)
    manager().getUser.mockResolvedValue(user({ expired: true, refresh_token: undefined }))

    await expect(oidc.silentRenew()).resolves.toBeNull()
    expect(manager().removeUser).toHaveBeenCalledOnce()
  })
})

describe('the access-token-expired event when Zitadel cannot be reached', () => {
  it('keeps the session and does not fail: the next request renews it', async () => {
    const { oidc, manager } = await load()
    await oidc.signIn()
    manager().getUser.mockResolvedValue(user({ expired: true }))
    manager().signinSilent.mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(manager().listeners.expired!()).resolves.toBeUndefined()

    expect(manager().removeUser).not.toHaveBeenCalled()
  })

  it('does not hide an unexpected failure of the renewal', async () => {
    const { oidc, manager } = await load()
    await oidc.signIn()
    const failure = new Error('localStorage blocked')
    manager().getUser.mockRejectedValue(failure)
    await expect(manager().listeners.expired!()).rejects.toBe(failure)
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
