import {
  MAX_EVENTS_PER_SESSION,
  type SentryEnvironment,
  type SentryModule,
  startSentry,
} from '#engine/utils/sentryClient'

/*
 * Sentry, loaded after the page is interactive (see utils/sentryClient.ts for why). Until the SDK is there, the three
 * ways a browser error reaches us are listened to by a few lines of our own and kept: a script error, an unhandled
 * promise rejection, and Vue's / Nuxt's error hooks. The first one also loads the SDK at once, then everything kept is
 * sent, so an early failure is reported (a little later), not lost. Without an error, the SDK starts at idle time
 * once the page has been loaded for LOAD_DELAY_MS, which keeps it out of the first-interaction window.
 *
 * Does nothing without a DSN (the engine only registers the @sentry/nuxt module for builds that have one).
 */
export const LOAD_DELAY_MS = 2500
const IDLE_TIMEOUT_MS = 3000

interface Captured {
  error: unknown
  mechanism: string
  extra?: Record<string, unknown>
}

export default defineNuxtPlugin({
  name: 'sentry-lazy',
  parallel: true,
  setup(nuxtApp) {
    const env = nuxtApp as unknown as SentryEnvironment
    if (!env.$config.public.sentryDsn) return

    let sentry: SentryModule | null = null
    const kept: Captured[] = []

    const send = (Sentry: SentryModule, { error, mechanism, extra }: Captured) => {
      Sentry.captureException(error, {
        mechanism: { handled: false, type: mechanism },
        ...(extra ? { captureContext: { extra } } : {}),
      })
    }

    const load = () => {
      void startSentry(env)
        .then((Sentry) => {
          sentry = Sentry
          // Sentry's own global handlers are in place now: ours would report everything twice.
          window.removeEventListener('error', onScriptError)
          window.removeEventListener('unhandledrejection', onRejection)
          for (const item of kept.splice(0)) send(Sentry, item)
        })
        .catch(() => undefined)
    }

    const capture = (item: Captured) => {
      if (sentry) {
        send(sentry, item)
        return
      }
      // Same ceiling as the SDK's own (beforeSend): a runaway source must not grow the list while the SDK loads.
      if (kept.length < MAX_EVENTS_PER_SESSION) kept.push(item)
      load()
    }

    function onScriptError(event: ErrorEvent) {
      capture({
        error: event.error ?? event.message,
        mechanism: 'auto.browser.global_handlers.onerror',
      })
    }
    function onRejection(event: PromiseRejectionEvent) {
      capture({
        error: event.reason,
        mechanism: 'auto.browser.global_handlers.onunhandledrejection',
      })
    }

    window.addEventListener('error', onScriptError)
    window.addEventListener('unhandledrejection', onRejection)

    nuxtApp.hook('vue:error', (error, _instance, info) => {
      capture({ error, mechanism: 'auto.function.nuxt.vue-error', extra: { info } })
    })
    nuxtApp.hook('app:error', (error) => {
      // Redirects and client errors (a 404 is a visitor's typo) are not ours to track.
      const status =
        (error as { status?: number; statusCode?: number } | null)?.status ??
        (error as { statusCode?: number } | null)?.statusCode
      if (status && status >= 300 && status < 500) return
      capture({ error, mechanism: 'auto.function.nuxt.app-error' })
    })

    onNuxtReady(() => {
      setTimeout(() => {
        // Safari has no requestIdleCallback.
        if (typeof window.requestIdleCallback === 'function')
          window.requestIdleCallback(load, { timeout: IDLE_TIMEOUT_MS })
        else load()
      }, LOAD_DELAY_MS)
    })
  },
})
