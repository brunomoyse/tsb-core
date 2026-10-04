// ReportError: the one way a `catch` block surfaces what it swallows: console in dev, Sentry in production (when the shop
// Has a DSN), and never for what is expected (aborted calls, dropped connections, the customer's input).
// Sentry's SDK is the boundary (loaded lazily, so mocked at the module level); the runtime config is the real one.
// Run: `vp test run layers/engine/utils/reportError.nuxt.test.ts`.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { useRuntimeConfig } from '#imports'
import { GQL_NETWORK_ERROR, GqlError } from './gqlError'
import { setFlags } from '../../../test/flags'

const sentry = vi.hoisted(() => ({ captureException: vi.fn() }))
const app = vi.hoisted(() => ({ tryUseNuxtApp: vi.fn() }))

vi.mock('@sentry/nuxt', () => ({ captureException: sentry.captureException }))
vi.mock('#app', async (importOriginal) => {
  const original = await importOriginal<typeof import('#app')>()
  app.tryUseNuxtApp.mockImplementation(original.tryUseNuxtApp)
  return { ...original, tryUseNuxtApp: app.tryUseNuxtApp }
})

const { reportError } = await import('./reportError')

const publicConfig = () => useRuntimeConfig().public as { sentryDsn?: string }
let originalDsn: string | undefined

/** Lets the lazy `import('@sentry/nuxt')` and its `then` run. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 20))

const serverFault = new GqlError([{ message: 'x', extensions: { code: 'PAYMENT_FAILED' } }])

beforeEach(() => {
  originalDsn = publicConfig().sentryDsn
  publicConfig().sentryDsn = 'https://key@o1.ingest.sentry.io/2'
  sentry.captureException.mockReset()
})

afterEach(() => {
  publicConfig().sentryDsn = originalDsn
  vi.restoreAllMocks()
})

describe('in production with a Sentry DSN', () => {
  it('sends the error to Sentry tagged with the context where it was caught', async () => {
    const failure = new Error('boom')
    reportError(failure, 'cart.sync')
    await vi.waitFor(() => {
      expect(sentry.captureException).toHaveBeenCalledExactlyOnceWith(failure, {
        tags: { context: 'cart.sync' },
      })
    })
  })

  it('adds the extra data when given', async () => {
    reportError(serverFault, 'order.create', { orderId: 'o1' })
    await vi.waitFor(() => {
      expect(sentry.captureException).toHaveBeenCalledExactlyOnceWith(serverFault, {
        tags: { context: 'order.create' },
        extra: { orderId: 'o1' },
      })
    })
  })

  it('returns at once: it is fire and forget', () => {
    expect(reportError(new Error('boom'), 'x')).toBeUndefined()
  })

  it('never throws when Sentry cannot be loaded', async () => {
    vi.doMock('@sentry/nuxt', () => {
      throw new Error('chunk failed to load')
    })
    vi.resetModules()
    try {
      const { reportError: freshReport } = await import('./reportError')
      expect(() => {
        freshReport(new Error('boom'), 'x')
      }).not.toThrow()
      await settle()
      expect(sentry.captureException).not.toHaveBeenCalled()
    } finally {
      vi.doMock('@sentry/nuxt', () => ({ captureException: sentry.captureException }))
    }
  })
})

describe('what is not sent to Sentry', () => {
  it.each([
    ['an aborted request', Object.assign(new Error('aborted'), { name: 'AbortError' })],
    [
      'a dropped connection',
      new GqlError([{ message: 'x', extensions: { code: GQL_NETWORK_ERROR } }]),
    ],
    [
      'a customer mistake',
      new GqlError([{ message: 'x', extensions: { code: 'COUPON_INVALID' } }]),
    ],
    ['a REST 4xx', Object.assign(new Error('422'), { status: 422 })],
  ])('%s', async (_label, error) => {
    reportError(error, 'x')
    await settle()
    expect(sentry.captureException).not.toHaveBeenCalled()
  })

  it('anything, when the shop has no DSN', async () => {
    publicConfig().sentryDsn = ''
    reportError(new Error('boom'), 'x')
    await settle()
    expect(sentry.captureException).not.toHaveBeenCalled()
  })

  it('anything, when there is no Nuxt app to read the config from', async () => {
    app.tryUseNuxtApp.mockReturnValueOnce(null)
    reportError(new Error('boom'), 'x')
    await settle()
    expect(sentry.captureException).not.toHaveBeenCalled()
  })

  it('anything, when reading the config throws', async () => {
    app.tryUseNuxtApp.mockImplementationOnce(() => {
      throw new Error('no context')
    })
    expect(() => {
      reportError(new Error('boom'), 'x')
    }).not.toThrow()
    await settle()
    expect(sentry.captureException).not.toHaveBeenCalled()
  })
})

describe('in development', () => {
  it('also writes the error on the console, with its context, even when it is not reportable', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    setFlags({ dev: true })
    const aborted = Object.assign(new Error('aborted'), { name: 'AbortError' })
    reportError(aborted, 'menu.load')
    expect(warn).toHaveBeenCalledExactlyOnceWith('[menu.load]', aborted)
  })

  it('stays silent on the console in production', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    reportError(new Error('boom'), 'menu.load')
    expect(warn).not.toHaveBeenCalled()
  })
})
