import type { IncomingMessage, ServerResponse } from 'node:http'
import type { MockState } from './state.ts'

/*
 * The REST endpoints of tsb-service the web apps call outside GraphQL (`/api/v1/*`):
 *
 *   POST /auth/session/otp/request           { loginName, lang }                       -> { sessionId, sessionToken }
 *   POST /auth/session/otp/verify            { sessionId, sessionToken, code }         -> { sessionId, sessionToken, requiresProfile }
 *   POST /auth/session/otp/resend            { sessionId, sessionToken, lang }         -> { success }
 *   POST /auth/session/otp/complete-profile  { sessionId, sessionToken, firstName, lastName } -> { success }
 *   POST /auth/authorize-proxy               { authorizeUrl }  (inline checkout login) -> { authRequestId }
 *   POST /auth/finalize                      { authRequestId, sessionId, sessionToken }-> { callbackUrl }
 *   GET  /orders/:id/invoice                 a one-page PDF, `Content-Disposition: attachment`
 *   POST /feedback                           the contact page's form -> { success }; refused as `scenario.feedbackFailure` says
 *
 * `finalize` is the hand-off back to Zitadel: it answers with the app's own `/auth/callback?code=..&state=..` (the code is
 * exchanged by zitadel.ts' token endpoint). What each call does is steered by `scenario.otp` (types.ts OtpScenario): the
 * accepted code, a new account, failures. Every call is logged (`MockControl.restCalls`).
 *
 * Errors carry the same status codes the real service uses, which is all the app looks at (AuthFlow: 422 invalid_email,
 * 429, 5xx, any other 4xx = refused).
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Expose-Headers': 'Content-Disposition',
}

const json = (res: ServerResponse, status: number, body: unknown) => {
  res.writeHead(status, { 'Content-Type': 'application/json', ...CORS })
  res.end(JSON.stringify(body))
}

const str = (value: unknown): string => (typeof value === 'string' ? value : '')

const header = (req: IncomingMessage, name: string): string | undefined => {
  const value = req.headers[name]
  return Array.isArray(value) ? value[0] : value
}

/** A minimal one-page PDF: enough for the browser to save a file named like the real invoice. */
const PDF = Buffer.from(
  '%PDF-1.1\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
    '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n',
)

/** Handles `/api/v1/auth/*` and the invoice download; false when the path is not one of them. */
export function handleRest(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  body: () => Promise<Record<string, unknown> | null>,
  state: MockState,
  selfUrl: string,
): Promise<boolean> | boolean {
  const prefix = '/api/v1'
  if (!url.pathname.startsWith(`${prefix}/`)) return false
  const path = url.pathname.slice(prefix.length)
  const invoice = /^\/orders\/([^/]+)\/invoice$/u.exec(path)
  if (!path.startsWith('/auth/') && !invoice && path !== '/feedback') return false
  return run()

  async function run(): Promise<boolean> {
    const method = req.method ?? 'GET'
    const input = (method === 'GET' ? {} : await body()) ?? {}
    const authenticated = /^Bearer\s+\S+/u.test(header(req, 'authorization') ?? '')
    state.logRest({ at: new Date().toISOString(), method, path, body: input, authenticated })

    if (invoice) {
      invoiceDownload(res, state, invoice[1] ?? '', authenticated)
      return true
    }
    if (method !== 'POST') {
      json(res, 405, { error: 'method not allowed' })
      return true
    }
    if (path === '/feedback') {
      feedback(res, state, input)
      return true
    }
    handleAuth(res, state, path, input, selfUrl)
    return true
  }
}

function feedback(res: ServerResponse, state: MockState, input: Record<string, unknown>) {
  const failure = state.scenario.feedbackFailure
  if (failure === 'rate_limited') json(res, 429, { error: 'too_many_requests' })
  else if (failure === 'server') json(res, 500, { error: 'internal_error' })
  else if (failure === 'captcha_failed') json(res, 400, { error: 'captcha_failed' })
  else if (
    failure === 'invalid' ||
    !str(input.name).trim() ||
    !str(input.email).includes('@') ||
    str(input.message).trim().length < 10
  )
    json(res, 400, { error: 'invalid_input' })
  else json(res, 200, { success: true })
}

