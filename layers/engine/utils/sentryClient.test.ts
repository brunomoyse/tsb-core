// sentryClient: how the browser SDK is configured and started. @sentry/nuxt is the mocked boundary (a recording stand-in
// for the real SDK: what matters is what the shop hands to `init`, and that the SDK is loaded once and only when asked).
// Run: `vp test run layers/engine/utils/sentryClient.test.ts`.
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import {
  MAX_EVENTS_PER_SESSION,
  type SentryEnvironment,
  type SentryModule,
  createBeforeSend,
  initSentry,
  oidcNoise,
} from './sentryClient'

const fakeSdk = () => {
  const addIntegration = vi.fn()
  const sdk = {
    init: vi.fn(),
    getClient: vi.fn(() => ({ addIntegration })),
    browserTracingIntegration: vi.fn((options: unknown) => ({ name: 'BrowserTracing', options })),
  }
  return { sdk, addIntegration, module: sdk as unknown as SentryModule }
}

const env = (extra: Partial<SentryEnvironment> = {}): SentryEnvironment => ({
  $config: {
    public: {
      sentryDsn: 'https://pub@sentry.test/42',
      sentryEnvironment: 'staging',
      sentryRelease: 'v1.2.3',
    },
  },
  ...extra,
})

const event = (filenames: string[] = []) =>
  ({
    exception: {
      values: [{ stacktrace: { frames: filenames.map((filename) => ({ filename })) } }],
    },
  }) as never

describe('initSentry', () => {
  it('configures the SDK with the shop options: tunnel, 10 % tracing, no replay and no personal data', () => {
    const { sdk } = fakeSdk()
    initSentry(sdk as unknown as SentryModule, env())
    expect(sdk.init).toHaveBeenCalledOnce()
    const options = sdk.init.mock.calls[0]![0] as Record<string, unknown>
    expect(options).toMatchObject({
      dsn: 'https://pub@sentry.test/42',
      environment: 'staging',
      release: 'v1.2.3',
      tunnel: '/api/sentry-tunnel',
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,
      ignoreErrors: oidcNoise,
      dataCollection: {
        userInfo: false,
        cookies: false,
        httpBodies: [],
        urlQueryParams: false,
        graphQL: { variables: false },
        stackFrameVariables: false,
      },
    })
    expect(typeof options.beforeSend).toBe('function')
  })

  it('defaults the environment to production and leaves the release unset when the build has none', () => {
    const { sdk } = fakeSdk()
    initSentry(sdk as unknown as SentryModule, {
      $config: { public: { sentryDsn: 'https://pub@sentry.test/42' } },
    })
    expect(sdk.init.mock.calls[0]![0]).toMatchObject({
      environment: 'production',
      release: undefined,
    })
  })

  it('adds the router tracing, labelled by path, once the client exists', () => {
    const { sdk, addIntegration } = fakeSdk()
    const router = { name: 'router' }
    initSentry(sdk as unknown as SentryModule, env({ $router: router }))
    expect(sdk.browserTracingIntegration).toHaveBeenCalledExactlyOnceWith({
      router,
      routeLabel: 'path',
    })
    expect(addIntegration).toHaveBeenCalledOnce()
  })

  it('skips the router tracing without a router, or when init produced no client', () => {
    const noRouter = fakeSdk()
    initSentry(noRouter.module, env())
    expect(noRouter.sdk.browserTracingIntegration).not.toHaveBeenCalled()

    const noClient = fakeSdk()
    noClient.sdk.getClient.mockReturnValue(undefined as never)
    initSentry(noClient.module, env({ $router: {} }))
    expect(noClient.addIntegration).not.toHaveBeenCalled()
  })
})

