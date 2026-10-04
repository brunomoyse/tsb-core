/*
 * The silent renewal of the session (useOidc.silentRenew) has three outcomes: the renewed user, `null` (the session is
 * over: Zitadel refused the refresh token, or there is nothing to renew with: the customer must sign in again), and this
 * error: the renewal could not be attempted or finished (no network, a timeout, Zitadel down). The session is untouched:
 * the refresh token may well still be valid, so the callers keep the customer signed in, do not send them to the login
 * page, and the next request tries again.
 *
 * It is recognised by name, not `instanceof`: the callers load useOidc with a dynamic import, and a module that is
 * evaluated twice (a reset in a test, a duplicated chunk) would give two classes.
 */
export class SilentRenewUnavailableError extends Error {
  constructor(options?: { cause?: unknown }) {
    super('The session could not be renewed right now', options)
    this.name = 'SilentRenewUnavailableError'
  }
}

export const isSilentRenewUnavailable = (err: unknown): err is SilentRenewUnavailableError =>
  err instanceof Error && err.name === 'SilentRenewUnavailableError'
