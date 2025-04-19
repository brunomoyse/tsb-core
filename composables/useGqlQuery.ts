// composables/useGqlQuery.ts
import { watch } from 'vue'
import { hash } from 'ohash'
import { print } from 'graphql'
import { useAsyncData, useNuxtApp } from '#imports'
import type { AsyncData } from 'nuxt/app'

type Vars = Record<string, unknown> | (() => Record<string, unknown>)
interface Options {
    immediate?: boolean
    cache?: boolean
}

export async function useGqlQuery<T>(
    rawQuery: string | import('graphql').DocumentNode,
    variables: Vars = {},
    opts: Options = { immediate: true, cache: false },   // ⬅ default cache:false
): Promise<AsyncData<T, never> & { refetch: () => Promise<void> }> {
    const { $gqlFetch } = useNuxtApp()
    const getVars = () => (typeof variables === 'function' ? variables() : variables)
    const handler = () => $gqlFetch<T>(printIfAst(rawQuery), { variables: getVars() })

    // choose overload: with key (cache) or without key (no cache)
    const asyncData = opts.cache
        ? await useAsyncData<T, T>(`gql:${hash(printIfAst(rawQuery))}`, handler, {
            immediate: opts.immediate,
        })
        : await useAsyncData<T>(handler, { immediate: opts.immediate })

    if (typeof variables === 'function') {
        watch(
            () => variables(),
            () => asyncData.refresh({ dedupe: false }),
            { deep: true },
        )
    }

    return Object.assign(asyncData, { refetch: asyncData.refresh })
}

function printIfAst(q: string | import('graphql').DocumentNode): string {
    return typeof q === 'string' ? q : print(q)
}