describe('createBeforeSend', () => {
  const hintOf = (originalException?: unknown) => ({ originalException }) as never

  it('lets an ordinary error through', () => {
    const beforeSend = createBeforeSend()
    const e = event(['https://shop.test/_nuxt/app.js'])
    expect(beforeSend(e, hintOf(new Error('boom')))).toBe(e)
  })

  it('drops an event whose stack passes through oidc-client-ts, and one whose error stack does', () => {
    const beforeSend = createBeforeSend()
    expect(
      beforeSend(event(['/node_modules/oidc-client-ts/dist/x.js']), hintOf(new Error('x'))),
    ).toBeNull()
    const error = new Error('x')
    error.stack = 'Error: x\n    at refresh (oidc-client-ts/dist/browser/index.js:1:1)'
    expect(beforeSend(event(), hintOf(error))).toBeNull()
  })

  it('tolerates events without stack frames or a hint, and an error without a stack', () => {
    const beforeSend = createBeforeSend()
    const bare = {} as never
    expect(beforeSend(bare, undefined as never)).toBe(bare)
    const error = new Error('no stack')
    error.stack = undefined
    expect(beforeSend(event([undefined as never]), hintOf(error))).not.toBeNull()
  })

  it('drops the failure of a lazy chunk (the chunk-reload plugin already handles it)', () => {
    const beforeSend = createBeforeSend()
    expect(
      beforeSend(
        event(),
        hintOf(new Error('Failed to fetch dynamically imported module: /_nuxt/a.js')),
      ),
    ).toBeNull()
  })

  it('sends at most MAX_EVENTS_PER_SESSION events per page load, counting only those it sent', () => {
    const beforeSend = createBeforeSend()
    expect(beforeSend(event(['/node_modules/oidc-client-ts/a.js']), hintOf())).toBeNull()
    for (let i = 0; i < MAX_EVENTS_PER_SESSION; i += 1)
      expect(beforeSend(event(), hintOf(new Error(`e${i}`)))).not.toBeNull()
    expect(beforeSend(event(), hintOf(new Error('one too many')))).toBeNull()
    // Another page load (a fresh hook) starts from zero.
    expect(createBeforeSend()(event(), hintOf(new Error('fresh')))).not.toBeNull()
  })
})

describe('oidcNoise', () => {
  it.each([
    'signinSilent failed',
    'silent_renew_error',
    'Frame window timed out',
    'No matching state found in storage',
    'Token is not active',
    'login_required',
    'interaction_required',
    'User is not authenticated',
  ])('matches "%s"', (message) => {
    expect(oidcNoise.some((pattern) => pattern.test(message))).toBe(true)
  })

  it('does not match an application error', () => {
    expect(oidcNoise.some((pattern) => pattern.test('Cannot read properties of undefined'))).toBe(
      false,
    )
  })
})

describe('startSentry', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('loads the SDK once and initialises it once, however many callers ask', async () => {
    const { startSentry } = await import('./sentryClient')
    const sdk = fakeSdk().module
    const load = vi.fn(() => Promise.resolve(sdk))
    const [a, b] = await Promise.all([startSentry(env(), load), startSentry(env(), load)])
    expect(a).toBe(sdk)
    expect(b).toBe(sdk)
    await startSentry(env(), load)
    expect(load).toHaveBeenCalledOnce()
    expect((sdk as unknown as { init: ReturnType<typeof vi.fn> }).init).toHaveBeenCalledOnce()
  })

  it('tries again on the next call when the first load failed', async () => {
    const { startSentry } = await import('./sentryClient')
    const sdk = fakeSdk().module
    const load = vi
      .fn<() => Promise<SentryModule>>()
      .mockRejectedValueOnce(new Error('chunk failed to load'))
      .mockResolvedValue(sdk)
    await expect(startSentry(env(), load)).rejects.toThrow('chunk failed to load')
    await expect(startSentry(env(), load)).resolves.toBe(sdk)
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('loads the real facade (the four SDK functions the shop uses) when no loader is given', async () => {
    vi.doMock('@sentry/nuxt', () => ({
      init: vi.fn(),
      captureException: vi.fn(),
      getClient: vi.fn(),
      browserTracingIntegration: vi.fn(),
    }))
    const { startSentry } = await import('./sentryClient')
    const sdk = await startSentry(env())
    expect(Object.keys(sdk).toSorted()).toEqual([
      'browserTracingIntegration',
      'captureException',
      'getClient',
      'init',
    ])
  })
})
