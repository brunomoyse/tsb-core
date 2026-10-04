// Sentry lazy plugin: no SDK while the page loads; errors raised meanwhile are kept, make the SDK load at once, and are
// sent when it is there; without an error the SDK starts at idle time a little after the page is ready.
// The SDK loader (utils/sentryClient) and Nuxt's onNuxtReady are the boundaries; the window listeners are real.
// Run: `vp test run layers/engine/plugins/sentry-lazy.client.nuxt.test.ts`.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

const loader = vi.hoisted(() => ({
  startSentry: vi.fn(),
  captureException: vi.fn(),
  // The "SDK is initialised" signal of utils/sentryClient: resolved with `started(sdk)`, by whoever starts the SDK.
  whenSentryStarted: vi.fn(),
}))
const whenReady = vi.hoisted(() => ({ callbacks: [] as (() => void)[] }))

vi.mock('#engine/utils/sentryClient', () => ({
  MAX_EVENTS_PER_SESSION: 3,
  startSentry: loader.startSentry,
  whenSentryStarted: loader.whenSentryStarted,
}))
mockNuxtImport('onNuxtReady', () => (callback: () => void) => {
  whenReady.callbacks.push(callback)
})

const { default: plugin, LOAD_DELAY_MS } = await import('./sentry-lazy.client')

type Hook = (...args: unknown[]) => void
const setup = (sentryDsn: string | undefined = 'https://pub@sentry.test/1') => {
  const hooks: Record<string, Hook> = {}
  const nuxtApp = {
    $config: { public: { sentryDsn } },
    hook: (name: string, fn: Hook) => {
      hooks[name] = fn
    },
  }
  ;(plugin as unknown as (app: unknown) => void)(nuxtApp)
  return hooks
}

// The plugin listens on the real window and only lets go once the SDK is up: take every listener off after each test.
const listeners: [string, EventListenerOrEventListenerObject][] = []

let loaded: (sdk: unknown) => void
let loadFailed: (reason: unknown) => void
let started: (sdk: unknown) => void

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  const add = window.addEventListener.bind(window)
  vi.spyOn(window, 'addEventListener').mockImplementation(((
    type: string,
    listener: EventListenerOrEventListenerObject,
  ) => {
    listeners.push([type, listener])
    add(type, listener)
  }) as typeof window.addEventListener)
  whenReady.callbacks.length = 0
  loader.startSentry.mockReset()
  loader.captureException.mockReset()
  loader.whenSentryStarted.mockReset()
  const signal = new Promise((resolve) => {
    started = resolve
  })
  loader.whenSentryStarted.mockReturnValue(signal)
  loader.startSentry.mockImplementation(
    () =>
      new Promise((resolve, reject) => {
        // `loaded` is the SDK finishing its start: it answers startSentry's caller and announces itself.
        loaded = (sdk) => {
          started(sdk)
          resolve(sdk)
        }
        loadFailed = reject
      }),
  )
})

