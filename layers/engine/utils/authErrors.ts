/*
 * What a failed sign-in call means for the customer, from the shape of the error alone: a network failure has no
 * HTTP status at all, 429 is the rate limiter, 5xx is the server; everything else is the request being refused.
 * Each screen of the flow words "refused" in its own way (wrong code, OAuth failed, ...).
 */
export type AuthErrorKind = 'rateLimited' | 'network' | 'server' | 'rejected'

interface HttpLikeError {
  /** `responseData` is ofetch's `response._data`. */
  response?: { status?: number; responseData?: unknown }
  statusCode?: number
  data?: unknown
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const toStatus = (value: unknown): number | undefined =>
  typeof value === 'number' ? value : undefined

/** Narrows an unknown thrown value to the error shapes the HTTP clients produce. */
const asHttpLikeError = (error: unknown): HttpLikeError | undefined => {
  if (!isRecord(error)) return undefined
  const { response } = error
  const { _data: responseData } = isRecord(response) ? response : {}
  return {
    response: isRecord(response) ? { status: toStatus(response.status), responseData } : undefined,
    statusCode: toStatus(error.statusCode),
    data: error.data,
  }
}

export const httpStatusOf = (error: unknown): number | undefined => {
  const err = asHttpLikeError(error)
  return err?.response?.status ?? err?.statusCode
}

export function classifyAuthError(error: unknown): AuthErrorKind {
  const status = httpStatusOf(error)
  if (status === 429) return 'rateLimited'
  if (status === undefined) return 'network'
  if (status >= 500) return 'server'
  return 'rejected'
}

/** The i18n key to show: the shared wording for the rate limiter, the network and the server, `rejectedKey` otherwise. */
export function authErrorKey(error: unknown, rejectedKey: string): string {
  const kind = classifyAuthError(error)
  if (kind === 'rateLimited') return 'notify.errors.tooManyRequests'
  if (kind === 'network') return 'notify.errors.networkError'
  if (kind === 'server') return 'notify.errors.serverError'
  return rejectedKey
}

/**
 * The backend refused the address because it cannot receive the code (422 `invalid_email`): bad syntax
 * or a domain that does not exist, such as "name@hotmail.coma". Shown on the email field itself.
 */
export function isUndeliverableEmailError(error: unknown): boolean {
  if (httpStatusOf(error) !== 422) return false
  const err = asHttpLikeError(error)
  const body = err?.data ?? err?.response?.responseData
  return isRecord(body) && body.error === 'invalid_email'
}

/**
 * The customer did not finish the Google or Apple step (cancelled, closed it, came back with the back button): the
 * backend answers 400 `idp_intent_not_succeeded`. Not a failure of the shop, so the callback page offers to try again
 * without reporting it.
 */
export function isIdpSignInCancelled(error: unknown): boolean {
  if (httpStatusOf(error) !== 400) return false
  const err = asHttpLikeError(error)
  const body = err?.data ?? err?.response?.responseData
  return isRecord(body) && body.error === 'idp_intent_not_succeeded'
}
