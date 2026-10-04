import { authErrorKey, classifyAuthError, isUndeliverableEmailError } from './authErrors.ts'
import { isValidEmail } from '../lib/validators.ts'

/*
 * The decisions of the sign-in flow (components/auth/AuthFlow.vue), kept pure so every path is pinned by
 * `authFlow.test.mjs`: what a failed call shows, which step comes next, how the resend countdown ticks.
 * The component owns the refs, the requests and the focus handling; it only asks these functions what to do.
 */

export type AuthStep = 'email' | 'code' | 'profile'

/** The field-level format error shown after the customer leaves the email field: an empty field is not an error yet. */
export const emailFormatInvalid = (value: string): boolean =>
  value.trim() !== '' && !isValidEmail(value)

/** The backend answered without a usable session (auth service unavailable, short-circuit): nothing to verify a code against. */
export const hasUsableOtpSession = (
  session: { sessionId?: string | null; sessionToken?: string | null } | null | undefined,
): boolean => Boolean(session?.sessionId && session?.sessionToken)

export type RequestCodeFailure =
  /** 422 invalid_email: shown on the email field itself. */
  | { kind: 'undeliverable' }
  /** Anything else: the banner message (i18n key) and the analytics error type. */
  | { kind: 'message'; key: string }

/** What a failed "send me a code" call means for the customer. */
export function describeRequestCodeFailure(error: unknown): RequestCodeFailure {
  if (isUndeliverableEmailError(error)) return { kind: 'undeliverable' }
  return { kind: 'message', key: authErrorKey(error, 'notify.errors.requestFailed') }
}

/** Analytics type of a failed code check: only the throttle and a refused code are tracked, a network or server fault is not. */
export type VerifyFailureTrack = 'rate_limited' | 'invalid_code' | null

export function describeVerifyFailure(error: unknown): { key: string; track: VerifyFailureTrack } {
  const kind = classifyAuthError(error)
  let track: VerifyFailureTrack = null
  if (kind === 'rateLimited') track = 'rate_limited'
  else if (kind === 'rejected') track = 'invalid_code'
  return { key: authErrorKey(error, 'notify.errors.invalidCode'), track }
}

/** A failed resend or profile save: the shared wording, "request failed" for a refusal. */
export const describeGenericFailure = (error: unknown): string =>
  authErrorKey(error, 'notify.errors.requestFailed')

/** A failed start of Google / Apple sign-in. */
export const describeIdpStartFailure = (error: unknown): string =>
  classifyAuthError(error) === 'rateLimited'
    ? 'notify.errors.tooManyRequests'
    : 'notify.errors.oauthFailed'

/** A verified code on a brand new placeholder account first collects the name; otherwise the OIDC finalize runs at once. */
export const stepAfterVerify = (verified: { requiresProfile: boolean }): 'profile' | 'finalize' =>
  verified.requiresProfile ? 'profile' : 'finalize'

/** The step indicator: two steps, three when the account is new. */
export const totalAuthSteps = (requiresProfile: boolean): number => (requiresProfile ? 3 : 2)

export const authStepIndex = (step: AuthStep): number => {
  if (step === 'email') return 0
  if (step === 'code') return 1
  return 2
}

export const RESEND_COOLDOWN_SECONDS = 20

/** One second of the resend countdown: the new value, and whether the timer is done. */
export const tickResendCooldown = (seconds: number): { seconds: number; done: boolean } => ({
  seconds: seconds - 1,
  done: seconds - 1 <= 0,
})

/** The resend button is locked while counting down or while a request is running. */
export const isResendDisabled = (cooldownSeconds: number, loading: boolean): boolean =>
  cooldownSeconds > 0 || loading

/** The verify button needs the full 6 digits and no request in flight. */
export const isVerifyDisabled = (code: string, loading: boolean): boolean =>
  loading || code.length < 6

/**
 * A return path is only honoured when it stays on this site: an absolute path, not protocol-relative (`//evil`),
 * and not the auth flow itself (that would loop the customer back to the login page). Browsers read a backslash as a
 * slash and drop tabs and line breaks inside a URL, so `/\evil.example` and `/<TAB>/evil.example` are `//evil.example`:
 * any backslash or control character disqualifies the path.
 */
export function sanitizeReturnTo(raw: string | null | undefined): string | null {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return null
  // oxlint-disable-next-line no-control-regex -- the point is to refuse control characters
  if (/[\\\u0000-\u001f\u007f]/u.test(raw)) return null
  if (/^\/[^/]+\/auth(\/|$)/u.test(raw)) return null
  return raw
}

/**
 * A dead session sends the customer to the login page: remember the page they were on (a path that passes
 * `sanitizeReturnTo`, so never the auth flow itself) in the slot `useAuthCallback` reads once the session is restored.
 * Browser only; where there is no storage, or it refuses (private mode), the customer simply lands on the default page.
 */
export function rememberCurrentPage(): void {
  if (typeof window === 'undefined') return
  const { pathname, search, hash } = window.location
  const path = sanitizeReturnTo(`${pathname}${search}${hash}`)
  if (!path) return
  try {
    sessionStorage.setItem('oidc_return_to', path)
  } catch {
    // Storage unavailable: nothing to remember.
  }
}

export type PostAuthTarget =
  /** Back to where the customer was (checkout, a protected page). */
  | { kind: 'path'; path: string }
  /** Nothing in the cart: browse the menu. */
  | { kind: 'menu' }
  /** A cart with items: checkout when ordering is possible, the menu otherwise (the caller asks the server). */
  | { kind: 'checkout-if-open' }

/** Where the OIDC callback sends the customer once the session is restored. */
export function postAuthTarget(returnTo: string | null, cartEmpty: boolean): PostAuthTarget {
  if (returnTo) return { kind: 'path', path: returnTo }
  return cartEmpty ? { kind: 'menu' } : { kind: 'checkout-if-open' }
}
