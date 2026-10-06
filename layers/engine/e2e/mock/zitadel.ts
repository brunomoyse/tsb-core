import type { IncomingMessage, ServerResponse } from 'node:http'
import type { MockState } from './state.ts'

/*
 * The stand-in for Zitadel the web apps talk to (ZITADEL_AUTHORITY = `<mock>/zitadel`). Two ways to be signed in:
 *
 *  - a faked session seeded in localStorage (oidc.ts): nothing here is involved until the session has to be renewed;
 *  - the real round trip through the login page: authorize -> the app's own login page -> the OTP endpoints and
 *    `/auth/finalize` (auth.ts) -> the app's `/auth/callback?code=` -> the token endpoint below.
 *
 *   /.well-known/openid-configuration   discovery document, so oidc-client-ts can build redirects
 *   /oauth/v2/authorize                 an interactive request goes to the app's own login page with an authRequest id (as
 *                                       Zitadel Login V2 does); a silent one (prompt=none) is refused with login_required
 *   /oauth/v2/token                     authorization_code (the code `finalize` issued) and refresh_token grants; an unsigned
 *                                       id_token (oidc-client-ts reads the claims but never checks the signature).
 *                                       `scenario.rejectSession` makes the refresh grant fail with invalid_grant: the session
 *                                       is over, the app must send the customer back to the login page. Calls are logged as
 *                                       REST calls on `/zitadel/oauth/v2/token` with their `grant_type`.
 *   /oidc/v1/end_session                straight back to post_logout_redirect_uri
 *   /oauth/v2/keys                      empty key set
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
}

const b64url = (value: unknown): string => Buffer.from(JSON.stringify(value)).toString('base64url')

const readForm = (req: IncomingMessage): Promise<URLSearchParams> =>
  new Promise((resolve) => {
    let data = ''
    req.on('data', (chunk: Buffer) => {
      data += chunk.toString()
    })
    req.on('end', () => {
      resolve(new URLSearchParams(data))
    })
  })

/** An unsigned JWT with the claims oidc-client-ts validates (iss, aud, sub, exp, iat, nonce). */
function idToken(state: MockState, authority: string, nonce: string | null, clientId: string) {
  const now = Math.floor(Date.now() / 1000)
  const { user } = state
  return `${b64url({ alg: 'none', typ: 'JWT' })}.${b64url({
    iss: authority,
    aud: clientId,
    sub: user.id,
    iat: now,
    exp: now + 3600,
    ...(nonce ? { nonce } : {}),
    email: user.email,
    given_name: user.firstName,
    family_name: user.lastName,
  })}.mock`
}

/** Handles `/zitadel/*`; false when the path is not one of them. */
export async function handleZitadel(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  authority: string,
  state: MockState,
): Promise<boolean> {
  if (!url.pathname.startsWith('/zitadel/')) return false
  const path = url.pathname.slice('/zitadel'.length)
  const redirect = (location: string) => {
    res.writeHead(302, { Location: location })
    res.end()
  }
  const json = (body: unknown, status = 200) => {
    res.writeHead(status, {
      'Content-Type': 'application/json',
      ...CORS,
      'Cache-Control': 'no-store',
    })
    res.end(JSON.stringify(body))
  }

  if (path === '/.well-known/openid-configuration') {
    json({
      issuer: authority,
      authorization_endpoint: `${authority}/oauth/v2/authorize`,
      token_endpoint: `${authority}/oauth/v2/token`,
      end_session_endpoint: `${authority}/oidc/v1/end_session`,
      userinfo_endpoint: `${authority}/oidc/v1/userinfo`,
      jwks_uri: `${authority}/oauth/v2/keys`,
      response_types_supported: ['code'],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['RS256'],
      code_challenge_methods_supported: ['S256'],
    })
    return true
  }

  if (path === '/oauth/v2/keys') {
    json({ keys: [] })
    return true
  }

  if (path === '/oauth/v2/authorize') {
    const redirectUri = url.searchParams.get('redirect_uri') ?? ''
    const oidcState = url.searchParams.get('state') ?? ''
    if (url.searchParams.get('prompt') === 'none') {
      redirect(`${redirectUri}?error=login_required&state=${encodeURIComponent(oidcState)}`)
      return true
    }
    const locale = url.searchParams.get('ui_locales') ?? 'fr'
    const id = state.auth.startRequest(url.searchParams)
    redirect(`${new URL(redirectUri).origin}/${locale}/auth/login?authRequest=${id}`)
    return true
  }

  if (path === '/oauth/v2/token' && req.method === 'POST') {
    const form = await readForm(req)
    const clientId = form.get('client_id') ?? ''
    const { auth } = state
    // Logged with the REST calls (`MockControl.restCalls('/zitadel')`): which grant the app used, and how often.
    state.logRest({
      at: new Date().toISOString(),
      method: 'POST',
      path: '/zitadel/oauth/v2/token',
      body: { grant_type: form.get('grant_type') ?? '' },
      authenticated: false,
    })
    const issue = (nonce: string | null) => {
      const refresh = auth.next('refresh')
      auth.refreshTokens.add(refresh)
      json({
        access_token: auth.next('access'),
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'openid profile email offline_access',
        refresh_token: refresh,
        id_token: idToken(state, authority, nonce, clientId),
      })
    }

    if (form.get('grant_type') === 'authorization_code') {
      const code = form.get('code') ?? ''
      const request = auth.codes.get(code)
      // One shot, like the real code: a replay is invalid_grant.
      auth.codes.delete(code)
      if (!request || request.redirectUri !== form.get('redirect_uri')) {
        json({ error: 'invalid_grant', error_description: 'invalid or used code' }, 400)
        return true
      }
      issue(request.nonce)
      return true
    }
    if (form.get('grant_type') === 'refresh_token') {
      const refresh = form.get('refresh_token') ?? ''
      // The fake session of oidc.ts holds a refresh token the mock never issued: it is honoured, unless the session is
      // Scripted to be over. A real one is single use (Zitadel rotates).
      const known = auth.refreshTokens.delete(refresh) || refresh === 'e2e-refresh-token'
      if (state.scenario.rejectSession || !known) {
        json({ error: 'invalid_grant', error_description: 'refresh token revoked' }, 400)
        return true
      }
      issue(null)
      return true
    }
    json({ error: 'unsupported_grant_type' }, 400)
    return true
  }

  if (path === '/oidc/v1/end_session') {
    redirect(url.searchParams.get('post_logout_redirect_uri') ?? '/')
    return true
  }

  res.writeHead(404, { 'Content-Type': 'application/json', ...CORS })
  res.end(JSON.stringify({ error: 'mock zitadel: not implemented' }))
  return true
}
