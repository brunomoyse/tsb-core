// Composables: useGqlSubscription.ts
import { type DocumentNode, print } from 'graphql'
import { onScopeDispose, ref } from 'vue'
import type { Client } from 'graphql-ws'
import { useRuntimeConfig } from '#imports'



let wsClient: Client | null = null

export function useGqlSubscription<T = unknown>(
    rawSub: string | DocumentNode,
    variables: Record<string, unknown> = {}
) {
    const cfg   = useRuntimeConfig()
    const data  = ref<T>()
    const error = ref<unknown>(null)

    // Placeholder for the unsubscribe function
    let stop: () => void = () => {}
    // Placeholder for the full-close function
    let close: () => void = () => {}

    // Always register cleanup _in_ the setup scope
    onScopeDispose(() => {
        stop()               // Unsubscribe
        wsClient?.dispose()  // Tear down the socket
        wsClient = null
    })

    if (import.meta.client) {
        ;(async () => {
            try {
                if (!wsClient) {
                    const { createClient } = await import('graphql-ws')
                    wsClient = createClient({
                        url: cfg.public.graphqlWs as string,
                        retryAttempts: Infinity,
                    })
                }

                // Start subscription & capture the unsubscribe handle
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

                // Expose a full-close that calls both stop() and dispose()
                close = () => {
                    stop()
                    wsClient?.dispose()
                    wsClient = null
                }
            } catch (e: unknown) {
                error.value = e
            }
        })()
    }

    return { data, error, stop, close }
}
