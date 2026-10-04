import { isReportableError } from './gqlError.ts'
import { tryUseNuxtApp } from '#app'
import { type SentryEnvironment, startSentry } from './sentryClient.ts'

/*
 * Reports an error that a `catch` block would otherwise swallow (audit R9).
 *
 * - Always `console.warn`s in dev, so a failure is visible while developing.
 * - In production sends it to Sentry when the shop has a DSN (the @sentry/nuxt module and its
 *   client config only exist then); the SDK is loaded lazily (sentryClient.ts) so builds and pages
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

  let nuxtApp: SentryEnvironment | undefined
  try {
    nuxtApp = tryUseNuxtApp() as unknown as SentryEnvironment | undefined
    if (!nuxtApp?.$config?.public?.sentryDsn) return
  } catch {
    return
  }

  // Starts the SDK when it is not there yet (it is loaded after the page is interactive, see utils/sentryClient.ts).
  void startSentry(nuxtApp)
    .then((Sentry) => {
      Sentry.captureException(error, { tags: { context }, ...(extra ? { extra } : {}) })
    })
    .catch(() => undefined)
}
