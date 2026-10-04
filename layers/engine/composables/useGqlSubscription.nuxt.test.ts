// useGqlSubscription: GraphQL subscriptions over ONE shared graphql-ws client (browser only), kept alive across
// network drops, tab backgrounding and bfcache restores, with gap recovery (`onReconnect`) for the events the socket missed.
// The graphql-ws client (the WebSocket) is the boundary, replaced by a fake that records its subscriptions; the
// window / document events are captured and fired by hand; the timers are fake when a test is about time.
// Run: `vp test run layers/engine/composables/useGqlSubscription.nuxt.test.ts`.
import { effectScope } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { useRuntimeConfig } from '#imports'
import { setFlags } from '../../../test/flags'
import { settle } from '../../../test/helpers/settle'

interface Sink {
  next: (message: { data?: unknown }) => void
  error: (error: unknown) => void
  complete: () => void
}
interface ClientEvents {
  connected: (socket: unknown, payload: unknown, wasRetry: boolean) => void
  closed: () => void
  ping: (received: boolean) => void
  pong: (received: boolean) => void
}
interface ClientOptions {
  url: string
  connectionParams: () => Promise<Record<string, unknown>>
  keepAlive: number
  retryAttempts: number
  retryWait: (retries: number) => Promise<void>
  on: ClientEvents
}

class FakeClient {
  readonly subscriptions: {
    payload: { query: string; variables: unknown }
    sink: Sink
    unsubscribe: () => void
  }[] = []
  readonly dispose = vi.fn(() => Promise.resolve())
  constructor(readonly options: ClientOptions) {}
  subscribe = vi.fn((payload: { query: string; variables: unknown }, sink: Sink) => {
    const unsubscribe = vi.fn()
    this.subscriptions.push({ payload, sink, unsubscribe })
    return unsubscribe
  })
}

const h = vi.hoisted(() => ({
  clients: [] as unknown[],
  createClient: vi.fn(),
  getAccessToken: vi.fn<() => Promise<string | null>>(),
  reportError: vi.fn(),
}))
vi.mock('graphql-ws/client', () => ({ createClient: h.createClient }))
vi.mock('#engine/composables/useOidc', () => ({
  useOidc: () => ({ getAccessToken: h.getAccessToken }),
}))
vi.mock('#engine/utils/reportError', () => ({ reportError: h.reportError }))

const clients = () => h.clients as FakeClient[]

/** The window / document listeners the module registers, fired by hand. */
const listeners: Record<string, (event?: unknown) => void> = {}
const addedListeners: string[] = []
let visibility: DocumentVisibilityState = 'visible'

/** A fresh copy of the module (the shared client and the listeners are module state). */
async function load() {
  vi.resetModules()
  const { useGqlSubscription } = await import('./useGqlSubscription')
  const scopes: ReturnType<typeof effectScope>[] = []
  const subscribe = <T = unknown>(
    ...args: Parameters<typeof useGqlSubscription>
  ): ReturnType<typeof useGqlSubscription<T>> => {
    const scope = effectScope()
    scopes.push(scope)
    return scope.run(() => useGqlSubscription<T>(...args))!
  }
  return { subscribe, scopes }
}

/** Waits for the shared client to exist and for `count` subscriptions to have reached it. */
const ready = (count = 1) =>
  vi.waitFor(() => {
    const client = clients().at(-1)
    expect(client?.subscriptions.length).toBeGreaterThanOrEqual(count)
  })

const lastClient = () => clients().at(-1)!
const sinkOf = (index = 0, client: FakeClient = lastClient()) => client.subscriptions[index]!.sink

const SUB = 'subscription Updated { updated { id } }'

