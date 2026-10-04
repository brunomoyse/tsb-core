// Global route middleware: protects the pages whose route meta says `public: false`. The OIDC client (Zitadel) and the
// navigation are the boundaries, mocked; the middleware's own decisions are what is asserted.
// Run: `vp test run layers/engine/middleware/auth.global.nuxt.test.ts`.
import type * as NuxtAppModule from 'nuxt/app'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import type { RouteLocationNormalized } from 'vue-router'
import { SilentRenewUnavailableError } from '#engine/utils/silentRenewError'
import { setFlags } from '../../../test/flags'

const oidc = vi.hoisted(() => ({
  isAuthenticated: vi.fn<() => Promise<boolean>>(),
  silentRenew: vi.fn<() => Promise<unknown>>(),
  signIn: vi.fn<(args?: Record<string, unknown>) => Promise<void>>(),
}))
const navigateTo = vi.hoisted(() => vi.fn((to: string) => ({ redirectedTo: to })))
const reportError = vi.hoisted(() => vi.fn())

vi.mock('#engine/composables/useOidc', () => ({ useOidc: () => oidc }))
vi.mock('#engine/utils/reportError', () => ({ reportError }))
vi.mock('nuxt/app', async (importOriginal) => ({
  ...(await importOriginal<typeof NuxtAppModule>()),
  navigateTo,
}))

const { default: authMiddleware } = await import('./auth.global')

const run = (path: string, meta: Record<string, unknown> = { public: false }, fullPath = path) =>
  (authMiddleware as unknown as (to: RouteLocationNormalized) => Promise<unknown>)({
    path,
    fullPath,
    meta,
  } as unknown as RouteLocationNormalized)

beforeEach(() => {
  vi.resetAllMocks()
  navigateTo.mockImplementation((to: string) => ({ redirectedTo: to }))
  oidc.isAuthenticated.mockResolvedValue(false)
  oidc.silentRenew.mockResolvedValue(null)
  oidc.signIn.mockResolvedValue(undefined)
  sessionStorage.clear()
})

describe('public pages', () => {
  it.each([
    ['no meta.public', {}],
    ['meta.public true', { public: true }],
  ])('are never checked (%s)', async (_label, meta) => {
    expect(await run('/fr/menu', meta)).toBeUndefined()
    expect(oidc.isAuthenticated).not.toHaveBeenCalled()
    expect(navigateTo).not.toHaveBeenCalled()
  })
})

describe('protected pages (meta.public === false) in the browser', () => {
  it('let a signed-in customer through without renewing anything', async () => {
    oidc.isAuthenticated.mockResolvedValue(true)
    expect(await run('/fr/me')).toBeUndefined()
    expect(oidc.silentRenew).not.toHaveBeenCalled()
    expect(oidc.signIn).not.toHaveBeenCalled()
    expect(navigateTo).not.toHaveBeenCalled()
  })

  it('renew an expired session silently and let the customer through', async () => {
    oidc.silentRenew.mockResolvedValue({ access_token: 'fresh' })
    expect(await run('/fr/me')).toBeUndefined()
    expect(oidc.silentRenew).toHaveBeenCalledOnce()
    expect(oidc.signIn).not.toHaveBeenCalled()
    expect(navigateTo).not.toHaveBeenCalled()
    expect(sessionStorage.getItem('oidc_return_to')).toBeNull()
  })

  it('let the customer through, signed in, when the renewal cannot reach Zitadel (offline): no login flow', async () => {
    oidc.silentRenew.mockRejectedValue(new SilentRenewUnavailableError())
    expect(await run('/fr/me')).toBeUndefined()
    expect(oidc.signIn).not.toHaveBeenCalled()
    expect(navigateTo).not.toHaveBeenCalled()
    expect(sessionStorage.getItem('oidc_return_to')).toBeNull()
  })

  it('does not swallow an unexpected failure of the renewal', async () => {
    const bug = new TypeError('boom')
    oidc.silentRenew.mockRejectedValue(bug)
    await expect(run('/fr/me')).rejects.toBe(bug)
  })

  it('send an anonymous customer to the login flow in the language of the page, remembering the destination', async () => {
    const result = await run('/nl/me/orders', { public: false }, '/nl/me/orders?page=2')
    expect(sessionStorage.getItem('oidc_return_to')).toBe('/nl/me/orders?page=2')
    expect(oidc.signIn).toHaveBeenCalledExactlyOnceWith({ ui_locales: 'nl' })
    expect(navigateTo).toHaveBeenCalledExactlyOnceWith('/nl/auth/login')
    expect(result).toEqual({ redirectedTo: '/nl/auth/login' })
  })

  it('default to French when the path has no language prefix', async () => {
    await run('/', { public: false }, '/')
    expect(oidc.signIn).toHaveBeenCalledWith({ ui_locales: 'fr' })
    expect(navigateTo).toHaveBeenCalledWith('/fr/auth/login')
  })

  it('does not stash a destination that is not a local path (no open redirect after login)', async () => {
    await run('/fr/me', { public: false }, 'https://evil.example/fr/me')
    expect(sessionStorage.getItem('oidc_return_to')).toBeNull()
    expect(oidc.signIn).toHaveBeenCalled()
  })

  it('works where sessionStorage does not exist', async () => {
    vi.stubGlobal('sessionStorage', undefined)
    try {
      const result = await run('/fr/me')
      expect(result).toEqual({ redirectedTo: '/fr/auth/login' })
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('reports a failed sign-in start and still sends the customer to the login page', async () => {
    const failure = new Error('oidc discovery failed')
    oidc.signIn.mockRejectedValue(failure)
    const result = await run('/en/me')
    expect(reportError).toHaveBeenCalledExactlyOnceWith(failure, 'auth.signIn')
    expect(navigateTo).toHaveBeenCalledExactlyOnceWith('/en/auth/login')
    expect(result).toEqual({ redirectedTo: '/en/auth/login' })
  })
})

describe('during SSR', () => {
  it('lets a protected page render on the server and leaves the check to the browser (tokens live in localStorage)', async () => {
    setFlags({ server: true })
    expect(await run('/fr/me')).toBeUndefined()
    expect(oidc.isAuthenticated).not.toHaveBeenCalled()
    expect(oidc.signIn).not.toHaveBeenCalled()
    expect(navigateTo).not.toHaveBeenCalled()
  })
})
