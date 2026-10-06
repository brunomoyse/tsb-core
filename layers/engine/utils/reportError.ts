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

/**
 * Reports the error the error page is showing, unfiltered: a startup failure or a failed first navigation reaches the
 * page through `showError()`, which never runs Nuxt's `app:error` hook, so without this the visitor sees the error page
 * and Sentry gets nothing (or only a later error caused by it). A dropped connection or a stale chunk is exactly what
 * we want to know about here, hence no `isReportableError`. Client errors (3xx/4xx of a Nuxt/h3 error, e.g. a 404 from
 * a typo) stay out, like in the buffering plugin. Sentry's dedupe drops it when the plugin already sent the same error.
 */
export function reportPageError(error: unknown): void {
  const status = (error as { statusCode?: number; status?: number } | null)?.statusCode
  if (status && status >= 300 && status < 500) return
  if (import.meta.dev) console.warn('[error-page]', error)

  let nuxtApp: SentryEnvironment | undefined
  try {
    nuxtApp = tryUseNuxtApp() as unknown as SentryEnvironment | undefined
    if (!nuxtApp?.$config?.public?.sentryDsn) return
  } catch {
    return
  }

  // A NuxtError wraps what was thrown: report the original (its stack points at the failing code), keep the page URL.
  const cause = (error as { cause?: unknown } | null)?.cause
  void startSentry(nuxtApp)
    .then((Sentry) => {
      Sentry.captureException(cause instanceof Error ? cause : error, {
        mechanism: { handled: false, type: 'auto.function.nuxt.error-page' },
        captureContext: {
          tags: { context: 'error-page' },
          extra: { statusCode: status ?? null, url: globalThis.location?.href ?? null },
        },
      })
    })
    .catch(() => undefined)
}
