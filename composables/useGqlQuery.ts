// composables/useGqlQuery.ts
import { watch } from 'vue'
import { hash } from 'ohash'
import { print } from 'graphql'
import { useAsyncData, useNuxtApp } from '#imports'
import type { AsyncData } from 'nuxt/app'

type Vars = Record<string, unknown> | (() => Record<string, unknown>)

export async function useGqlQuery<T>(
    rawQuery: string | import('graphql').DocumentNode,
    variables: Vars = {},
    opts: { immediate?: boolean } = { immediate: true },
): Promise<
    AsyncData<T, any> & { refetch: () => Promise<void> }
> {
    const { $gqlFetch } = useNuxtApp()

    const getVars = () =>
        typeof variables === 'function' ? variables() : variables

    const key = `gql:${hash(printIfAst(rawQuery))}`

    /** run the query (SSR‑cached) */
    const asyncData = await useAsyncData<T, T>(
        key,
        () => $gqlFetch<T>(printIfAst(rawQuery), { variables: getVars() }),
        { immediate: opts.immediate },
    )

    /** watch reactive variables */
    if (typeof variables === 'function') {
        watch(
            () => variables(),
            () => asyncData.refresh({ dedupe: false }),
            { deep: true },
        )
    }

    return Object.assign(asyncData, { refetch: asyncData.refresh })
}

/* helper */
function printIfAst(q: string | import('graphql').DocumentNode): string {
    return typeof q === 'string' ? q : print(q)
}
