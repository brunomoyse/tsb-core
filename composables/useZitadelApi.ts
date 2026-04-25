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

interface CreateUserParams {
    firstName: string
    lastName: string
    email: string
    phone?: string
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

    /** Step 2: verify the OTP code; returns a fresh sessionToken with otpEmail check fulfilled. */
    function verifyOtpLogin(sessionId: string, sessionToken: string, code: string): Promise<SessionResponse> {
        return $fetch<SessionResponse>(`${apiUrl}/auth/session/otp/verify`, {
            method: 'POST',
            body: { sessionId, sessionToken, code },
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

    /** Create a session from a completed IdP intent. userId is optional (provided when user already exists in Zitadel). */
    function createIdpSession(idpIntentId: string, idpIntentToken: string, userId?: string): Promise<SessionResponse> {
        return $fetch<SessionResponse>(`${apiUrl}/auth/idp/session`, {
            method: 'POST',
            body: { idpIntentId, idpIntentToken, ...(userId && { userId }) },
        })
    }

    /** Register a new user (creates Zitadel user, sends verification email via Scaleway). */
    function createUser(params: CreateUserParams): Promise<void> {
        return $fetch(`${apiUrl}/auth/register`, {
            method: 'POST',
            body: { ...params, lang: getLang() },
        })
    }

    /** Resend the verification email for an unverified account. */
    function resendVerification(email: string): Promise<void> {
        return $fetch(`${apiUrl}/auth/resend-verification`, {
            method: 'POST',
            body: { email, lang: getLang() },
        })
    }

    /** Verify a user's email address using the code from the verification email. */
    function verifyEmail(userId: string, code: string): Promise<void> {
        return $fetch(`${apiUrl}/auth/verify-email`, {
            method: 'POST',
            body: { userId, code },
        })
    }

    return {
        requestOtpLogin,
        verifyOtpLogin,
        resendOtpLogin,
        finalizeOidcAuth,
        startIdpLogin,
        createIdpSession,
        createUser,
        verifyEmail,
        resendVerification,
    }
}
