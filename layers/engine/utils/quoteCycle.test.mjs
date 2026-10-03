// The quote request cycle: debounce, abort, stale answers, reuse, old backend.
// Run: `vp test run layers/engine/utils/quoteCycle.test.mjs`.

import { QUOTE_TIMEOUT_MS, createQuoteCycle } from './quoteCycle.ts'
import { onTestFinished, test, vi } from 'vite-plus/test'
import { GqlError } from './gqlError.ts'
import assert from 'node:assert/strict'

const DEBOUNCE = 400

// A store with the same contract as the Pinia quote store (stores/quote.ts).
const makeStore = () => {
  const store = {
    quote: null,
    quoteKey: '',
    lineKeys: [],
    wantedKey: '',
    settledKey: '',
    error: null,
    unsupported: false,
    want(key) {
      store.wantedKey = key
      if (key === '') store.clear()
    },
    resolve(key, lineKeys, quote) {
      Object.assign(store, { quote, quoteKey: key, lineKeys, settledKey: key, error: null })
    },
    fail(key, error) {
      store.settledKey = key
      store.error = error
    },
    reuse(key) {
      store.settledKey = key
      store.error = null
    },
    markUnsupported() {
      store.unsupported = true
      store.wantedKey = ''
      store.clear()
    },
    clear() {
      Object.assign(store, { quote: null, quoteKey: '', lineKeys: [], settledKey: '', error: null })
    },
    get pending() {
      return store.wantedKey !== '' && store.wantedKey !== store.settledKey
    },
    get fresh() {
      return store.quote !== null && store.quoteKey === store.wantedKey
    },
  }
  return store
}

// A transport whose answers the test releases by hand, in any order.
const makeTransport = ({ ignoreAbort = false } = {}) => {
  const calls = []
  const send = (input, signal) =>
    new Promise((resolve, reject) => {
      const call = {
        input,
        aborted: false,
        resolve: (quote) => {
          resolve(quote)
        },
        reject,
      }
      signal.addEventListener('abort', () => {
        call.aborted = true
        // A real fetch rejects; `ignoreAbort` models a transport that still delivers the old answer.
        if (!ignoreAbort) reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))
      })
      calls.push(call)
    })
  return { calls, send }
}

const req = (key, lines = [key]) => ({ key, input: { key }, lineKeys: lines })
const answer = (tag) => ({ lines: [], total: tag, issues: [], coupon: null })
const flush = () =>
  new Promise((resolve) => {
    setImmediate(resolve)
  })

const setup = ({ ignoreAbort, ...extra } = {}) => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  const store = makeStore()
  const transport = makeTransport({ ignoreAbort })
  const events = { quotes: [], errors: [] }
  const cycle = createQuoteCycle({
    store: () => store,
    send: transport.send,
    debounceMs: DEBOUNCE,
    onQuote: (quote, request) => events.quotes.push([request.key, quote.total]),
    onError: (error) => events.errors.push(error),
    ...extra,
  })
  return { store, transport, events, cycle }
}

test('the first quote of a visit goes out at once, and the store is pending until it answers', async () => {
  const { store, transport, cycle } = setup()
  onTestFinished(() => vi.useRealTimers())
  cycle.request(req('A'))
  assert.equal(store.pending, true)
  vi.advanceTimersByTime(0)
  assert.equal(transport.calls.length, 1)
  transport.calls[0].resolve(answer('A'))
  await flush()
  assert.equal(store.pending, false)
  assert.equal(store.fresh, true)
  assert.equal(store.quote.total, 'A')
})

test('later changes are debounced: only the last of a burst is sent', async () => {
  const { store, transport, cycle } = setup()
  onTestFinished(() => vi.useRealTimers())
  cycle.request(req('A'))
  vi.advanceTimersByTime(0)
  transport.calls[0].resolve(answer('A'))
  await flush()

  cycle.request(req('B'))
  vi.advanceTimersByTime(DEBOUNCE - 1)
  cycle.request(req('C'))
  vi.advanceTimersByTime(DEBOUNCE - 1)
  cycle.request(req('D'))
  assert.equal(transport.calls.length, 1, 'nothing sent while the burst lasts')
  assert.equal(store.pending, true)
  vi.advanceTimersByTime(DEBOUNCE)
  assert.equal(transport.calls.length, 2)
  assert.deepEqual(transport.calls[1].input, { key: 'D' })
})

