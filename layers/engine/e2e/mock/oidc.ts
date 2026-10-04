/*
 * A signed-in session without Zitadel. oidc-client-ts (composables/useOidc.ts) keeps the user in localStorage under
 * `oidc.user:<authority>:<client_id>`; an unexpired entry there is all `isAuthenticated()` needs. The mock API accepts
 * any bearer token, so the token values are placeholders. Build-time env of the app under test must use the same
 * authority and client id (see playwright.mock.config / mock/config.ts).
 */
export interface FakeSession {
  authority: string
  clientId: string
  email?: string
  firstName?: string
  lastName?: string
  /** Seconds the session stays valid for. Default one day; a negative number gives an expired session. */
  expiresInSeconds?: number
}

/** The localStorage entry `[key, value]` for a session. */
export function fakeOidcEntry(session: FakeSession): [string, string] {
  const now = Math.floor(Date.now() / 1000)
  const expiresAt = now + (session.expiresInSeconds ?? 86_400)
  const user = {
    id_token: 'e2e.id.token',
    session_state: null,
    access_token: 'e2e-access-token',
    refresh_token: 'e2e-refresh-token',
    token_type: 'Bearer',
    scope: 'openid profile email offline_access',
    profile: {
      sub: '00000000-0000-4000-8000-00000000e2e0',
      iss: session.authority,
      aud: session.clientId,
      exp: expiresAt,
      iat: now,
      email: session.email ?? 'e2e@example.test',
      given_name: session.firstName ?? 'Eva',
      family_name: session.lastName ?? 'Mock',
    },
    expires_at: expiresAt,
  }
  return [`oidc.user:${session.authority}:${session.clientId}`, JSON.stringify(user)]
}
