// Composables: useGqlQuery.ts
import { type DocumentNode, print } from 'graphql'
import { useAsyncData, useNuxtApp } from '#imports'
import type { AsyncData } from 'nuxt/app'
import { hash } from 'ohash'
import { watch } from 'vue'

type Vars = Record<string, unknown> | (() => Record<string, unknown>)
interface Options {
    immediate?: boolean
    cache?: boolean
}

export async function useGqlQuery<T>(
    rawQuery: string | DocumentNode,
    variables: Vars = {},
    opts: Options = { immediate: true, cache: false },
): Promise<AsyncData<T, never> & { refetch: () => Promise<void> }> {
    const { $gqlFetch } = useNuxtApp()
    const getVars = () => (typeof variables === 'function' ? variables() : variables)
    const handler = () => $gqlFetch<T>(printIfAst(rawQuery), { variables: getVars() })

    const key = `gql:${hash(printIfAst(rawQuery))}`

    const asyncData = await useAsyncData<T>(key, handler, {
        immediate: opts.immediate,
        ...(opts.cache ? {} : { getCachedData: () => undefined as unknown as T }),
    })

    if (typeof variables === 'function') {
        watch(
            () => variables(),
            () => asyncData.refresh({ dedupe: 'cancel' }),
            { deep: true },
        )
    }

    return Object.assign(asyncData, { refetch: asyncData.refresh }) as AsyncData<T, never> & { refetch: () => Promise<void> }
}

const printIfAst = (q: string | DocumentNode): string =>
    typeof q === 'string' ? q : print(q)