test('an out-of-order answer is ignored: the slow old request never overwrites the new one', async () => {
  const { store, transport, events, cycle } = setup({ ignoreAbort: true })
  onTestFinished(() => vi.useRealTimers())
  cycle.request(req('A'))
  vi.advanceTimersByTime(0)
  transport.calls[0].resolve(answer('A'))
  await flush()

  cycle.request(req('B'))
  vi.advanceTimersByTime(DEBOUNCE) // B is in flight
  cycle.request(req('C'))
  vi.advanceTimersByTime(DEBOUNCE) // C is in flight, B was aborted
  assert.equal(transport.calls[1].aborted, true)
  assert.equal(transport.calls.length, 3)

  // The answer of C arrives first, then B's (a transport that ignores aborts delivers it anyway).
  transport.calls[2].resolve(answer('C'))
  await flush()
  transport.calls[1].resolve(answer('B'))
  await flush()
  assert.equal(store.quote.total, 'C')
  assert.equal(store.quoteKey, 'C')
  assert.equal(store.fresh, true)
  assert.deepEqual(
    events.quotes.map(([key]) => key),
    ['A', 'C'],
  )
})

test('an answer for inputs the cart has already left is dropped, not shown', async () => {
  const { store, transport, cycle } = setup({ ignoreAbort: true })
  onTestFinished(() => vi.useRealTimers())
  cycle.request(req('A'))
  vi.advanceTimersByTime(0)
  transport.calls[0].resolve(answer('A'))
  await flush()
  cycle.request(req('B'))
  vi.advanceTimersByTime(DEBOUNCE) // B in flight
  cycle.request(req('C')) // The cart moved on before B answered
  transport.calls[1].resolve(answer('B'))
  await flush()
  assert.equal(store.quote.total, 'A', 'B must not replace the quote of A while C is wanted')
  assert.equal(store.pending, true)
})

test('announcing the same inputs again (a second surface) neither duplicates nor restarts the request', () => {
  const { transport, cycle } = setup()
  onTestFinished(() => vi.useRealTimers())
  cycle.request(req('A'))
  cycle.request(req('A'))
  vi.advanceTimersByTime(0)
  cycle.request(req('A'))
  assert.equal(transport.calls.length, 1)
  assert.equal(transport.calls[0].aborted, false)
})

test('back to inputs that are already answered cancels what was asked in between', async () => {
  const { store, transport, cycle } = setup()
  onTestFinished(() => vi.useRealTimers())
  cycle.request(req('A'))
  vi.advanceTimersByTime(0)
  transport.calls[0].resolve(answer('A'))
  await flush()

  cycle.request(req('B'))
  vi.advanceTimersByTime(DEBOUNCE) // B in flight
  cycle.request(req('A')) // The customer undid the change
  assert.equal(transport.calls[1].aborted, true)
  assert.equal(store.pending, false, 'A is answered: nothing to wait for')
  assert.equal(store.fresh, true)
  vi.advanceTimersByTime(DEBOUNCE * 2)
  assert.equal(transport.calls.length, 2, 'no further request')
})

test('a failed request settles the cycle without a quote: surfaces fall back and nothing stays pending', async () => {
  const { store, transport, events, cycle } = setup()
  onTestFinished(() => vi.useRealTimers())
  cycle.request(req('A'))
  vi.advanceTimersByTime(0)
  const offline = GqlError.fromTransport(new TypeError('Failed to fetch'))
  transport.calls[0].reject(offline)
  await flush()
  assert.equal(store.pending, false)
  assert.equal(store.fresh, false)
  assert.equal(store.error, offline)
  assert.deepEqual(events.errors, [offline])
  // The next change tries again.
  cycle.request(req('B'))
  vi.advanceTimersByTime(DEBOUNCE)
  assert.equal(transport.calls.length, 2)
})

