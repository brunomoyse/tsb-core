import {
  MAX_EVENTS_PER_SESSION,
  type SentryEnvironment,
  type SentryModule,
  startSentry,
  whenSentryStarted,
} from '#engine/utils/sentryClient'
import { isNuxtError } from '#app'

/*
 * Sentry, loaded after the page is interactive (see utils/sentryClient.ts for why). Until the SDK is there, the three
 * ways a browser error reaches us are listened to by a few lines of our own and kept: a script error, an unhandled
 * promise rejection, and Vue's / Nuxt's error hooks. The first one also loads the SDK at once, then everything kept is
 * sent, so an early failure is reported (a little later), not lost. Without an error, the SDK starts at idle time
 * once the page has been loaded for LOAD_DELAY_MS, which keeps it out of the first-interaction window.
 *
 * `order: -40`: this plugin runs before every other one, Nuxt's own included (the payload reviver is -30, head and router
 * -20), so an error thrown while any of them sets up is kept too instead of vanishing before the hooks below exist. With
 * `enforce: 'pre'` it ran fifth, and a failure in the router or payload plugins at startup was lost (TSB-CORE-C).
 *
 * Known trade-off: an error kept before the SDK is there is sent without breadcrumbs (the SDK records the console, fetch and
 * navigation from its own start) and without the Vue component context (its Vue integration is not installed either; the
 * `info` string of Vue's hook is attached as extra data).
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
  order: -40,
  parallel: true,
  setup(nuxtApp) {
    const env: SentryEnvironment = nuxtApp
    const { sentryDsn } = env.$config.public
    if (sentryDsn === undefined || sentryDsn === '') return

    let sentry: SentryModule | null = null
    const kept: Captured[] = []

    const send = (Sentry: SentryModule, { error, mechanism, extra }: Captured) => {
      Sentry.captureException(error, {
        mechanism: { handled: false, type: mechanism },
        ...(extra ? { captureContext: { extra } } : {}),
      })
    }

    const load = () => {
      void startSentry(env).catch(() => undefined)
    }

    // Whoever starts the SDK (this plugin, or `reportError` for a caught error): from then on its own global handlers are
    // in place, so ours come off at once (they would report every window error twice) and what was kept is sent.
    void whenSentryStarted().then((Sentry) => {
      sentry = Sentry
      window.removeEventListener('error', onScriptError)
      window.removeEventListener('unhandledrejection', onRejection)
      for (const item of kept.splice(0)) send(Sentry, item)
    })

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
      // Same rule as the @sentry/nuxt module's own plugin: redirects and client errors of a Nuxt/h3 error (a 404 is a
      // visitor's typo) are not ours to track. Any other thrown value is reported, whatever fields it has.
      if (isNuxtError(error)) {
        const { status } = error
        if (status !== undefined && status >= 300 && status < 500) return
      }
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
