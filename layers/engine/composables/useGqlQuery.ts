// Composables: useGqlQuery.ts
import type { AsyncData, NuxtApp } from 'nuxt/app'
import { type DocumentNode, print } from 'graphql'
import { useAsyncData, useNuxtApp } from '#imports'
import { hash } from 'ohash'
import { useI18n } from 'vue-i18n'
import { watch } from 'vue'

type Vars = Record<string, unknown> | (() => Record<string, unknown>)
interface Options {
    immediate?: boolean
    cache?: boolean
    server?: boolean
    // When true, returns immediately without blocking on the initial fetch; callers rely on the returned `pending` ref to render a loading state.
    lazy?: boolean
    /**
     * What a second caller of the same query does while the first is still in flight: 'cancel' (Nuxt's default) aborts it and
     * asks again, 'defer' joins it. Only for queries without variables (the key is the document, not its variables): the
     * layout and several components of one page ask for the same restaurantConfig, and the server answered it 2-3 times per render.
     */
    dedupe?: 'cancel' | 'defer'
}

/*
 * `cache: false` means "never serve a stale answer", NOT "throw away the server-rendered one" (audit PR 3.7, P3).
 * Nuxt's default `getCachedData` reads the SSR payload while the app hydrates; this one used to return undefined
 * always, so every query the server had already answered was fetched AGAIN by the browser right after hydration:
 * restaurantConfig twice per page load, and the data was empty in between (a closed banner that flashed in and
 * out, the home status pill and hours card falling back to their loading state: layout shifts).
 *
 * The payload is returned only for the very first run of the query, either while hydrating (the browser adopts what
 * the server rendered) or during the server render itself (a second component of the same request asking for the same
 * document reuses the first one's answer instead of calling the API again; the payload is per request, so nothing is
 * shared between visitors). Every later run (a refresh, a locale or variables change, a client-side navigation)
 * bypasses the cache and goes to the network.
 */
type GetCachedData<T> = (key: string, nuxtApp: NuxtApp, ctx: { cause: string }) => T | undefined
const freshExceptWhenHydrating = (key: string, nuxtApp: NuxtApp, ctx: { cause: string }): unknown =>
    ctx.cause === 'initial' && (nuxtApp.isHydrating || import.meta.server) ? nuxtApp.payload.data[key] : undefined

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
        ...(opts.dedupe ? { dedupe: opts.dedupe } : {}),
        ...(opts.server === false ? { server: false } : {}),
        ...(opts.cache ? {} : { getCachedData: freshExceptWhenHydrating as GetCachedData<T> }),
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
