// Plugins: gqlFetch.ts — OIDC Bearer token authentication via Zitadel
import { type DocumentNode, print } from 'graphql'
import { GqlError, type GqlErrorEntry, isAbortError, operationNameOf } from '#engine/utils/gqlError'
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

interface GqlResponse {
    data?: unknown
    errors?: GqlErrorEntry[]
}

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

    /**
     * Typed helper: POST /graphql with Bearer token. Every failure is a `GqlError` (see
     * utils/gqlError.ts): the GraphQL `errors` of the response, or the failed HTTP request.
     */
    const gqlFetch = async <T = unknown>(
        query: string | DocumentNode,
        { variables = {}, signal }: GqlOptions = {},
    ): Promise<T> => {
        const queryText = typeof query === 'string' ? query : print(query)
        const operationName = operationNameOf(queryText)
        const body = { query: queryText, variables }
        // An aborted request is control flow, not a failure: it keeps its AbortError identity.
        const failure = (err: unknown): unknown => (isAbortError(err) ? err : GqlError.fromTransport(err, operationName))

        let res: GqlResponse

        // 1) Try the HTTP-level fetch (and 401→refresh→retry)
        try {
            res = await doFetch(body, signal)
        } catch (err: unknown) {
            if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 401) {
                const ok = await attemptRefresh()
                if (!ok) throw failure(err)
                try {
                    res = await doFetch(body, signal)
                } catch (retryErr: unknown) {
                    throw failure(retryErr)
                }
            } else {
                throw failure(err)
            }
        }

        // 2) Handle GraphQL-level errors
        if (res.errors?.length) {
            const unauth = res.errors.find(
                (e) => e.extensions?.code === 'UNAUTHENTICATED'
            )
            if (unauth) {
                const ok = await attemptRefresh()
                if (ok) {
                    try {
                        res = await doFetch(body, signal)
                    } catch (retryErr: unknown) {
                        throw failure(retryErr)
                    }
                    if (res.errors?.length) {
                        throw new GqlError(res.errors, { operationName })
                    }
                    return res.data as T
                }
            }
            throw new GqlError(res.errors, { operationName })
        }

        return res.data as T
    }

    /** Low-level POST that returns the raw { data, errors } */
    const doFetch = async (body: { query: string; variables: Record<string, unknown> }, signal?: AbortSignal): Promise<GqlResponse> => {
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

    /** Attempt OIDC silent renewal (coalesced inside useOidc). */
    const attemptRefresh = async (): Promise<boolean> => {
        try {
            if (import.meta.server) return false
            const { useOidc } = await import('~/composables/useOidc')
            const { silentRenew } = useOidc()
            const user = await silentRenew()
            return Boolean(user)
        } catch (err: unknown) {
            // Expected when the session is over (not reported): send the customer back to log in.
            if (import.meta.dev) console.warn('[gqlFetch] silent renew failed', err)
            navigateTo(`${localePath('auth-login')}?session=expired`)
            return false
        }
    }

    return { provide: { gqlFetch } }
})
