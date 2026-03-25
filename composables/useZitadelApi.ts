import { useRuntimeConfig } from '#imports'

interface SessionResponse {
    sessionId: string
    sessionToken: string
}

interface FinalizeResponse {
    callbackUrl: string
}

interface IdpStartResponse {
    authUrl: string
}

/**
 * Calls tsb-service auth proxy endpoints which forward to Zitadel's Session API.
 * The proxy adds the service account PAT — the frontend never touches Zitadel directly.
 */
export function useZitadelApi() {
    const config = useRuntimeConfig()
    const apiUrl = config.public.api as string

    /** Create a session with email + password (login via proxy). */
    function createSession(loginName: string, password: string): Promise<SessionResponse> {
        return $fetch<SessionResponse>(`${apiUrl}/auth/session`, {
            method: 'POST',
            body: { loginName, password },
        })
    }

    /** Finalize the OIDC auth request after successful session creation (via proxy). */
    function finalizeOidcAuth(authRequestId: string, sessionId: string, sessionToken: string): Promise<FinalizeResponse> {
        return $fetch<FinalizeResponse>(`${apiUrl}/auth/finalize`, {
            method: 'POST',
            body: { authRequestId, sessionId, sessionToken },
        })
    }

    /** Start a social IdP login (Google, Facebook, Apple) via Zitadel IdP intent. */
    function startIdpLogin(provider: string, successUrl: string, failureUrl: string): Promise<IdpStartResponse> {
        return $fetch<IdpStartResponse>(`${apiUrl}/auth/idp/start`, {
            method: 'POST',
            body: { provider, successUrl, failureUrl },
        })
    }

    /** Create a session from a completed IdP intent. userId is optional (provided when user already exists in Zitadel). */
    function createIdpSession(idpIntentId: string, idpIntentToken: string, userId?: string): Promise<SessionResponse> {
        return $fetch<SessionResponse>(`${apiUrl}/auth/idp/session`, {
            method: 'POST',
            body: { idpIntentId, idpIntentToken, ...(userId && { userId }) },
        })
    }

    return {
        createSession,
        finalizeOidcAuth,
        startIdpLogin,
        createIdpSession,
    }
}
