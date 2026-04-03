// Composables/useGqlSubscription.ts
import { type DocumentNode, print } from 'graphql'
import { onScopeDispose, ref } from 'vue'
import type { Client } from 'graphql-ws'
import { useRuntimeConfig } from '#imports'

let wsClient: Client | null = null
let wsClientPromise: Promise<Client> | null = null

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
                    if (!token) throw new Error('No valid auth token')
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

    // Track if we've genuinely gone offline
    let wentOffline = false

    const startSubscription = () => {
        getWsClient()
            .then((client) => {
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
                error.value = e instanceof Error ? e : new Error(String(e))
            })
    }

    const handleOffline = () => {
        wentOffline = true
        error.value = new Error('Lost internet connection')
    }

    const handleOnline = () => {
        if (!wentOffline) return
        wentOffline = false
        error.value = null
        // Re-establish subscription (graphql-ws auto-reconnects the WebSocket)
        stop()
        startSubscription()
    }

    // On iOS (Capacitor), backgrounding kills the WebSocket but doesn't fire
    // Offline/online events. Restart subscription when the app returns to foreground.
    let hiddenAt = 0
    const handleVisibilityChange = () => {
        if (document.visibilityState === 'hidden') {
            hiddenAt = Date.now()
            return
        }
        // Only reset after ≥3s in background (avoids thrashing on quick tab switches)
        if (document.visibilityState === 'visible' && Date.now() - hiddenAt > 3_000) {
            // Dispose the shared WS client — the connection is likely dead
            wsClient?.dispose()
            wsClient = null
            wsClientPromise = null
            error.value = null
            stop()
            startSubscription()
        }
    }

    if (import.meta.client) {
        startSubscription()

        window.addEventListener('offline', handleOffline)
        window.addEventListener('online', handleOnline)
        document.addEventListener('visibilitychange', handleVisibilityChange)
    }

    onScopeDispose(() => {
        stop()
        if (import.meta.client) {
            window.removeEventListener('offline', handleOffline)
            window.removeEventListener('online', handleOnline)
            document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
    })

    const closeAll = () => {
        wsClient?.dispose()
        wsClient = null
        wsClientPromise = null
    }

    return { data, error, stop, closeAll }
}
