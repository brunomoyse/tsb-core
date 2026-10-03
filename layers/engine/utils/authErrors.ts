/*
 * What a failed sign-in call means for the customer, from the shape of the error alone: a network failure has no
 * HTTP status at all, 429 is the rate limiter, 5xx is the server; everything else is the request being refused.
 * Each screen of the flow words "refused" in its own way (wrong code, OAuth failed, ...).
 */
export type AuthErrorKind = 'rateLimited' | 'network' | 'server' | 'rejected'

interface HttpLikeError {
  response?: { status?: number }
  statusCode?: number
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