beforeEach(() => {
  vi.resetAllMocks()
  h.clients.length = 0
  h.createClient.mockImplementation((options: ClientOptions) => {
    const client = new FakeClient(options)
    h.clients.push(client)
    return client
  })
  h.getAccessToken.mockResolvedValue('token-1')
  for (const key of Object.keys(listeners)) delete listeners[key]
  addedListeners.length = 0
  visibility = 'visible'
  const capture = (target: Window | Document) => {
    const original = target.addEventListener.bind(target) as (...args: unknown[]) => void
    vi.spyOn(target, 'addEventListener').mockImplementation(((
      type: string,
      fn: (e?: unknown) => void,
      ...rest: unknown[]
    ) => {
      if (['offline', 'online', 'pagehide', 'pageshow', 'visibilitychange'].includes(type)) {
        listeners[type] = fn
        addedListeners.push(type)
      } else original(type, fn, ...rest)
    }) as never)
  }
  capture(window)
  capture(document)
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('a subscription', () => {
  it('goes through one graphql-ws client to the configured WebSocket URL, with the query and variables', async () => {
    const { subscribe } = await load()
    subscribe(SUB, { id: 'o1' })
    await ready()
    expect(h.createClient).toHaveBeenCalledOnce()
    expect(lastClient().options.url).toBe(useRuntimeConfig().public.graphqlWs)
    expect(lastClient().subscriptions[0]!.payload).toEqual({ query: SUB, variables: { id: 'o1' } })
  })

  it('subscribes without variables by default', async () => {
    const { subscribe } = await load()
    subscribe(SUB)
    await ready()
    expect(lastClient().subscriptions[0]!.payload.variables).toEqual({})
  })

  it('exposes each pushed payload as `data`, and ignores a message without data', async () => {
    const { subscribe } = await load()
    const { data, error } = subscribe<{ updated: { id: string } }>(SUB)
    await ready()
    expect(data.value).toBeUndefined()

    sinkOf().next({ data: { updated: { id: 'a' } } })
    expect(data.value).toEqual({ updated: { id: 'a' } })
    sinkOf().next({})
    expect(data.value).toEqual({ updated: { id: 'a' } })
    sinkOf().next({ data: { updated: { id: 'b' } } })
    expect(data.value).toEqual({ updated: { id: 'b' } })
    expect(error.value).toBeNull()
  })

  it('turns a GraphQL error of the server into a GqlError with its code', async () => {
    const { subscribe } = await load()
    const { error } = subscribe(SUB)
    await ready()
    sinkOf().error([{ message: 'not allowed', extensions: { code: 'FORBIDDEN' } }])
    // (a fresh copy of the module is loaded per test, hence the name rather than instanceof)
    expect(error.value).toMatchObject({
      name: 'GqlError',
      code: 'FORBIDDEN',
      message: 'not allowed',
    })
  })

  it('keeps an Error as it is, and the stream completing changes nothing', async () => {
    const { subscribe } = await load()
    const { error, data } = subscribe(SUB)
    await ready()
    const failure = new Error('socket closed')
    sinkOf().error(failure)
    expect(error.value).toBe(failure)
    sinkOf().complete()
    expect(error.value).toBe(failure)
    expect(data.value).toBeUndefined()
  })

  it('reports an error when the client cannot even be created', async () => {
    const failure = new Error('bad url')
    h.createClient.mockImplementation(() => {
      throw failure
    })
    const { subscribe } = await load()
    const { error } = subscribe(SUB)
    await vi.waitFor(() => {
      expect(error.value).toBe(failure)
    })
  })

  it('shares one client between subscriptions, whether they start together or later', async () => {
    const { subscribe } = await load()
    subscribe(SUB, { n: 1 })
    subscribe(SUB, { n: 2 })
    await ready(2)
    subscribe(SUB, { n: 3 })
    await ready(3)
    expect(h.createClient).toHaveBeenCalledOnce()
    expect(clients()[0]!.subscriptions.map((s) => s.payload.variables)).toEqual([
      { n: 1 },
      { n: 2 },
      { n: 3 },
    ])
  })
})

describe('the client', () => {
  it('authenticates every connection with the current access token, and connects anonymously without one', async () => {
    const { subscribe } = await load()
    subscribe(SUB)
    await ready()
    const { connectionParams } = lastClient().options
    await expect(connectionParams()).resolves.toEqual({ Authorization: 'Bearer token-1' })
    h.getAccessToken.mockResolvedValue(null)
    await expect(connectionParams()).resolves.toEqual({})
  })

  it('pings every 12 seconds and retries for ever', async () => {
    const { subscribe } = await load()
    subscribe(SUB)
    await ready()
    expect(lastClient().options).toMatchObject({ keepAlive: 12_000, retryAttempts: Infinity })
  })

  it('backs off exponentially between reconnection attempts, up to 30 seconds', async () => {
    const { subscribe } = await load()
    subscribe(SUB)
    await ready()
    const { retryWait } = lastClient().options
    vi.useFakeTimers()
    for (const [retries, expectedMs] of [
      [0, 1_000],
      [1, 2_000],
      [3, 8_000],
      [4, 16_000],
      [5, 30_000],
      [20, 30_000],
    ] as const) {
      let done = false
      const waiting = retryWait(retries).then(() => {
        done = true
      })
      await vi.advanceTimersByTimeAsync(expectedMs - 1)
      expect(done, `retry ${retries} must still wait at ${expectedMs - 1} ms`).toBe(false)
      await vi.advanceTimersByTimeAsync(1)
      await waiting
      expect(done).toBe(true)
    }
  })
})

describe('closing', () => {
  it('stop() unsubscribes on the server side once, however often it is called', async () => {
    const { subscribe } = await load()
    const { stop } = subscribe(SUB)
    await ready()
    stop()
    stop()
    expect(lastClient().subscriptions[0]!.unsubscribe).toHaveBeenCalledOnce()
  })

  it('closeAll() is the same as stop()', async () => {
    const { subscribe } = await load()
    const { closeAll } = subscribe(SUB)
    await ready()
    closeAll()
    expect(lastClient().subscriptions[0]!.unsubscribe).toHaveBeenCalledOnce()
  })

  it('is done when the scope of the component ends', async () => {
    const { subscribe, scopes } = await load()
    subscribe(SUB)
    await ready()
    scopes[0]!.stop()
    expect(lastClient().subscriptions[0]!.unsubscribe).toHaveBeenCalledOnce()
  })

  it('never subscribes when it is stopped before the client is ready', async () => {
    const { subscribe } = await load()
    const { stop } = subscribe(SUB)
    stop()
    // A second subscription proves the client did become ready meanwhile.
    subscribe(SUB, { other: true })
    await ready()
    expect(lastClient().subscriptions.map((s) => s.payload.variables)).toEqual([{ other: true }])
  })

  it('does not report a client failure to a subscription that is already stopped', async () => {
    h.createClient.mockImplementation(() => {
      throw new Error('bad url')
    })
    const { subscribe } = await load()
    const { stop, error } = subscribe(SUB)
    stop()
    await vi.waitFor(() => {
      expect(h.createClient).toHaveBeenCalled()
    })
    await settle()
    expect(error.value).toBeNull()
  })

  it('a stopped subscription is not restarted when the client is recycled', async () => {
    const { subscribe } = await load()
    const { stop } = subscribe(SUB)
    await ready()
    stop()
    listeners.pageshow!({ persisted: true })
    await settle()
    expect(clients()).toHaveLength(1)
    expect(lastClient().subscriptions).toHaveLength(1)
  })
})

describe('during SSR', () => {
  it('opens nothing: no client, no listeners, no data', async () => {
    setFlags({ server: true })
    const { subscribe } = await load()
    const { data, error } = subscribe(SUB)
    await settle()
    expect(h.createClient).not.toHaveBeenCalled()
    expect(addedListeners).toEqual([])
    expect(data.value).toBeUndefined()
    expect(error.value).toBeNull()
  })
})

describe('global browser events', () => {
  it('are bound once for the whole app, however many subscriptions there are', async () => {
    const { subscribe } = await load()
    subscribe(SUB)
    subscribe(SUB)
    subscribe(SUB)
    await ready(3)
    expect(addedListeners.toSorted()).toEqual([
      'offline',
      'online',
      'pagehide',
      'pageshow',
      'visibilitychange',
    ])
  })

  describe('going offline and back online', () => {
    it('shows every subscription as offline, then recycles the client and resubscribes when the network is back', async () => {
      const { subscribe } = await load()
      const a = subscribe(SUB, { n: 1 })
      const b = subscribe(SUB, { n: 2 })
      await ready(2)
      const first = lastClient()

      listeners.offline!()
      expect(a.error.value).toMatchObject({ message: 'Lost internet connection' })
      expect(b.error.value).toMatchObject({ message: 'Lost internet connection' })

      listeners.online!()
      expect(a.error.value).toBeNull()
      expect(b.error.value).toBeNull()
      expect(first.dispose).toHaveBeenCalledOnce()

      await vi.waitFor(() => {
        expect(clients()).toHaveLength(2)
        expect(clients()[1]!.subscriptions).toHaveLength(2)
      })
      expect(clients()[1]!.subscriptions.map((s) => s.payload.variables)).toEqual([
        { n: 1 },
        { n: 2 },
      ])
      // The old, disposed client's subscriptions are not unsubscribed again.
      expect(first.subscriptions[0]!.unsubscribe).not.toHaveBeenCalled()
      // Events flow on the new client.
      sinkOf(0, clients()[1]).next({ data: { n: 'after' } })
      expect(a.data.value).toEqual({ n: 'after' })
    })

    it('does nothing when the network comes back without having gone away (no spurious reconnect)', async () => {
      const { subscribe } = await load()
      subscribe(SUB)
      await ready()
      listeners.online!()
      await settle()
      expect(clients()).toHaveLength(1)
      expect(clients()[0]!.dispose).not.toHaveBeenCalled()
    })

    it('recycles once per outage, not on every online event', async () => {
      const { subscribe } = await load()
      subscribe(SUB)
      await ready()
      listeners.offline!()
      listeners.online!()
      listeners.online!()
      await vi.waitFor(() => {
        expect(clients()).toHaveLength(2)
      })
      expect(clients()[0]!.dispose).toHaveBeenCalledOnce()
    })
  })

  describe('the tab going to the background and back', () => {
    const hide = () => {
      visibility = 'hidden'
      listeners.visibilitychange!()
    }
    const show = () => {
      visibility = 'visible'
      listeners.visibilitychange!()
    }

    it('closes the socket cleanly after 2 seconds hidden, without restarting subscriptions yet', async () => {
      const { subscribe } = await load()
      subscribe(SUB)
      await ready()
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
      hide()
      vi.advanceTimersByTime(1_999)
      expect(lastClient().dispose).not.toHaveBeenCalled()
      vi.advanceTimersByTime(1)
      expect(lastClient().dispose).toHaveBeenCalledOnce()
      expect(clients()).toHaveLength(1)
    })

    it('recycles the client when the tab shows again after it was closed, and tells subscribers to catch up', async () => {
      const { subscribe } = await load()
      const onReconnect = vi.fn()
      const { data } = subscribe<{ n: number }>(SUB, {}, { onReconnect })
      await ready()
      const first = lastClient()
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
      hide()
      vi.advanceTimersByTime(5_000)
      expect(first.dispose).toHaveBeenCalledOnce()

      show()
      expect(onReconnect).toHaveBeenCalledOnce()
      vi.useRealTimers()
      await vi.waitFor(() => {
        expect(clients()).toHaveLength(2)
      })
      await vi.waitFor(() => {
        expect(clients()[1]!.subscriptions).toHaveLength(1)
      })
      sinkOf(0, clients()[1]).next({ data: { n: 1 } })
      expect(data.value).toEqual({ n: 1 })
    })

    it('leaves a quick tab switch alone (shown again before the 2 s grace)', async () => {
      const { subscribe } = await load()
      const onReconnect = vi.fn()
      subscribe(SUB, {}, { onReconnect })
      await ready()
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
      hide()
      vi.advanceTimersByTime(1_000)
      show()
      vi.advanceTimersByTime(10_000)
      expect(lastClient().dispose).not.toHaveBeenCalled()
      expect(onReconnect).not.toHaveBeenCalled()
      expect(clients()).toHaveLength(1)
    })

    it('recycles after a hidden period over 3 seconds even if the socket was not closed by us (the OS killed it)', async () => {
      const { subscribe } = await load()
      const onReconnect = vi.fn()
      subscribe(SUB, {}, { onReconnect })
      await ready()
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
      hide()
      // Pagehide cancels the grace timer and disposes, without marking the client as proactively closed.
      listeners.pagehide!()
      vi.advanceTimersByTime(3_001)
      show()
      expect(onReconnect).toHaveBeenCalledOnce()
    })

    it('does not recycle after a hidden period of 3 seconds or less when nothing was closed', async () => {
      const { subscribe } = await load()
      const onReconnect = vi.fn()
      subscribe(SUB, {}, { onReconnect })
      await ready()
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
      hide()
      listeners.pagehide!()
      vi.advanceTimersByTime(3_000)
      show()
      expect(onReconnect).not.toHaveBeenCalled()
    })

    it('restarts the grace period when the tab is hidden twice in a row', async () => {
      const { subscribe } = await load()
      subscribe(SUB)
      await ready()
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
      hide()
      vi.advanceTimersByTime(1_500)
      hide()
      vi.advanceTimersByTime(1_500)
      expect(lastClient().dispose).not.toHaveBeenCalled()
      vi.advanceTimersByTime(500)
      expect(lastClient().dispose).toHaveBeenCalledOnce()
    })

    it('ignores a visibility state that is neither hidden nor visible, but still cancels the grace timer', async () => {
      const { subscribe } = await load()
      subscribe(SUB)
      await ready()
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
      hide()
      visibility = 'prerender' as DocumentVisibilityState
      listeners.visibilitychange!()
      vi.advanceTimersByTime(10_000)
      expect(lastClient().dispose).not.toHaveBeenCalled()
      expect(clients()).toHaveLength(1)
    })
  })

  describe('leaving the page', () => {
    it('closes the socket cleanly on pagehide and cancels a pending background close', async () => {
      const { subscribe } = await load()
      subscribe(SUB)
      await ready()
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
      visibility = 'hidden'
      listeners.visibilitychange!()
      listeners.pagehide!()
      expect(lastClient().dispose).toHaveBeenCalledOnce()
      vi.advanceTimersByTime(10_000)
      // The grace timer was cancelled: the client is not disposed a second time.
      expect(lastClient().dispose).toHaveBeenCalledOnce()
    })

    it('swallows a failure of the dispose (the network is down): no unhandled rejection', async () => {
      const { subscribe } = await load()
      subscribe(SUB)
      await ready()
      lastClient().dispose.mockRejectedValue(new Event('error'))
      const unhandled = vi.fn()
      process.on('unhandledRejection', unhandled)
      try {
        listeners.pagehide!()
        await settle()
      } finally {
        process.off('unhandledRejection', unhandled)
      }
      expect(unhandled).not.toHaveBeenCalled()
      expect(lastClient().dispose).toHaveBeenCalledOnce()
    })

    it('a pagehide before the client exists does not lose the subscription that is on its way', async () => {
      const { subscribe } = await load()
      subscribe(SUB)
      listeners.pagehide!()
      await ready()
      expect(clients()).toHaveLength(1)
      expect(lastClient().subscriptions).toHaveLength(1)
    })

    it('recycles on pageshow only when the page was restored from the back-forward cache', async () => {
      const { subscribe } = await load()
      const onReconnect = vi.fn()
      subscribe(SUB, {}, { onReconnect })
      await ready()
      listeners.pageshow!({ persisted: false })
      expect(onReconnect).not.toHaveBeenCalled()
      expect(clients()).toHaveLength(1)

      listeners.pageshow!({ persisted: true })
      expect(onReconnect).toHaveBeenCalledOnce()
      await vi.waitFor(() => {
        expect(clients()).toHaveLength(2)
      })
    })
  })
})

describe('gap recovery (onReconnect)', () => {
  it('runs the callback of every subscription that has one when graphql-ws itself reconnects', async () => {
    const { subscribe } = await load()
    const first = vi.fn()
    const second = vi.fn()
    subscribe(SUB, {}, { onReconnect: first })
    subscribe(SUB, {}, { onReconnect: second })
    subscribe(SUB) // None: skipped
    await ready(3)
    lastClient().options.on.connected({}, undefined, true)
    expect(first).toHaveBeenCalledOnce()
    expect(second).toHaveBeenCalledOnce()
  })

  it('does not run it for the first connection of a client', async () => {
    const { subscribe } = await load()
    const onReconnect = vi.fn()
    subscribe(SUB, {}, { onReconnect })
    await ready()
    lastClient().options.on.connected({}, undefined, false)
    expect(onReconnect).not.toHaveBeenCalled()
  })

  it('reports a callback that fails (async) and still runs the others', async () => {
    const { subscribe } = await load()
    const failure = new Error('refetch failed')
    const failing = vi.fn(() => Promise.reject(failure))
    const fine = vi.fn()
    subscribe(SUB, {}, { onReconnect: failing })
    subscribe(SUB, {}, { onReconnect: fine })
    await ready(2)
    lastClient().options.on.connected({}, undefined, true)
    await vi.waitFor(() => {
      expect(h.reportError).toHaveBeenCalledExactlyOnceWith(failure, 'gql.subscription.reconnect')
    })
    expect(fine).toHaveBeenCalledOnce()
  })

  it('waits for an async callback without blocking the others', async () => {
    const { subscribe } = await load()
    const slow = vi.fn(() => new Promise<void>(() => undefined))
    const fine = vi.fn()
    subscribe(SUB, {}, { onReconnect: slow })
    subscribe(SUB, {}, { onReconnect: fine })
    await ready(2)
    lastClient().options.on.connected({}, undefined, true)
    expect(fine).toHaveBeenCalledOnce()
    expect(h.reportError).not.toHaveBeenCalled()
  })
})

describe('the pong watchdog (silent connection drops)', () => {
  const socket = (readyState: number = WebSocket.OPEN) => ({ readyState, close: vi.fn() })

  async function connected(sock: ReturnType<typeof socket>) {
    const { subscribe } = await load()
    subscribe(SUB)
    await ready()
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
    const { on } = lastClient().options
    on.connected(sock, undefined, false)
    return on
  }

  it('closes the socket with code 4408 when no pong arrives within 5 seconds of our ping', async () => {
    const sock = socket()
    const on = await connected(sock)
    on.ping(false)
    vi.advanceTimersByTime(4_999)
    expect(sock.close).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(sock.close).toHaveBeenCalledExactlyOnceWith(4408, 'Pong timeout')
  })

  it('leaves the socket alone when the pong arrives in time', async () => {
    const sock = socket()
    const on = await connected(sock)
    on.ping(false)
    vi.advanceTimersByTime(2_000)
    on.pong(true)
    vi.advanceTimersByTime(10_000)
    expect(sock.close).not.toHaveBeenCalled()
  })

  it('does not close a socket that is no longer open', async () => {
    const sock = socket(WebSocket.CLOSING)
    const on = await connected(sock)
    on.ping(false)
    vi.advanceTimersByTime(5_000)
    expect(sock.close).not.toHaveBeenCalled()
  })

  it("ignores the server's own pings and a pong of the server's", async () => {
    const sock = socket()
    const on = await connected(sock)
    on.ping(true)
    vi.advanceTimersByTime(10_000)
    expect(sock.close).not.toHaveBeenCalled()

    on.ping(false)
    vi.advanceTimersByTime(3_000)
    on.pong(false)
    vi.advanceTimersByTime(2_000)
    expect(sock.close).toHaveBeenCalledOnce()
  })

  it('watches only the latest ping', async () => {
    const sock = socket()
    const on = await connected(sock)
    on.ping(false)
    vi.advanceTimersByTime(4_000)
    on.ping(false)
    vi.advanceTimersByTime(4_000)
    expect(sock.close).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1_000)
    expect(sock.close).toHaveBeenCalledOnce()
  })

  it('stops watching when the socket closes', async () => {
    const sock = socket()
    const on = await connected(sock)
    on.ping(false)
    on.closed()
    vi.advanceTimersByTime(10_000)
    expect(sock.close).not.toHaveBeenCalled()
  })

  it('watches the next socket after one closed: only the new one is closed on a missed pong', async () => {
    const first = socket()
    const on = await connected(first)
    on.ping(false)
    on.closed()
    const second = socket()
    on.connected(second, undefined, false)
    on.ping(false)
    vi.advanceTimersByTime(5_000)
    expect(first.close).not.toHaveBeenCalled()
    expect(second.close).toHaveBeenCalledExactlyOnceWith(4408, 'Pong timeout')
  })

  it('a ping after the socket closed (no socket) has nothing to close', async () => {
    const sock = socket()
    const on = await connected(sock)
    on.closed()
    on.ping(false)
    vi.advanceTimersByTime(10_000)
    expect(sock.close).not.toHaveBeenCalled()
  })
})