test('an old backend: the validation error is detected once, then the cycle never asks again', async () => {
  const { store, transport, events, cycle } = setup()
  onTestFinished(() => vi.useRealTimers())
  cycle.request(req('A'))
  vi.advanceTimersByTime(0)
  transport.calls[0].reject(
    new GqlError([
      {
        message: 'Cannot query field "quoteOrder" on type "Query".',
        extensions: { code: 'GRAPHQL_VALIDATION_FAILED' },
      },
    ]),
  )
  await flush()
  assert.equal(store.unsupported, true)
  assert.equal(store.pending, false)
  assert.deepEqual(events.errors, [], 'not reported as an error')
  cycle.request(req('B'))
  vi.advanceTimersByTime(DEBOUNCE * 3)
  assert.equal(transport.calls.length, 1)
  assert.equal(store.pending, false)
})

test('an empty cart clears the quote and cancels anything in flight', async () => {
  const { store, transport, cycle } = setup()
  onTestFinished(() => vi.useRealTimers())
  cycle.request(req('A'))
  vi.advanceTimersByTime(0)
  transport.calls[0].resolve(answer('A'))
  await flush()
  cycle.request(req('B'))
  vi.advanceTimersByTime(DEBOUNCE)
  cycle.request(null)
  assert.equal(transport.calls[1].aborted, true)
  assert.equal(store.quote, null)
  assert.equal(store.pending, false)
})

test('stop() aborts and forgets (no surface shows a quote any more)', () => {
  const { store, transport, cycle } = setup()
  onTestFinished(() => vi.useRealTimers())
  cycle.request(req('A'))
  vi.advanceTimersByTime(0)
  cycle.stop()
  assert.equal(transport.calls[0].aborted, true)
  assert.equal(store.wantedKey, '')
  assert.equal(store.pending, false)
})

test('isCurrent decides whether the coupon of the cart is re-checked against an answer', async () => {
  let current = true
  const { transport, events, cycle } = setup({ isCurrent: () => current })
  onTestFinished(() => vi.useRealTimers())
  cycle.request(req('A'))
  vi.advanceTimersByTime(0)
  current = false
  transport.calls[0].resolve(answer('A'))
  await flush()
  assert.deepEqual(events.quotes, [])
})

test('a request that never answers times out: the cycle settles as failed, so nothing stays pending (Pay is not disabled forever)', async () => {
  const { store, transport, events, cycle } = setup({ ignoreAbort: true })
  onTestFinished(() => vi.useRealTimers())
  cycle.request(req('A'))
  vi.advanceTimersByTime(0)
  assert.equal(transport.calls.length, 1)
  assert.equal(store.pending, true)
  vi.advanceTimersByTime(QUOTE_TIMEOUT_MS - 1)
  await flush()
  assert.equal(store.pending, true, 'still waiting just before the deadline')
  vi.advanceTimersByTime(1)
  await flush()
  assert.equal(transport.calls[0].aborted, true, 'the hung request is aborted')
  assert.equal(store.pending, false)
  assert.equal(store.fresh, false)
  assert.equal(store.quote, null, 'no quote: surfaces use the client totals')
  assert.equal(events.errors.length, 1)
  assert.equal(
    events.errors[0].code,
    'NETWORK_ERROR',
    'a timeout is a transient failure, not a server fault',
  )
  // The next change tries again.
  cycle.request(req('B'))
  vi.advanceTimersByTime(DEBOUNCE)
  assert.equal(transport.calls.length, 2)
})

