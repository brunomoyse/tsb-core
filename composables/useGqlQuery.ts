// Composables: useGqlQuery.ts
import { type DocumentNode, print } from 'graphql'
import { useAsyncData, useNuxtApp } from '#imports'
import type { AsyncData } from 'nuxt/app'
import { hash } from 'ohash'
import { watch } from 'vue'
import { useI18n } from 'vue-i18n'

type Vars = Record<string, unknown> | (() => Record<string, unknown>)
interface Options {
    immediate?: boolean
    cache?: boolean
    server?: boolean
    // When true, returns immediately without blocking on the initial fetch; callers rely on the returned `pending` ref to render a loading state.
    lazy?: boolean
}

export async function useGqlQuery<T>(
    rawQuery: string | DocumentNode,
    variables: Vars = {},
    opts: Options = { immediate: true, cache: false },
): Promise<AsyncData<T, never> & { refetch: () => Promise<void> }> {
    const { $gqlFetch } = useNuxtApp()
    const { locale } = useI18n()
    const getVars = () => (typeof variables === 'function' ? variables() : variables)
    const handler = () => $gqlFetch<T>(printIfAst(rawQuery), { variables: getVars() })

    // Scope the cache key on locale so SSR/cached payloads don't bleed across languages.
    const key = `gql:${hash(printIfAst(rawQuery))}:${locale.value}`

    const asyncData = await useAsyncData<T>(key, handler, {
        immediate: opts.immediate,
        ...(opts.lazy ? { lazy: true } : {}),
        ...(opts.server === false ? { server: false } : {}),
        ...(opts.cache ? {} : { getCachedData: () => undefined as unknown as T }),
    })

    if (typeof variables === 'function') {
        watch(
            () => variables(),
            () => asyncData.refresh({ dedupe: 'cancel' }),
            { deep: true },
        )
    }

    // Refetch when locale changes — covers layout-mounted queries that don't unmount on route change.
    watch(locale, (next, prev) => {
        if (next !== prev) asyncData.refresh({ dedupe: 'cancel' })
    })

    return Object.assign(asyncData, { refetch: asyncData.refresh }) as AsyncData<T, never> & { refetch: () => Promise<void> }
}

const printIfAst = (q: string | DocumentNode): string =>
    typeof q === 'string' ? q : print(q)
