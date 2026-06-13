import { useRuntimeConfig } from '#imports'

interface SessionResponse {
    sessionId: string
    sessionToken: string
}

interface VerifyOtpResponse extends SessionResponse {
    /** True when the OTP request created a placeholder Zitadel user — the
     *  frontend must capture first/last name before /auth/finalize. */
    requiresProfile: boolean
}

interface IdpSessionResponse extends SessionResponse {
    /** True when the IdP returned no name (e.g. Apple only sends it on the
     *  first-ever authorization) and a placeholder Zitadel user was created —
     *  the frontend must capture first/last name before /auth/finalize. */
    requiresProfile: boolean
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

    /** Detect current locale from URL path (safe outside Vue setup context). */
    function getLang(): string {
        if (typeof window !== 'undefined') {
            return window.location.pathname.split('/')[1] || 'fr'
        }
        return 'fr'
    }

    /** Step 1: request an OTP — creates a Zitadel session and emails a 6-digit code. */
    function requestOtpLogin(loginName: string): Promise<SessionResponse> {
        return $fetch<SessionResponse>(`${apiUrl}/auth/session/otp/request`, {
            method: 'POST',
            body: { loginName, lang: getLang() },
        })
    }

    /** Step 2: verify the OTP code; returns a fresh sessionToken with otpEmail check fulfilled.
     *  When requiresProfile is true the user is a fresh placeholder created during request — the
     *  frontend must call completeOtpProfile before /auth/finalize. */
    function verifyOtpLogin(sessionId: string, sessionToken: string, code: string): Promise<VerifyOtpResponse> {
        return $fetch<VerifyOtpResponse>(`${apiUrl}/auth/session/otp/verify`, {
            method: 'POST',
            body: { sessionId, sessionToken, code },
        })
    }

    /** Step 2b (Pattern B identifier-first signup): fill in first/last name on a fresh
     *  placeholder account. Only called when verifyOtpLogin returned requiresProfile: true. */
    function completeOtpProfile(params: { sessionId: string; sessionToken: string; firstName: string; lastName: string }): Promise<{ success: true }> {
        return $fetch<{ success: true }>(`${apiUrl}/auth/session/otp/complete-profile`, {
            method: 'POST',
            body: params,
        })
    }

    /** Re-issue a fresh OTP code for an existing pending session. */
    function resendOtpLogin(sessionId: string, sessionToken: string): Promise<{ success: true }> {
        return $fetch<{ success: true }>(`${apiUrl}/auth/session/otp/resend`, {
            method: 'POST',
            body: { sessionId, sessionToken, lang: getLang() },
        })
    }

    /** Finalize the OIDC auth request after successful session creation (via proxy). */
    function finalizeOidcAuth(authRequestId: string, sessionId: string, sessionToken: string): Promise<FinalizeResponse> {
        return $fetch<FinalizeResponse>(`${apiUrl}/auth/finalize`, {
            method: 'POST',
            body: { authRequestId, sessionId, sessionToken },
        })
    }

    /** Start a social IdP login (Google, Apple) via Zitadel IdP intent. */
    function startIdpLogin(provider: string, successUrl: string, failureUrl: string): Promise<IdpStartResponse> {
        return $fetch<IdpStartResponse>(`${apiUrl}/auth/idp/start`, {
            method: 'POST',
            body: { provider, successUrl, failureUrl },
        })
    }

    /** Create a session from a completed IdP intent. userId is optional (provided when user already exists in Zitadel).
     *  When requiresProfile is true the IdP omitted the name and a placeholder account was created — the
     *  frontend must call completeOtpProfile before /auth/finalize (same as the OTP flow). */
    function createIdpSession(idpIntentId: string, idpIntentToken: string, userId?: string): Promise<IdpSessionResponse> {
        return $fetch<IdpSessionResponse>(`${apiUrl}/auth/idp/session`, {
            method: 'POST',
            body: { idpIntentId, idpIntentToken, ...(userId && { userId }) },
        })
    }

    return {
        requestOtpLogin,
        verifyOtpLogin,
        completeOtpProfile,
        resendOtpLogin,
        finalizeOidcAuth,
        startIdpLogin,
        createIdpSession,
    }
}
