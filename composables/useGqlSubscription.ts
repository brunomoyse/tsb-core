// composables/useGqlSubscription.ts
import { ref, onScopeDispose } from 'vue'
import { print } from 'graphql'
import { useNuxtApp, useRuntimeConfig } from '#imports'

/* lazy‑import because we only need it client‑side */
let wsClient: ReturnType<typeof import('graphql-ws')['createClient']> | null = null

export function useGqlSubscription<T = unknown>(
    rawSub: string | import('graphql').DocumentNode,
    variables: Record<string, unknown> = {},
) {
    const cfg  = useRuntimeConfig()
    const data = ref<T>()
    const error = ref<any>()

    if (process.client) {
        if (!wsClient) {
            const { createClient } = await import('graphql-ws')
            wsClient = createClient({
                url: cfg.public.graphqlWs,                 // e.g. wss://…/graphql
                connectionParams: {                       // forward cookies / token
                    Authorization: useCookie('access_token').value
                        ? `Bearer ${useCookie('access_token').value}`
                        : undefined,
                },
                retryAttempts: Infinity,
            })
        }

        const dispose = wsClient!.subscribe(
            {
                query: printIfAst(rawSub),
                variables,
            },
            {
                next: (val)   => (data.value = val.data as T),
                error: (err) => (error.value = err),
                complete: () => {},
            },
        )

        onScopeDispose(() => dispose())
    }

    /* on the server we simply expose empty refs */
    return { data, error }
}

function printIfAst(q: string | import('graphql').DocumentNode): string {
    return typeof q === 'string' ? q : print(q)
}
