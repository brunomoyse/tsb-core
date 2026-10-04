// UseZitadelApi: the calls of the passwordless login (email OTP, Google / Apple) to tsb-service's auth proxy, which adds
// The Zitadel service-account token. $fetch is the boundary; each call must reach the right endpoint with the right body.
// Run: `vp test run layers/engine/composables/useZitadelApi.nuxt.test.ts`.
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { useRuntimeConfig } from '#imports'
import { useZitadelApi } from './useZitadelApi'

const $fetchMock = vi.hoisted(() => vi.fn())
mockNuxtImport('$fetch', () => $fetchMock)

const api = () => useRuntimeConfig().public.api
const goTo = (path: string) => {
  window.history.replaceState({}, '', path)
}

beforeEach(() => {
  vi.resetAllMocks()
  goTo('/fr/auth/login')
})

describe('email one-time code', () => {
  it('requests a code for the login name, in the language of the page (the email is sent in it)', async () => {
    goTo('/nl/auth/login')
    $fetchMock.mockResolvedValue({ sessionId: 's1', sessionToken: 't1' })

    await expect(useZitadelApi().requestOtpLogin('ada@example.com')).resolves.toEqual({
      sessionId: 's1',
      sessionToken: 't1',
    })

    expect($fetchMock).toHaveBeenCalledExactlyOnceWith(`${api()}/auth/session/otp/request`, {
      method: 'POST',
      body: { loginName: 'ada@example.com', lang: 'nl' },
    })
  })

  it('falls back to French on a path without language, and where there is no window', async () => {
    $fetchMock.mockResolvedValue({})
    const zitadel = useZitadelApi()
    goTo('/')
    await zitadel.requestOtpLogin('a@b.c')
    vi.stubGlobal('window', undefined)
    try {
      await zitadel.requestOtpLogin('a@b.c')
    } finally {
      vi.unstubAllGlobals()
    }
    expect($fetchMock.mock.calls.map((call) => call[1].body.lang)).toEqual(['fr', 'fr'])
  })

  it('verifies the code against the session and tells whether a profile is still needed', async () => {
    $fetchMock.mockResolvedValue({ sessionId: 's1', sessionToken: 't2', requiresProfile: true })

    await expect(useZitadelApi().verifyOtpLogin('s1', 't1', '123456')).resolves.toEqual({
      sessionId: 's1',
      sessionToken: 't2',
      requiresProfile: true,
    })

    expect($fetchMock).toHaveBeenCalledExactlyOnceWith(`${api()}/auth/session/otp/verify`, {
      method: 'POST',
      body: { sessionId: 's1', sessionToken: 't1', code: '123456' },
    })
  })

  it('completes the profile of a brand-new account with the given names', async () => {
    $fetchMock.mockResolvedValue({ success: true })
    const params = { sessionId: 's1', sessionToken: 't2', firstName: 'Ada', lastName: 'Lovelace' }

    await expect(useZitadelApi().completeOtpProfile(params)).resolves.toEqual({ success: true })

    expect($fetchMock).toHaveBeenCalledExactlyOnceWith(
      `${api()}/auth/session/otp/complete-profile`,
      { method: 'POST', body: params },
    )
  })

  it('asks for a new code for the pending session, in the language of the page', async () => {
    goTo('/zh/auth/login')
    $fetchMock.mockResolvedValue({ success: true })

    await useZitadelApi().resendOtpLogin('s1', 't1')

    expect($fetchMock).toHaveBeenCalledExactlyOnceWith(`${api()}/auth/session/otp/resend`, {
      method: 'POST',
      body: { sessionId: 's1', sessionToken: 't1', lang: 'zh' },
    })
  })
})

