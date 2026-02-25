// Plugins: gqlFetch.ts
import { type DocumentNode, print } from 'graphql'
import {
    defineNuxtPlugin,
    navigateTo,
    useCookie,
    useLocalePath,
    useRequestEvent,
    useRuntimeConfig,
} from '#imports'

interface GqlOptions {
    variables?: Record<string, unknown>
    signal?: AbortSignal
}

let refreshPromise: Promise<boolean> | null = null

export default defineNuxtPlugin(() => {
    const cfg     = useRuntimeConfig()
    const httpURL = cfg.public.graphqlHttp as string
    const apiURL  = cfg.public.api as string
    const localePath = useLocalePath()

    /** Typed helper: POST /graphql with cookies + headers */
    const gqlFetch = async <T = unknown>(
        query: string | DocumentNode,
        { variables = {}, signal }: GqlOptions = {},
    ): Promise<T> => {
        const body = {
            query: typeof query === 'string' ? query : print(query),
            variables,
        }

        let res: { data?: unknown; errors?: { extensions?: { code?: string }; message?: string }[] }

        // 1) Try the HTTP-level fetch (and 401→refresh→retry)
        try {
            res = await doFetch(body, signal)
        } catch (err: unknown) {
            if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 401) {
                const ok = await attemptRefreshOnce()
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
            // Look for your UNAUTHENTICATED extension code
            const unauth = res.errors.find(
                (e) => e.extensions?.code === 'UNAUTHENTICATED'
            )
            if (unauth) {
                // Refresh the token and retry once
                const ok = await attemptRefreshOnce()
                if (ok) {
                    res = await doFetch(body, signal)
                    if (res.errors?.length) {
                        throw res.errors
                    }
                    return res.data as T
                }
            }
            // Otherwise bubble up all GraphQL errors
            throw res.errors
        }

        return res.data as T
    }

    /** Low-level POST that returns the raw { data, errors } */
    const doFetch = async (body: { query: string; variables: Record<string, unknown> }, signal?: AbortSignal): Promise<{ data?: unknown; errors?: { extensions?: { code?: string }; message?: string }[] }> => {
        const userLocale = useCookie('i18n_redirected').value ?? 'fr'
        return await $fetch(httpURL, {
            method: 'POST',
            body,
            credentials: 'include',
            signal,
            headers: buildHeaders(userLocale),
        })
    }

    /** Build the JSON headers + forward cookies SSR */
    const buildHeaders = (locale: string) => {
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

    /** Attempt a refresh via your REST endpoint */
    const attemptRefresh = async (): Promise<boolean> => {
        try {
            await $fetch(`${apiURL}/tokens/refresh`, {
                method: 'POST',
                credentials: 'include',
            })
            return true
        } catch {
            // Refresh failed → logout & redirect to login
            try {
                await $fetch(`${apiURL}/logout`, {
                    method: 'POST',
                    credentials: 'include'
                })
            } catch { /* Ignore logout errors */ }
            navigateTo(localePath('login'))
            return false
        }
    }

    /** Coalesce concurrent refresh calls into a single request */
    const attemptRefreshOnce = (): Promise<boolean> => {
        refreshPromise ??= attemptRefresh().finally(() => {
            refreshPromise = null
        })
        return refreshPromise
    }

    return { provide: { gqlFetch } }
})