afterEach(() => {
  for (const [type, listener] of listeners.splice(0)) window.removeEventListener(type, listener)
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const sdk = () => ({ captureException: loader.captureException })
const flush = () => vi.advanceTimersByTimeAsync(0)

describe('registration', () => {
  it('is a parallel plugin that runs before the others, and does nothing at all without a DSN', () => {
    const meta = plugin as unknown as { parallel: boolean; enforce: string }
    expect(meta.parallel).toBe(true)
    expect(meta.enforce).toBe('pre')
    const hooks = setup('')
    expect(hooks).toEqual({})
    expect(whenReady.callbacks).toHaveLength(0)
    expect(listeners).toHaveLength(0)
  })

  it('loads nothing while the page loads', () => {
    setup()
    expect(loader.startSentry).not.toHaveBeenCalled()
  })
})

describe('starting without an error', () => {
  it('waits for the app to be ready plus the delay, then starts the SDK when the browser is idle', async () => {
    const idle = vi.fn((callback: () => void) => {
      callback()
    })
    vi.stubGlobal('requestIdleCallback', idle)
    setup()
    whenReady.callbacks[0]!()
    await vi.advanceTimersByTimeAsync(LOAD_DELAY_MS - 1)
    expect(loader.startSentry).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(idle).toHaveBeenCalledOnce()
    expect(loader.startSentry).toHaveBeenCalledOnce()
  })

  it('starts it straight after the delay in a browser without requestIdleCallback', async () => {
    vi.stubGlobal('requestIdleCallback', undefined)
    setup()
    whenReady.callbacks[0]!()
    await vi.advanceTimersByTimeAsync(LOAD_DELAY_MS)
    expect(loader.startSentry).toHaveBeenCalledOnce()
  })

  it('survives a SDK that fails to load', async () => {
    vi.stubGlobal('requestIdleCallback', undefined)
    setup()
    whenReady.callbacks[0]!()
    await vi.advanceTimersByTimeAsync(LOAD_DELAY_MS)
    loadFailed(new Error('offline'))
    await flush()
    expect(loader.captureException).not.toHaveBeenCalled()
  })
})

describe('errors raised while the SDK is not there', () => {
  it('keeps a script error, loads the SDK at once and sends it when it is ready', async () => {
    setup()
    const error = new Error('x is not a function')
    window.dispatchEvent(new ErrorEvent('error', { error, message: error.message }))
    expect(loader.startSentry).toHaveBeenCalledOnce()
    expect(loader.captureException).not.toHaveBeenCalled()
    loaded(sdk())
    await flush()
    expect(loader.captureException).toHaveBeenCalledExactlyOnceWith(error, {
      mechanism: { handled: false, type: 'auto.browser.global_handlers.onerror' },
    })
  })

  it('falls back to the message when the event carries no error object (cross-origin script error)', async () => {
    setup()
    window.dispatchEvent(new ErrorEvent('error', { message: 'Script error.' }))
    loaded(sdk())
    await flush()
    expect(loader.captureException).toHaveBeenCalledExactlyOnceWith(
      'Script error.',
      expect.anything(),
    )
  })

  it('keeps an unhandled promise rejection', async () => {
    setup()
    const reason = new Error('rejected')
    const event = new Event('unhandledrejection') as PromiseRejectionEvent
    Object.assign(event, { reason })
    window.dispatchEvent(event)
    loaded(sdk())
    await flush()
    expect(loader.captureException).toHaveBeenCalledExactlyOnceWith(reason, {
      mechanism: { handled: false, type: 'auto.browser.global_handlers.onunhandledrejection' },
    })
  })

  it('keeps a Vue render error with the component info', async () => {
    const hooks = setup()
    const error = new Error('render failed')
    hooks['vue:error']!(error, {}, 'setup function')
    loaded(sdk())
    await flush()
    expect(loader.captureException).toHaveBeenCalledExactlyOnceWith(error, {
      mechanism: { handled: false, type: 'auto.function.nuxt.vue-error' },
      captureContext: { extra: { info: 'setup function' } },
    })
  })

  it('keeps a Nuxt app error, but not a redirect or a client error (a 404) of a Nuxt error', async () => {
    const hooks = setup()
    hooks['app:error']!(createError({ statusCode: 404 }))
    hooks['app:error']!(createError({ statusCode: 302 }))
    expect(loader.startSentry).not.toHaveBeenCalled()
    const fault = createError({ statusCode: 500 })
    hooks['app:error']!(fault)
    expect(loader.startSentry).toHaveBeenCalledOnce()
    hooks['app:error']!(null)
    loaded(sdk())
    await flush()
    expect(loader.captureException).toHaveBeenCalledTimes(2)
    expect(loader.captureException).toHaveBeenCalledWith(fault, {
      mechanism: { handled: false, type: 'auto.function.nuxt.app-error' },
    })
  })

  it('only filters Nuxt errors like the @sentry/nuxt module does: any other thrown value is kept, whatever its status', async () => {
    const hooks = setup()
    const notNuxt = Object.assign(new Error('upstream'), { statusCode: 404 })
    hooks['app:error']!(notNuxt)
    loaded(sdk())
    await flush()
    expect(loader.captureException).toHaveBeenCalledExactlyOnceWith(notNuxt, expect.anything())
  })

  it('keeps at most as many errors as Sentry would send while it loads', async () => {
    const hooks = setup()
    for (let i = 0; i < 5; i += 1) hooks['vue:error']!(new Error(`e${i}`), {}, 'x')
    loaded(sdk())
    await flush()
    expect(loader.captureException).toHaveBeenCalledTimes(3)
  })

  it('hands the page to the SDK once it is up: ours stop listening, later errors go straight to it', async () => {
    const hooks = setup()
    window.dispatchEvent(new ErrorEvent('error', { error: new Error('first') }))
    loaded(sdk())
    await flush()
    loader.captureException.mockClear()

    // The SDK installed its own handlers; a window error is no longer ours to report (it would be a duplicate).
    window.dispatchEvent(new ErrorEvent('error', { error: new Error('second') }))
    expect(loader.captureException).not.toHaveBeenCalled()

    // Vue and Nuxt hooks still are ours, and no longer wait.
    const error = new Error('later')
    hooks['vue:error']!(error, {}, 'render')
    expect(loader.captureException).toHaveBeenCalledOnce()
    expect(loader.startSentry).toHaveBeenCalledOnce()
  })

  it('lets go of the window listeners when something else starts the SDK (reportError), and sends what was kept', async () => {
    const hooks = setup()
    const error = new Error('kept')
    hooks['vue:error']!(error, {}, 'render')
    loader.startSentry.mockClear()
    // `reportError` loaded the SDK: not this plugin's loader, only the signal.
    started(sdk())
    await flush()
    expect(loader.captureException).toHaveBeenCalledOnce()
    // Sentry's own handlers report a window error now: ours must not as well.
    loader.captureException.mockClear()
    window.dispatchEvent(new ErrorEvent('error', { error: new Error('window') }))
    expect(loader.captureException).not.toHaveBeenCalled()
    expect(loader.startSentry).not.toHaveBeenCalled()
  })

  it('loads again on the next error when the first attempt failed', async () => {
    setup()
    window.dispatchEvent(new ErrorEvent('error', { error: new Error('a') }))
    loadFailed(new Error('offline'))
    await flush()
    window.dispatchEvent(new ErrorEvent('error', { error: new Error('b') }))
    expect(loader.startSentry).toHaveBeenCalledTimes(2)
    loaded(sdk())
    await flush()
    expect(loader.captureException).toHaveBeenCalledTimes(2)
  })
})
