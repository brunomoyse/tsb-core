// composables/useGqlSubscription.ts
import { ref, onScopeDispose } from 'vue'
import { print } from 'graphql'
import { useRuntimeConfig, useCookie } from '#imports'

let wsClient:
    | ReturnType<typeof import('graphql-ws')['createClient']>
    | null = null

export function useGqlSubscription<T = any>(
    rawSub: string | import('graphql').DocumentNode,
    variables: Record<string, unknown> = {}
) {
    const cfg   = useRuntimeConfig()
    const data  = ref<T>()
    const error = ref<any>(null)

    if (import.meta.client) {
        ;(async () => {
            try {
                // 1) lazy create the client once
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

                // 2) subscribe
                const dispose = wsClient.subscribe(
                    {
                        query: typeof rawSub === 'string' ? rawSub : print(rawSub),
                        variables,
                    },
                    {
                        next: (msg) => {
                            if (msg.data) data.value = msg.data as T
                        },
                        error: (e) => {
                            error.value = e
                        },
                        complete: () => {
                            /* no‑op */
                        },
                    }
                )

                // 3) cleanup on unmount
                onScopeDispose(() => {
                    dispose()
                })
            } catch (e: any) {
                // catch dynamic‐import or subscribe errors
                error.value = e
                // you can also console.error(e) if you like
            }
        })()
    }

    return { data, error }
}
