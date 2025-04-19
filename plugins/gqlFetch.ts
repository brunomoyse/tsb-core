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
    const cfg = useRuntimeConfig()
    const httpURL: string = cfg.public.graphqlHttp as string
    const apiURL: string  = cfg.public.api as string

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
        try {
            res = await doFetch(body, signal)
        } catch (err: any) {
            // first failure could be 401 – attempt 1 refresh & retry
            if (err?.status === 401) {
                const refreshed = await attemptRefresh(apiURL)
                if (refreshed) res = await doFetch(body, signal)
                else throw err
            } else throw err
        }

        if (res.errors?.length) throw res.errors
        return res.data as T
    }

    async function doFetch(body: any, signal?: AbortSignal) {
        const userLocale = useCookie('i18n_redirected').value ?? 'fr'
        return await $fetch.raw(httpURL, {
            method: 'POST',
            body,
            credentials: 'include',
            signal,
            headers: buildHeaders(userLocale),
        }).then(r => r._data)
    }

    function buildHeaders(locale: string) {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Accept-Language': locale,
        }

        /* Forward cookies during SSR so the access‑token cookie is seen */
        if (import.meta.server) {
            const ev = useRequestEvent()
            if (ev?.node.req.headers.cookie)
                headers.cookie = ev.node.req.headers.cookie
        }
        return headers
    }

    async function attemptRefresh(apiURL: string) {
        try {
            await $fetch(`${apiURL}/tokens/refresh`, {
                method: 'POST',
                credentials: 'include',
            })
            return true
        } catch {
            await $fetch(`${apiURL}/tokens/revoke`, { credentials: 'include' })
            navigateTo('/login')
            return false
        }
    }

    return { provide: { gqlFetch } }
})
