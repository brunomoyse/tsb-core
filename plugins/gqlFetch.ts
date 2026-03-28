// Plugins: gqlFetch.ts — OIDC Bearer token authentication via Zitadel
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
    const localePath = useLocalePath()

    /** Get access token from OIDC client (client-side only) */
    const getOidcToken = async (): Promise<string | null> => {
        if (import.meta.server) return null
        const { useOidc } = await import('~/composables/useOidc')
        const { getAccessToken } = useOidc()
        return getAccessToken()
    }

    /** Typed helper: POST /graphql with Bearer token */
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
            const unauth = res.errors.find(
                (e) => e.extensions?.code === 'UNAUTHENTICATED'
            )
            if (unauth) {
                const ok = await attemptRefreshOnce()
                if (ok) {
                    res = await doFetch(body, signal)
                    if (res.errors?.length) {
                        throw res.errors
                    }
                    return res.data as T
                }
            }
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
            credentials: 'omit',
            signal,
            headers: await buildHeaders(userLocale),
        })
    }

    /** Build the JSON headers + attach Bearer token or forward cookies for SSR */
    const buildHeaders = async (locale: string) => {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Accept-Language': locale,
        }
        if (import.meta.server) {
            // SSR: forward cookies if available (for Accept-Language, session context)
            const ev = useRequestEvent()
            const cook = ev?.node.req.headers.cookie
            if (cook) headers.cookie = cook
        } else {
            // Client-side: attach OIDC Bearer token
            const token = await getOidcToken()
            if (token) {
                headers.Authorization = `Bearer ${token}`
            }
        }
        return headers
    }

    /** Attempt OIDC silent renewal */
    const attemptRefresh = async (): Promise<boolean> => {
        try {
            if (import.meta.server) return false
            const { useOidc } = await import('~/composables/useOidc')
            const { silentRenew } = useOidc()
            const user = await silentRenew()
            return Boolean(user)
        } catch {
            navigateTo(`${localePath('auth-login')}?session=expired`)
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