function invoiceDownload(
  res: ServerResponse,
  state: MockState,
  id: string,
  authenticated: boolean,
) {
  if (!authenticated || state.scenario.rejectSession) {
    json(res, 401, { error: 'unauthorized' })
    return
  }
  if (!state.orders.has(id)) {
    json(res, 404, { error: 'order not found' })
    return
  }
  if (state.scenario.invoiceFailure) {
    json(res, 500, { error: 'invoice generation failed' })
    return
  }
  res.writeHead(200, {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="facture-${id.slice(-4)}.pdf"`,
    ...CORS,
  })
  res.end(PDF)
}

function handleAuth(
  res: ServerResponse,
  state: MockState,
  path: string,
  input: Record<string, unknown>,
  selfUrl: string,
) {
  const { otp } = state.scenario
  const { auth } = state

  const failure = (kind: 'invalid_email' | 'rate_limited' | 'server' | null): boolean => {
    if (kind === 'invalid_email') json(res, 422, { error: 'invalid_email' })
    else if (kind === 'rate_limited') json(res, 429, { error: 'too_many_requests' })
    else if (kind === 'server') json(res, 500, { error: 'internal_error' })
    return kind !== null
  }
  /** The session the call names, when id and token match (the token rotates on verify). */
  const sessionOf = () => {
    const session = auth.sessions.get(str(input.sessionId))
    return session && session.token === str(input.sessionToken) ? session : null
  }

  switch (path) {
    case '/auth/session/otp/request': {
      if (failure(otp.requestFailure)) return
      const loginName = str(input.loginName).trim()
      if (!loginName.includes('@')) {
        json(res, 422, { error: 'invalid_email' })
        return
      }
      const id = auth.next('session')
      auth.sessions.set(id, {
        id,
        token: auth.next('token'),
        loginName,
        verified: false,
        needsProfile: otp.newAccount,
      })
      const session = auth.sessions.get(id)
      json(res, 200, { sessionId: id, sessionToken: session?.token })
      return
    }
    case '/auth/session/otp/verify': {
      const session = sessionOf()
      if (!session) {
        json(res, 401, { error: 'invalid_session' })
        return
      }
      if (failure(otp.verifyFailure)) return
      if (otp.codeExpired || str(input.code) !== otp.code) {
        json(res, 400, { error: 'invalid_code' })
        return
      }
      session.verified = true
      session.token = auth.next('token')
      if (session.needsProfile) {
        // A brand new placeholder account: the mock user takes the address and starts without a name.
        Object.assign(state.user, { email: session.loginName, firstName: '', lastName: '' })
      }
      json(res, 200, {
        sessionId: session.id,
        sessionToken: session.token,
        requiresProfile: session.needsProfile,
      })
      return
    }
    case '/auth/session/otp/resend': {
      const session = sessionOf()
      if (!session) {
        json(res, 401, { error: 'invalid_session' })
        return
      }
      if (failure(otp.resendFailure)) return
      // A resend mails a fresh code, which replaces the expired one.
      state.scenario.otp.codeExpired = false
      json(res, 200, { success: true })
      return
    }
    case '/auth/session/otp/complete-profile': {
      const session = sessionOf()
      if (!session?.verified || !session.needsProfile) {
        json(res, 401, { error: 'invalid_session' })
        return
      }
      const firstName = str(input.firstName).trim()
      const lastName = str(input.lastName).trim()
      if (!firstName || !lastName) {
        json(res, 400, { error: 'name_required' })
        return
      }
      Object.assign(state.user, { firstName, lastName })
      session.needsProfile = false
      json(res, 200, { success: true })
      return
    }
    case '/auth/authorize-proxy': {
      // The inline checkout login mints its authRequestId here: the authorize URL is parsed, not followed.
      try {
        const authorize = new URL(str(input.authorizeUrl))
        json(res, 200, { authRequestId: state.auth.startRequest(authorize.searchParams) })
      } catch {
        json(res, 400, { error: 'bad authorize url' })
      }
      return
    }
    case '/auth/finalize': {
      const session = sessionOf()
      const request = auth.requests.get(str(input.authRequestId))
      if (!session?.verified || session.needsProfile || !request) {
        json(res, 400, { error: 'cannot finalize' })
        return
      }
      const code = auth.next('code')
      auth.codes.set(code, request)
      const callback = new URL(request.redirectUri)
      callback.searchParams.set('code', code)
      callback.searchParams.set('state', request.state)
      json(res, 200, { callbackUrl: callback.toString() })
      return
    }
    default:
      json(res, 404, { error: `mock: no route POST ${path} on ${selfUrl}` })
  }
}
