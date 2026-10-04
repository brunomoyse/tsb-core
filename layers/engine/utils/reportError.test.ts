// ReportError: swallowed errors reach Sentry only in production-like conditions (a DSN is set), never for expected
// Failures, never throwing. The Nuxt app lookup and @sentry/nuxt are the mocked boundaries.
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { setFlags } from '../../../test/flags'
import { GQL_NETWORK_ERROR, GqlError } from './gqlError'

const state = vi.hoisted(() => ({ app: undefined as unknown, throws: false }))
const capture = vi.hoisted(() => vi.fn())
vi.mock('#app', () => ({
  tryUseNuxtApp: () => {
    if (state.throws) throw new Error('no context')
    return state.app
  },
}))
vi.mock('@sentry/nuxt', () => ({ captureException: capture }))

const { reportError } = await import('./reportError')

const withDsn = (dsn: string | undefined) => {
  state.app = { $config: { public: { sentryDsn: dsn } } }
}
const gqlError = (code: string) => new GqlError([{ message: 'boom', extensions: { code } }])
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

beforeEach(() => {
  state.app = undefined
  state.throws = false
  capture.mockReset()
  vi.restoreAllMocks()
})

describe('reportError', () => {
  it('sends a real failure to Sentry with its context tag', async () => {
    withDsn('https://dsn.test/1')
    const error = new Error('Server blew up')
    Object.assign(error, { status: 500 })
    reportError(error, 'checkout')
    await flush()
    expect(capture).toHaveBeenCalledExactlyOnceWith(error, { tags: { context: 'checkout' } })
  })

  it('forwards extra data when given', async () => {
    withDsn('https://dsn.test/1')
    const error = Object.assign(new Error('x'), { status: 502 })
    reportError(error, 'quote', { orderId: 'o1' })
    await flush()
    expect(capture).toHaveBeenCalledExactlyOnceWith(error, {
      tags: { context: 'quote' },
      extra: { orderId: 'o1' },
    })
  })

  it('does not report an expected failure (a dropped connection)', async () => {
    withDsn('https://dsn.test/1')
    reportError(gqlError(GQL_NETWORK_ERROR), 'checkout')
    await flush()
    expect(capture).not.toHaveBeenCalled()
  })

  it('does not report an aborted request', async () => {
    withDsn('https://dsn.test/1')
    reportError(Object.assign(new Error('aborted'), { name: 'AbortError' }), 'checkout')
    await flush()
    expect(capture).not.toHaveBeenCalled()
  })

  it('does nothing without a DSN (the shop has no Sentry)', async () => {
    withDsn(undefined)
    reportError(Object.assign(new Error('x'), { status: 500 }), 'checkout')
    await flush()
    expect(capture).not.toHaveBeenCalled()
  })

  it('does nothing outside a Nuxt context or when the app has no config', async () => {
    reportError(Object.assign(new Error('x'), { status: 500 }), 'a')
    state.app = {}
    reportError(Object.assign(new Error('x'), { status: 500 }), 'b')
    await flush()
    expect(capture).not.toHaveBeenCalled()
  })

  it('never throws when the app lookup throws', async () => {
    state.throws = true
    expect(() => {
      reportError(Object.assign(new Error('x'), { status: 500 }), 'a')
    }).not.toThrow()
    await flush()
    expect(capture).not.toHaveBeenCalled()
  })

  it('never throws when Sentry itself fails', async () => {
    withDsn('https://dsn.test/1')
    capture.mockImplementation(() => {
      throw new Error('sentry down')
    })
    expect(() => {
      reportError(Object.assign(new Error('x'), { status: 500 }), 'a')
    }).not.toThrow()
    await flush()
    expect(capture).toHaveBeenCalledOnce()
  })

  it('warns in the console in dev, even for errors that are not reported', () => {
    setFlags({ dev: true })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const error = gqlError(GQL_NETWORK_ERROR)
    reportError(error, 'checkout')
    expect(warn).toHaveBeenCalledExactlyOnceWith('[checkout]', error)
  })

  it('stays quiet in production', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    reportError(gqlError(GQL_NETWORK_ERROR), 'checkout')
    expect(warn).not.toHaveBeenCalled()
  })

  it('reports a GraphQL server fault, but not a customer-input error', async () => {
    withDsn('https://dsn.test/1')
    const fault = gqlError('PAYMENT_FAILED')
    reportError(fault, 'gql')
    reportError(gqlError('COUPON_EXPIRED'), 'gql')
    await flush()
    expect(capture).toHaveBeenCalledExactlyOnceWith(fault, { tags: { context: 'gql' } })
  })
})