describe('finishing the OIDC request', () => {
  it('finalizes the auth request with the session and returns the callback URL', async () => {
    $fetchMock.mockResolvedValue({ callbackUrl: 'https://shop.test/fr/auth/callback?code=x' })

    await expect(useZitadelApi().finalizeOidcAuth('req-1', 's1', 't2')).resolves.toEqual({
      callbackUrl: 'https://shop.test/fr/auth/callback?code=x',
    })

    expect($fetchMock).toHaveBeenCalledExactlyOnceWith(`${api()}/auth/finalize`, {
      method: 'POST',
      body: { authRequestId: 'req-1', sessionId: 's1', sessionToken: 't2' },
    })
  })
})

describe('social login (Google, Apple)', () => {
  it('starts the IdP intent with the success and failure return URLs', async () => {
    $fetchMock.mockResolvedValue({ authUrl: 'https://accounts.google.test/auth' })

    await expect(
      useZitadelApi().startIdpLogin('google', 'https://shop.test/ok', 'https://shop.test/ko'),
    ).resolves.toEqual({ authUrl: 'https://accounts.google.test/auth' })

    expect($fetchMock).toHaveBeenCalledExactlyOnceWith(`${api()}/auth/idp/start`, {
      method: 'POST',
      body: {
        provider: 'google',
        successUrl: 'https://shop.test/ok',
        failureUrl: 'https://shop.test/ko',
      },
    })
  })

  it('creates a session from the IdP intent, naming the Zitadel user when it already exists', async () => {
    $fetchMock.mockResolvedValue({ sessionId: 's1', sessionToken: 't1', requiresProfile: false })

    await useZitadelApi().createIdpSession('intent-1', 'intent-token', 'zitadel-user')

    expect($fetchMock).toHaveBeenCalledExactlyOnceWith(`${api()}/auth/idp/session`, {
      method: 'POST',
      body: { idpIntentId: 'intent-1', idpIntentToken: 'intent-token', userId: 'zitadel-user' },
    })
  })

  it('leaves the user id out of the body for a first-time login', async () => {
    $fetchMock.mockResolvedValue({ sessionId: 's1', sessionToken: 't1', requiresProfile: true })

    await useZitadelApi().createIdpSession('intent-1', 'intent-token')

    expect($fetchMock.mock.calls[0]![1].body).toEqual({
      idpIntentId: 'intent-1',
      idpIntentToken: 'intent-token',
    })
    expect($fetchMock.mock.calls[0]![1].body).not.toHaveProperty('userId')
  })
})

describe('Zitadel / proxy errors', () => {
  it.each([
    ['requestOtpLogin', (z: ReturnType<typeof useZitadelApi>) => z.requestOtpLogin('a@b.c')],
    [
      'verifyOtpLogin',
      (z: ReturnType<typeof useZitadelApi>) => z.verifyOtpLogin('s', 't', '000000'),
    ],
    [
      'completeOtpProfile',
      (z: ReturnType<typeof useZitadelApi>) =>
        z.completeOtpProfile({ sessionId: 's', sessionToken: 't', firstName: 'A', lastName: 'B' }),
    ],
    ['resendOtpLogin', (z: ReturnType<typeof useZitadelApi>) => z.resendOtpLogin('s', 't')],
    [
      'finalizeOidcAuth',
      (z: ReturnType<typeof useZitadelApi>) => z.finalizeOidcAuth('r', 's', 't'),
    ],
    ['startIdpLogin', (z: ReturnType<typeof useZitadelApi>) => z.startIdpLogin('apple', 'a', 'b')],
    ['createIdpSession', (z: ReturnType<typeof useZitadelApi>) => z.createIdpSession('i', 't')],
  ])(
    '%s lets the HTTP error reach the caller (wrong code, throttling, unavailable)',
    async (_name, call) => {
      const failure = Object.assign(new Error('429'), {
        status: 429,
        data: { code: 'rate_limited' },
      })
      $fetchMock.mockRejectedValue(failure)
      await expect(call(useZitadelApi())).rejects.toBe(failure)
    },
  )
})
