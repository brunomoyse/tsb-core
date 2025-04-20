// plugins/gqlFetch.ts
import {
    defineNuxtPlugin,
    useRuntimeConfig,
    useCookie,
    useRequestEvent,
    navigateTo,
} from '#imports'
import { print } from 'graphql'

interface GqlOptions {
    variables?: Record<string, unknown>
    signal?: AbortSignal
}

export default defineNuxtPlugin(() => {
    const cfg     = useRuntimeConfig()
    const httpURL = cfg.public.graphqlHttp as string
    const apiURL  = cfg.public.api as string

    /** Typed helper: POST /graphql with cookies + headers */
    async function gqlFetch<T = unknown>(
        query: string | import('graphql').DocumentNode,
        { variables = {}, signal }: GqlOptions = {},
    ): Promise<T> {
        const body = {
            query: typeof query === 'string' ? query : print(query),
            variables,
        }

        let res: any

        // 1) Try the HTTP-level fetch (and 401→refresh→retry)
        try {
            res = await doFetch(body, signal)
        } catch (err: any) {
            if (err?.status === 401) {
                const ok = await attemptRefresh()
                if (ok) {
                    res = await doFetch(body, signal)
                } else {
                    throw err
                }
            } else {
                throw err
            }
        }

        // 2) Handle GraphQL-level errors
        if (res.errors?.length) {
            // look for your UNAUTHENTICATED extension code
            const unauth = (res.errors as any[]).find(
                (e) => e.extensions?.code === 'UNAUTHENTICATED'
            )
            if (unauth) {
                // refresh the token and retry once
                const ok = await attemptRefresh()
                if (ok) {
                    res = await doFetch(body, signal)
                    if (res.errors?.length) {
                        throw res.errors
                    }
                    return res.data as T
                }
            }
            // otherwise bubble up all GraphQL errors
            throw res.errors
        }

        return res.data as T
    }

    /** low‑level POST that returns the raw { data, errors } */
    async function doFetch(body: any, signal?: AbortSignal) {
        const userLocale = useCookie('i18n_redirected').value ?? 'fr'
        return await $fetch.raw(httpURL, {
            method: 'POST',
            body,
            credentials: 'include',
            signal,
            headers: buildHeaders(userLocale),
        }).then((r) => r._data)
    }

    /** build the JSON headers + forward cookies SSR */
    function buildHeaders(locale: string) {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Accept-Language': locale,
        }
        if (import.meta.server) {
            const ev = useRequestEvent()
            const cook = ev?.node.req.headers.cookie
            if (cook) headers.cookie = cook
        }
        return headers
    }

    /** attempt a refresh via your REST endpoint */
    async function attemptRefresh(): Promise<boolean> {
        try {
            await $fetch(`${apiURL}/tokens/refresh`, {
                method: 'POST',
                credentials: 'include',
            })
            return true
        } catch {
            // refresh failed → revoke & redirect to login
            await $fetch(`${apiURL}/tokens/revoke`, { credentials: 'include' })
            navigateTo('/login')
            return false
        }
    }

    return { provide: { gqlFetch } }
})
