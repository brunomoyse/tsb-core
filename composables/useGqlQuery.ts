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

    // Choose overload: with key (cache) or without key (no cache)
    const asyncData = opts.cache
        ? await useAsyncData<T, T>(`gql:${hash(printIfAst(rawQuery))}`, handler, {
            immediate: opts.immediate,
        })
        : await useAsyncData<T>(handler, { immediate: opts.immediate })

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
