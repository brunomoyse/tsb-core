// reportError: the one way a `catch` block surfaces what it swallows: console in dev, Sentry in production (when the shop
// has a DSN), and never for what is expected (aborted calls, dropped connections, the customer's input).
// The Nuxt app lookup and @sentry/nuxt are the mocked boundaries. Sentry is loaded lazily: its module factory runs
// only when the code reaches `import('@sentry/nuxt')`, so "nothing was sent" is checked as "Sentry was never even loaded".
// Run: `vp test run layers/engine/utils/reportError.test.ts`.
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { GQL_NETWORK_ERROR } from './gqlError'
import { setFlags } from '../../../test/flags'

const state = vi.hoisted(() => ({ app: undefined as unknown, throws: false, loadFails: false }))
const sentry = vi.hoisted(() => ({ loaded: vi.fn(), captureException: vi.fn() }))
vi.mock('#app', () => ({
  tryUseNuxtApp: () => {
    if (state.throws) throw new Error('no context')
    return state.app
  },
}))

/**
 * A fresh copy of the module, with a Sentry mock whose factory only runs when the code asks to load it. The error
 * class is the fresh copy's too: `instanceof GqlError` inside reportError must see the errors the test builds.
 */
async function load() {
  vi.resetModules()
  vi.doMock('@sentry/nuxt', () => {
    sentry.loaded()
    if (state.loadFails) throw new Error('chunk failed to load')
    return { captureException: sentry.captureException }
  })
  const { GqlError } = await import('./gqlError')
  gqlErrorClass = GqlError
  return (await import('./reportError')).reportError
}

const withDsn = (dsn: string | undefined) => {
  state.app = { $config: { public: { sentryDsn: dsn } } }
}
let gqlErrorClass: typeof import('./gqlError').GqlError
const gqlError = (code: string) => new gqlErrorClass([{ message: 'boom', extensions: { code } }])
const serverFault = () => Object.assign(new Error('Server blew up'), { status: 500 })

beforeEach(() => {
  sentry.loaded.mockClear()
  sentry.captureException.mockReset()
  state.app = undefined
  state.throws = false
  state.loadFails = false
})

describe('in production with a Sentry DSN', () => {
  beforeEach(() => {
    withDsn('https://dsn.test/1')
  })

  it('sends a real failure to Sentry tagged with the context where it was caught', async () => {
    const reportError = await load()
    const error = serverFault()
    reportError(error, 'checkout')
    await vi.waitFor(() => {
      expect(sentry.captureException).toHaveBeenCalledExactlyOnceWith(error, {
        tags: { context: 'checkout' },
      })
    })
  })

  it('forwards extra data when given', async () => {
    const reportError = await load()
    const error = Object.assign(new Error('x'), { status: 502 })
    reportError(error, 'quote', { orderId: 'o1' })
    await vi.waitFor(() => {
      expect(sentry.captureException).toHaveBeenCalledExactlyOnceWith(error, {
        tags: { context: 'quote' },
        extra: { orderId: 'o1' },
      })
    })
  })

  it('reports a GraphQL server fault, but not a customer-input error', async () => {
    const reportError = await load()
    const fault = gqlError('PAYMENT_FAILED')
    reportError(fault, 'gql')
    reportError(gqlError('COUPON_EXPIRED'), 'gql')
    await vi.waitFor(() => {
      expect(sentry.captureException).toHaveBeenCalledExactlyOnceWith(fault, {
        tags: { context: 'gql' },
      })
    })
  })

  it('returns at once and never throws, even when Sentry itself fails', async () => {
    const reportError = await load()
    sentry.captureException.mockImplementation(() => {
      throw new Error('sentry down')
    })
    expect(reportError(serverFault(), 'a')).toBeUndefined()
    await vi.waitFor(() => {
      expect(sentry.captureException).toHaveBeenCalledOnce()
    })
  })

  it('never throws when Sentry cannot be loaded (a failed lazy chunk)', async () => {
    const reportError = await load()
    state.loadFails = true
    expect(() => {
      reportError(serverFault(), 'a')
    }).not.toThrow()
    await vi.dynamicImportSettled()
    expect(sentry.loaded).toHaveBeenCalledOnce()
    expect(sentry.captureException).not.toHaveBeenCalled()
  })

  it.each([
    ['an aborted request', () => Object.assign(new Error('aborted'), { name: 'AbortError' })],
    ['a dropped connection', () => gqlError(GQL_NETWORK_ERROR)],
    ['a customer mistake', () => gqlError('COUPON_INVALID')],
    ['a REST 4xx', () => Object.assign(new Error('422'), { status: 422 })],
  ])('does not report %s: Sentry is not even loaded', async (_label, makeError) => {
    const reportError = await load()
    reportError(makeError(), 'x')
    await vi.dynamicImportSettled()
    expect(sentry.loaded).not.toHaveBeenCalled()
  })
})

describe('without a DSN or a Nuxt app to read it from', () => {
  it('does nothing when the shop has no DSN', async () => {
    withDsn(undefined)
    const reportError = await load()
    reportError(serverFault(), 'checkout')
    await vi.dynamicImportSettled()
    expect(sentry.loaded).not.toHaveBeenCalled()
  })

  it('does nothing outside a Nuxt context, or when the app has no config', async () => {
    const reportError = await load()
    reportError(serverFault(), 'a')
    state.app = {}
    reportError(serverFault(), 'b')
    await vi.dynamicImportSettled()
    expect(sentry.loaded).not.toHaveBeenCalled()
  })

  it('never throws when the app lookup throws', async () => {
    state.throws = true
    const reportError = await load()
    expect(() => {
      reportError(serverFault(), 'a')
    }).not.toThrow()
    await vi.dynamicImportSettled()
    expect(sentry.loaded).not.toHaveBeenCalled()
  })
})

describe('in development', () => {
  it('also writes the error on the console, with its context, even when it is not reportable', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    setFlags({ dev: true })
    const reportError = await load()
    const error = gqlError(GQL_NETWORK_ERROR)
    reportError(error, 'checkout')
    expect(warn).toHaveBeenCalledExactlyOnceWith('[checkout]', error)
  })

  it('stays silent on the console in production', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const reportError = await load()
    reportError(gqlError(GQL_NETWORK_ERROR), 'checkout')
    expect(warn).not.toHaveBeenCalled()
  })
})
