// Composables/useGqlSubscription.ts
import { type DocumentNode, print } from 'graphql'
import { onScopeDispose, ref } from 'vue'
import type { Client } from 'graphql-ws'
import { useRuntimeConfig } from '#imports'

let wsClient: Client | null = null
let wsClientPromise: Promise<Client> | null = null

/*
 * Subscribers register here so global lifecycle events (visibility,
 * online/offline) are handled exactly once across the whole app. With
 * multiple parallel subscriptions on a single page (e.g. /me/orders
 * subscribing per active order), per-subscription listeners would race —
 * each handler would dispose the client another handler had just created,
 * preventing the connection from ever stabilizing on Safari mobile where
 * the OS aggressively backgrounds tabs and severs the WebSocket.
 */
interface Subscriber {
    restart: () => void
    setOffline: (value: boolean) => void
}
const subscribers = new Set<Subscriber>()

let globalListenersBound = false
let hiddenAt = 0
let wentOffline = false
let suspendTimer: ReturnType<typeof setTimeout> | null = null
let proactivelyDisposed = false

/*
 * Tear down the client without notifying subscribers to restart. Used when
 * the page is unloading or the WebView is about to be suspended by the OS —
 * sends a clean WS close frame so the server cancels in-flight resolvers
 * without the lib/pq "canceling statement due to user request" noise that
 * arises from a timeout-based close. Subscribers keep their `stop` handles
 * pointing at the disposed client (no-ops); they will reconnect on the next
 * recycleClient() call (e.g. on resume).
 */
const disposeClient = () => {
    wsClient?.dispose()
    wsClient = null
    wsClientPromise = null
}

const recycleClient = () => {
    disposeClient()
    // Snapshot in case a restart callback mutates the set.
    Array.from(subscribers).forEach((s) => s.restart())
}

const handleOffline = () => {
    wentOffline = true
    subscribers.forEach((s) => s.setOffline(true))
}

const handleOnline = () => {
    if (!wentOffline) return
    wentOffline = false
    subscribers.forEach((s) => s.setOffline(false))
    recycleClient()
}

const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now()
        /*
         * After a short grace, proactively close the WS so the server sees
         * a clean close frame before iOS suspends our WebView. The grace
         * window avoids thrashing on quick tab switches.
         */
        if (suspendTimer) clearTimeout(suspendTimer)
        suspendTimer = setTimeout(() => {
            suspendTimer = null
            proactivelyDisposed = true
            disposeClient()
        }, 2_000)
        return
    }
    if (suspendTimer) {
        clearTimeout(suspendTimer)
        suspendTimer = null
    }
    if (document.visibilityState === 'visible') {
        /*
         * Recycle if we proactively closed the WS while hidden, OR if we
         * stayed hidden ≥3s (likely the OS killed the socket silently).
         */
        if (proactivelyDisposed || Date.now() - hiddenAt > 3_000) {
            proactivelyDisposed = false
            recycleClient()
        }
    }
}

const handlePageHide = () => {
    if (suspendTimer) {
        clearTimeout(suspendTimer)
        suspendTimer = null
    }
    disposeClient()
}

const handlePageShow = (e: PageTransitionEvent) => {
    // Restored from bfcache — visibilitychange may not fire, so recycle here.
    if (e.persisted) recycleClient()
}

const ensureGlobalListeners = () => {
    if (globalListenersBound || !import.meta.client) return
    globalListenersBound = true
    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    window.addEventListener('pagehide', handlePageHide)
    window.addEventListener('pageshow', handlePageShow)
    document.addEventListener('visibilitychange', handleVisibilityChange)
}