test('the timeout is per request and is dropped when the request answers or is superseded', async () => {
  const { store, transport, events, cycle } = setup({ ignoreAbort: true })
  onTestFinished(() => vi.useRealTimers())
  cycle.request(req('A'))
  vi.advanceTimersByTime(0)
  transport.calls[0].resolve(answer('A'))
  await flush()
  vi.advanceTimersByTime(QUOTE_TIMEOUT_MS * 2)
  await flush()
  assert.equal(store.fresh, true, 'an answered request is not failed later by its timer')
  cycle.request(req('B'))
  vi.advanceTimersByTime(DEBOUNCE) // B in flight (never answers)
  cycle.request(req('C'))
  vi.advanceTimersByTime(DEBOUNCE) // C in flight; B superseded
  vi.advanceTimersByTime(QUOTE_TIMEOUT_MS - DEBOUNCE) // B's deadline passes: it must not fail the store
  await flush()
  assert.equal(store.pending, true, 'C is still waited for')
  assert.deepEqual(events.errors, [])
  vi.advanceTimersByTime(DEBOUNCE)
  await flush()
  assert.equal(store.pending, false)
  assert.equal(events.errors.length, 1)
})

test('refresh() asks again for the current inputs even though they are already answered', async () => {
  const { store, transport, events, cycle } = setup()
  onTestFinished(() => vi.useRealTimers())
  cycle.request(req('A'))
  vi.advanceTimersByTime(0)
  transport.calls[0].resolve(answer('A1'))
  await flush()
  cycle.request(req('A')) // Same key: no new request
  assert.equal(transport.calls.length, 1)

  const refreshed = cycle.refresh()
  assert.equal(transport.calls.length, 2, 'sent at once, no debounce')
  cycle.request(req('A')) // A second surface announcing the same key must not cancel it
  assert.equal(transport.calls[1].aborted, false)
  transport.calls[1].resolve(answer('A2'))
  assert.equal((await refreshed).total, 'A2')
  assert.equal(store.quote.total, 'A2')
  assert.equal(store.pending, false)
  assert.deepEqual(events.quotes, [
    ['A', 'A1'],
    ['A', 'A2'],
  ])
})

test('refresh() resolves null (callers carry on as before) when it fails, times out, or has nothing to ask', async () => {
  const { store, transport, cycle } = setup({ ignoreAbort: true })
  onTestFinished(() => vi.useRealTimers())
  assert.equal(await cycle.refresh(), null, 'nothing requested yet')
  cycle.request(req('A'))
  vi.advanceTimersByTime(0)
  transport.calls[0].resolve(answer('A'))
  await flush()

  const failed = cycle.refresh()
  transport.calls[1].reject(GqlError.fromTransport(new TypeError('Failed to fetch')))
  assert.equal(await failed, null)
  assert.equal(store.pending, false)

  const hung = cycle.refresh()
  vi.advanceTimersByTime(QUOTE_TIMEOUT_MS)
  assert.equal(await hung, null)
  assert.equal(store.pending, false)

  cycle.stop()
  assert.equal(await cycle.refresh(), null, 'stopped: nothing to ask')
})

test('refresh() on an old backend marks it unsupported and resolves null', async () => {
  const { store, transport, cycle } = setup()
  onTestFinished(() => vi.useRealTimers())
  cycle.request(req('A'))
  vi.advanceTimersByTime(0)
  transport.calls[0].resolve(answer('A'))
  await flush()
  const refreshed = cycle.refresh()
  transport.calls[1].reject(
    new GqlError([
      {
        message: 'Cannot query field "quoteOrder" on type "Query".',
        extensions: { code: 'GRAPHQL_VALIDATION_FAILED' },
      },
    ]),
  )
  assert.equal(await refreshed, null)
  assert.equal(store.unsupported, true)
})

test('RATE_LIMITED is a transient failure: totals fall back to the client and nothing is pending', async () => {
  const { store, transport, cycle } = setup()
  onTestFinished(() => vi.useRealTimers())
  cycle.request(req('A'))
  vi.advanceTimersByTime(0)
  transport.calls[0].reject(
    new GqlError([{ message: 'slow down', extensions: { code: 'RATE_LIMITED' } }]),
  )
  await flush()
  assert.equal(store.pending, false)
  assert.equal(store.fresh, false)
  assert.equal(store.unsupported, false, 'asked again on the next change')
})
