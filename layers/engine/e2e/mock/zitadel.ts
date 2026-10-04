import type { ServerResponse } from 'node:http'

/*
 * The smallest stand-in for Zitadel the web apps can talk to (ZITADEL_AUTHORITY = `<mock>/zitadel`). Sessions are faked
 * in localStorage (oidc.ts), so this only answers what the app asks when it has NO session or ends one:
 *
 *   /.well-known/openid-configuration   discovery document, so oidc-client-ts can build redirects
 *   /oauth/v2/authorize                 an interactive request goes to the app's own login page with an authRequest id (as
 *                                       Zitadel Login V2 does); a silent one (prompt=none) is refused with login_required
 *   /oidc/v1/end_session                straight back to post_logout_redirect_uri
 *   /oauth/v2/keys                      empty key set
 *
 * There is no token endpoint: the OTP login ends at a code exchange, which this does not fake yet (see README).
 */
export function handleZitadel(res: ServerResponse, url: URL, authority: string): boolean {
  if (!url.pathname.startsWith('/zitadel/')) return false
  const path = url.pathname.slice('/zitadel'.length)
  const redirect = (location: string) => {
    res.writeHead(302, { Location: location })
    res.end()
  }
  const json = (body: unknown) => {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
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
    const state = url.searchParams.get('state') ?? ''
    if (url.searchParams.get('prompt') === 'none') {
      redirect(`${redirectUri}?error=login_required&state=${encodeURIComponent(state)}`)
      return true
    }
    const locale = url.searchParams.get('ui_locales') ?? 'fr'
    redirect(`${new URL(redirectUri).origin}/${locale}/auth/login?authRequest=mock-auth-request`)
    return true
  }

  if (path === '/oidc/v1/end_session') {
    redirect(url.searchParams.get('post_logout_redirect_uri') ?? '/')
    return true
  }

  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'mock zitadel: not implemented' }))
  return true
}
