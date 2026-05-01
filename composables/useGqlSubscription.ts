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

const recycleClient = () => {
    wsClient?.dispose()
    wsClient = null
    wsClientPromise = null
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
        return
    }
    /*
     * Only recycle after ≥3s in background — avoids thrashing on quick
     * tab switches but catches Safari mobile / Capacitor backgrounding
     * where the WS is silently killed.
     */
    if (document.visibilityState === 'visible' && Date.now() - hiddenAt > 3_000) {
        recycleClient()
    }
}

const ensureGlobalListeners = () => {
    if (globalListenersBound || !import.meta.client) return
    globalListenersBound = true
    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
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

            const client = createClient({
                url: cfg.public.graphqlWs as string,
                connectionParams: async () => {
                    const token = await getAccessToken()
                    return token ? { Authorization: `Bearer ${token}` } : {}
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