const getWsClient = (): Promise<Client> => {
    if (wsClient) return Promise.resolve(wsClient)
    if (!wsClientPromise) {
        wsClientPromise = Promise.all([
            import('graphql-ws'),
            import('~/composables/useOidc'),
        ]).then(([{ createClient }, { useOidc }]) => {
            const cfg = useRuntimeConfig()
            const { getAccessToken } = useOidc()

            /*
             * Track the underlying WebSocket so the ping/pong timeout
             * handler can force-close on silent drops. `keepAlive` only
             * schedules pings — detection requires our own pong timer.
             */
            let activeSocket: WebSocket | null = null
            let pongTimer: ReturnType<typeof setTimeout> | null = null

            const client = createClient({
                url: cfg.public.graphqlWs as string,
                connectionParams: async () => {
                    const token = await getAccessToken()
                    return token ? { Authorization: `Bearer ${token}` } : {}
                },
                /*
                 * Ping every 12s. Combined with the pong watchdog below,
                 * detects silent drops (cellular handoff, Cloudflare Tunnel
                 * idle timeout) within ~17s instead of waiting for the next
                 * outbound message.
                 */
                keepAlive: 12_000,
                on: {
                    connected: (socket) => { activeSocket = socket as WebSocket },
                    closed: () => {
                        if (pongTimer) { clearTimeout(pongTimer); pongTimer = null }
                        activeSocket = null
                    },
                    ping: (received) => {
                        // We sent a ping; arm a 5s watchdog for the pong.
                        if (received) return
                        if (pongTimer) clearTimeout(pongTimer)
                        pongTimer = setTimeout(() => {
                            if (activeSocket?.readyState === WebSocket.OPEN) {
                                activeSocket.close(4408, 'Pong timeout')
                            }
                        }, 5_000)
                    },
                    pong: (received) => {
                        if (received && pongTimer) {
                            clearTimeout(pongTimer)
                            pongTimer = null
                        }
                    },
                },
                retryAttempts: Infinity,
                retryWait: async (retries) => {
                    const delay = Math.min(1000 * 2 ** retries, 30_000)
                    await new Promise<void>(resolve => { setTimeout(resolve, delay) })
                    // If no valid token after refresh attempt, stop retrying
                    const token = await getAccessToken()
                    if (!token) await new Promise<void>(() => {})
                },
            })
            wsClient = client
            return client
        })
    }
    return wsClientPromise
}

export function useGqlSubscription<T = unknown>(
    rawSub: string | DocumentNode,
    variables: Record<string, unknown> = {}
) {
    const data  = ref<T>()
    const error = ref<Error | null>(null)
    let stop: () => void = () => {}
    let disposed = false

    const startSubscription = () => {
        if (disposed) return
        getWsClient()
            .then((client) => {
                if (disposed) return
                stop = client.subscribe(
                    {
                        query: typeof rawSub === 'string' ? rawSub : print(rawSub),
                        variables,
                    },
                    {
                        next: (msg) => {
                            if (msg.data !== undefined) data.value = msg.data as T
                        },
                        error: (e) => {
                            error.value = e instanceof Error ? e : new Error(String(e))
                        },
                        complete: () => {},
                    }
                )
            })
            .catch((e) => {
                if (!disposed) error.value = e instanceof Error ? e : new Error(String(e))
            })
    }

    const subscriber: Subscriber = {
        restart: () => {
            /*
             * Shared client was just torn down — the previous stop() targets
             * a disposed client, so drop it and resubscribe against the next
             * client created on demand.
             */
            stop = () => {}
            error.value = null
            startSubscription()
        },
        setOffline: (value) => {
            error.value = value ? new Error('Lost internet connection') : null
        },
    }

    if (import.meta.client) {
        ensureGlobalListeners()
        subscribers.add(subscriber)
        startSubscription()
    }

    const cleanup = () => {
        if (disposed) return
        disposed = true
        subscribers.delete(subscriber)
        stop()
    }

    onScopeDispose(cleanup)

    return {
        data,
        error,
        stop: cleanup,
        /*
         * Retained for backward compatibility — global lifecycle is now
         * handled internally, so this only tears down the local subscription.
         */
        closeAll: cleanup,
    }
}
