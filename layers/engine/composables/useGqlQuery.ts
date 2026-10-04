// Composables: useGqlQuery.ts
import type { AsyncData, NuxtApp } from 'nuxt/app'
import { useAsyncData, useNuxtApp } from '#imports'
import type { Ref } from 'vue'
import { gqlQueryKey } from '../utils/gqlQueryKey'
import { useI18n } from 'vue-i18n'

type Vars = Record<string, unknown> | (() => Record<string, unknown>)
interface Options {
  immediate?: boolean
  cache?: boolean
  server?: boolean
  // When true, returns immediately without blocking on the initial fetch; callers rely on the returned `pending` ref to render a loading state.
  lazy?: boolean
  /**
   * What a second caller of the same query does while the first is still in flight: 'cancel' (Nuxt's default) aborts it and
   * asks again, 'defer' joins it. Only for queries without variables (two callers with different variables are different
   * keys, so there is nothing to join): the layout and several components of one page ask for the same restaurantConfig, and the server answered it 2-3 times per render.
   */
  dedupe?: 'cancel' | 'defer'
  /**
   * An older document for a backend that does not know a field of the main one (a newer field added to a shared query).
   * The main document is asked first; when the error says the backend does not know it (`isUnsupported`), `unsupported`
   * is set (shared, so it is remembered for the whole app) and `query` is asked instead, now and on every later run.
   * The cache key stays the main document's. `variables` are what the legacy document is asked with (the main
   * document's by default): a document must not be sent a variable it does not declare, which a server rejects.
   */
  legacy?: {
    query: string
    variables?: Vars
    isUnsupported: (err: unknown) => boolean
    unsupported: Ref<boolean>
  }
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
const freshExceptWhenHydrating = (
  key: string,
  nuxtApp: NuxtApp,
  ctx: { cause: string },
): unknown =>
  ctx.cause === 'initial' && (nuxtApp.isHydrating || import.meta.server)
    ? nuxtApp.payload.data[key]
    : undefined

/*
 * What `await useGqlQuery()` gives. An `AsyncData` is itself thenable (it is the data object AND a promise of it), so
 * TypeScript's `await` flattens `Promise<AsyncData & { refetch }>` to the bare data object and the callers lose
 * `refetch`. The declared result must therefore be the awaited, non-thenable data object plus `refetch`.
 */
export type GqlQueryResult<T> = Awaited<AsyncData<T, never>> & { refetch: () => Promise<void> }

export async function useGqlQuery<T>(
  query: string,
  variables: Vars = {},
  opts: Options = { immediate: true, cache: false },
): Promise<GqlQueryResult<T>> {
  const { $gqlFetch } = useNuxtApp()
  const { locale } = useI18n()
  const evaluate = (vars: Vars) => (typeof vars === 'function' ? vars() : vars)
  const getVars = () => evaluate(variables)
  const ask = (document: string, vars: Vars = variables) =>
    $gqlFetch<T>(document, { variables: evaluate(vars) })
  const { legacy } = opts
  const handler = async (): Promise<T> => {
    if (!legacy) return ask(query)
    if (!legacy.unsupported.value) {
      try {
        return await ask(query)
      } catch (err) {
        if (!legacy.isUnsupported(err)) throw err
        legacy.unsupported.value = true
      }
    }
    return ask(legacy.query, legacy.variables ?? variables)
  }

  /*
   * The key is the document, the evaluated variables and the locale (audit R3), and it is a getter: Nuxt 4 watches a
   * reactive key and, when it changes (variables from a getter, or the language), starts the query under the new key
   * (keeping the previous data on screen until the answer arrives). That replaces the two watchers that used to
   * `refresh()` one shared slot, and it keeps a slow answer for the old variables from landing on the new ones.
   * Locale in the key also stops SSR/cached payloads bleeding across languages.
   */
  const key = () => gqlQueryKey(query, getVars(), locale.value)

  const asyncData = await useAsyncData<T>(key, handler, {
    immediate: opts.immediate,
    ...(opts.lazy ? { lazy: true } : {}),
    ...(opts.dedupe ? { dedupe: opts.dedupe } : {}),
    ...(opts.server === false ? { server: false } : {}),
    ...(opts.cache ? {} : { getCachedData: freshExceptWhenHydrating as GetCachedData<T> }),
  })

  return Object.assign(asyncData, { refetch: asyncData.refresh }) as unknown as GqlQueryResult<T>
}
