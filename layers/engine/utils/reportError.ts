import { isReportableError } from './gqlError.ts'
import { tryUseNuxtApp } from '#app'

/*
 * Reports an error that a `catch` block would otherwise swallow (audit R9).
 *
 * - Always `console.warn`s in dev, so a failure is visible while developing.
 * - In production sends it to Sentry when the shop has a DSN (the @sentry/nuxt module and its
 *   client config only exist then); `@sentry/nuxt` is imported lazily so builds and pages
 *   without Sentry never load it.
 * - Never reports what is expected: aborted requests, a dropped connection, and GraphQL errors
 *   that are the customer's input or session (see `isReportableError`).
 *
 * Fire and forget: it never throws and never blocks the caller.
 */
export function reportError(
  error: unknown,
  context: string,
  extra?: Record<string, unknown>,
): void {
  if (import.meta.dev) console.warn(`[${context}]`, error)
  if (!isReportableError(error)) return

  try {
    const config = tryUseNuxtApp()?.$config as { public?: { sentryDsn?: string } } | undefined
    if (!config?.public?.sentryDsn) return
  } catch {
    return
  }

  void import('@sentry/nuxt')
    .then((Sentry) => {
      Sentry.captureException(error, { tags: { context }, ...(extra ? { extra } : {}) })
    })
    .catch(() => undefined)
}
