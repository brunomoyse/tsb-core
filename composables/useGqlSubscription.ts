// composables/useGqlSubscription.ts
import { ref, onScopeDispose } from 'vue'
import { print } from 'graphql'
import { useRuntimeConfig, useCookie } from '#imports'
import type { Client } from 'graphql-ws'

let wsClient: Client | null = null

export function useGqlSubscription<T = any>(
    rawSub: string | import('graphql').DocumentNode,
    variables: Record<string, unknown> = {}
) {
    const cfg   = useRuntimeConfig()
    const data  = ref<T>()
    const error = ref<any>(null)

    // placeholder for the unsubscribe function
    let stop: () => void = () => {}
    // placeholder for the full-close function
    let close: () => void = () => {}

    // always register cleanup _in_ the setup scope
    onScopeDispose(() => {
        stop()               // unsubscribe
        wsClient?.dispose()  // tear down the socket
        wsClient = null
    })

    if (import.meta.client) {
        ;(async () => {
            try {
                if (!wsClient) {
                    const { createClient } = await import('graphql-ws')
                    wsClient = createClient({
                        url: cfg.public.graphqlWs as string,
                        connectionParams: {
                            Authorization: useCookie('access_token').value
                                ? `Bearer ${useCookie('access_token').value}`
                                : undefined,
                        },
                        retryAttempts: Infinity,
                    })
                }

                // start subscription & capture the unsubscribe handle
                stop = wsClient.subscribe(
                    {
                        query: typeof rawSub === 'string' ? rawSub : print(rawSub),
                        variables,
                    },
                    {
                        next: (msg) => msg.data && (data.value = msg.data as T),
                        error: (e) => (error.value = e),
                        complete: () => {},
                    }
                )

                // expose a full-close that calls both stop() and dispose()
                close = () => {
                    stop()
                    wsClient?.dispose()
                    wsClient = null
                }
            } catch (e: any) {
                error.value = e
            }
        })()
    }

    return { data, error, stop, close }
}
