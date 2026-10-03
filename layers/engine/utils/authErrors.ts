/*
 * What a failed sign-in call means for the customer, from the shape of the error alone: a network failure has no
 * HTTP status at all, 429 is the rate limiter, 5xx is the server; everything else is the request being refused.
 * Each screen of the flow words "refused" in its own way (wrong code, OAuth failed, ...).
 */
export type AuthErrorKind = 'rateLimited' | 'network' | 'server' | 'rejected'

interface HttpLikeError {
  response?: { status?: number; _data?: unknown }
  statusCode?: number
  data?: unknown
}

export const httpStatusOf = (error: unknown): number | undefined => {
  const err = error as HttpLikeError | null | undefined
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
  switch (classifyAuthError(error)) {
    case 'rateLimited':
      return 'notify.errors.tooManyRequests'
    case 'network':
      return 'notify.errors.networkError'
    case 'server':
      return 'notify.errors.serverError'
    default:
      return rejectedKey
  }
}

/**
 * The backend refused the address because it cannot receive the code (422 `invalid_email`): bad syntax
 * or a domain that does not exist, such as "name@hotmail.coma". Shown on the email field itself.
 */
export function isUndeliverableEmailError(error: unknown): boolean {
  const err = error as HttpLikeError | null | undefined
  if (httpStatusOf(error) !== 422) return false
  const body = (err?.data ?? err?.response?._data) as { error?: unknown } | null | undefined
  return body?.error === 'invalid_email'
}
