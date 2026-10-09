import type * as SentryNuxt from '@sentry/nuxt'
import type * as SentrySdk from './sentrySdk.ts'
import { isChunkLoadError } from './chunkError.ts'

/*
 * The browser side of Sentry, loaded late (audit: Lighthouse 100). The SDK with tracing is ~110 KB of brotli-compressed
 * JavaScript, nearly half of everything the shop ships, and the @sentry/nuxt module's own client plugin makes the app wait
 * for it before it can hydrate. There is therefore no `sentry.client.config.ts` any more (that file name is what makes the
 * module add its client plugins): plugins/sentry-lazy.client.ts buffers errors while the page loads and calls
 * `startSentry` once it is interactive, and `reportError` calls it at once when a caught error has to be sent.
 *
 * `startSentry` is the module plugin's job done here: init with the shop's options, then the router tracing; Vue errors
 * reach Sentry through the app's `vue:error` hook (see the plugin) instead of Sentry's own Vue integration.
 */

export type SentryModule = typeof SentrySdk

/** What `namePageload` reads of the Vue router. */
interface CurrentRoute {
  currentRoute: { value: { path: string; matched: readonly { path: string }[] } }
}

/** The router the SDK's navigation tracing and `namePageload` both work with. */
type TracedRouter = NonNullable<
  NonNullable<Parameters<typeof SentrySdk.browserTracingIntegration>[0]>['router']
> &
  CurrentRoute

/** `SentryEnvironment.$router` is `unknown` so the plugin's `nuxtApp` and hand-built environments both fit; at runtime it is the Vue router. */
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- duck-typed: the SDK and `namePageload` only call what a Vue router has
const asTracedRouter = (router: unknown): TracedRouter => router as TracedRouter

export interface SentryEnvironment {
  /** Public runtime config: DSN, environment and release. */
  $config: { public: { sentryDsn?: string; sentryEnvironment?: string; sentryRelease?: string } }
  /** The Vue router, for the navigation transactions. */
  $router?: unknown
}

/*
 * Defensive cap against a runaway error source flooding the tunnel. The actual OIDC iframe-loop root cause is fixed in
 * useOidc.ts (removeUser on signinSilent failure), but if a different source ever floods Sentry from the client we don't
 * want to burn the quota: cap to MAX_EVENTS_PER_SESSION captured events per page load and silently drop the rest.
 */
export const MAX_EVENTS_PER_SESSION = 30

/*
 * Known oidc-client-ts / silent-renew error messages we never want to ship. These are operational signals (token
 * expired, user logged out elsewhere, Zitadel slow to respond), not actionable bugs.
 */
export const oidcNoise = [
  /signinSilent/iu,
  /silent_renew_error/iu,
  /Frame window timed out/iu,
  /No matching state found in storage/iu,
  /Token is not active/iu,
  /login_required/iu,
  /interaction_required/iu,
  /User is not authenticated/iu,
]

/*
 * Errors of the visitor's browser extensions, which run in our page and end up in its unhandled-rejection handler. The shop
 * never calls the WebExtension API (`runtime.sendMessage`...), so these are never ours and never actionable (TSB-CORE-D: a
 * Safari extension on iOS, no stack trace).
 */
export const extensionNoise = [
  /runtime\.sendMessage/u,
  /Extension context invalidated/iu,
  /Could not establish connection\. Receiving end does not exist/iu,
]

/*
 * A `fetch` that never got an answer (offline, a dropped connection, a suspended tab), in each browser's words; Sentry
 * adds the host in brackets. Not actionable from the page, and the same messages `isReportableError` skips (see
 * utils/gqlError.ts). TSB-CORE-A: Opera on iOS re-fetches the menu thumbnails itself, through the shop's page, and its
 * failures land in the unhandled-rejection handler although the shop only shows them with <img>.
 */
export const networkNoise = [
  /^(?:TypeError: )?(?:Load failed|Failed to fetch|NetworkError when attempting to fetch resource\.?)(?: \([^)]*\))?$/u,
]

/** Scripts of browser extensions: an error whose stack points there came from an extension, not from the shop. */
export const extensionUrls = [
  /^safari-(?:web-)?extension:\/\//iu,
  /^(?:chrome|moz)-extension:\/\//iu,
  /^webkit-masked-url:\/\//iu,
]

type BeforeSend = (
  event: SentryNuxt.ErrorEvent,
  hint: SentryNuxt.EventHint,
) => SentryNuxt.ErrorEvent | null

/** The `beforeSend` of the shop: a per-page-load cap, and no oidc-client-ts noise or handled chunk-load failures. */
export function createBeforeSend(): BeforeSend {
  let sessionEventCount = 0
  return (event, hint) => {
    // Per-session event cap: hard backstop against firehose scenarios.
    if (sessionEventCount >= MAX_EVENTS_PER_SESSION) return null

    // Drop anything originating inside oidc-client-ts even if the message doesn't match the ignoreErrors patterns above.
    const frames = event.exception?.values?.[0]?.stacktrace?.frames ?? []
    if (frames.some((f) => typeof f.filename === 'string' && f.filename.includes('oidc-client-ts')))
      return null

    const error = hint?.originalException

    // A lazy chunk failed to load (stale build or dropped connection): the engine's plugins/chunk-reload.client.ts
    // reloads the page, so it is handled and not actionable.
    if (isChunkLoadError(error)) return null

    if (
      error instanceof Error &&
      typeof error.stack === 'string' &&
      error.stack.includes('oidc-client-ts')
    )
      return null

    sessionEventCount += 1
    return event
  }
}

/** Initialises the SDK exactly as the shop always configured it, then adds the router tracing. */
export function initSentry(Sentry: SentryModule, env: SentryEnvironment): void {
  const { sentryDsn, sentryEnvironment, sentryRelease } = env.$config.public
  Sentry.init({
    dsn: sentryDsn,
    environment:
      sentryEnvironment !== undefined && sentryEnvironment !== ''
        ? sentryEnvironment
        : 'production',
    release: sentryRelease === '' ? undefined : sentryRelease,

    // Route envelopes through our own origin to bypass ad-blockers and privacy extensions that block *.ingest.sentry.io.
    tunnel: '/api/sentry-tunnel',

    // ~10% of transactions get a performance trace; lower in prod if volume is high.
    tracesSampleRate: 0.1,

    // Keep replay off by default: privacy + payload size concerns for a webshop.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,

    // Sentry v11 replaced sendDefaultPii with dataCollection, whose defaults collect user info, cookies, bodies, query
    // params and GraphQL variables. Opt out explicitly.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpBodies: [],
      urlQueryParams: false,
      graphQL: { variables: false },
      stackFrameVariables: false,
    },

    ignoreErrors: [...oidcNoise, ...extensionNoise, ...networkNoise],
    denyUrls: extensionUrls,
    beforeSend: createBeforeSend(),
  })

  if (env.$router !== undefined && env.$router !== null) {
    Sentry.getClient()?.addIntegration(
      Sentry.browserTracingIntegration({
        router: asTracedRouter(env.$router),
        routeLabel: 'path',
      }),
    )
    namePageload(Sentry, asTracedRouter(env.$router))
  }
}

/*
 * Names the page's pageload span after the matched route (`/fr/menu`, `/fr/order-completed/:orderId()`: the language is part of the route path in this app) instead of the literal `Pageload`. It is the name the router tracing gives the navigation spans (routeLabel 'path'), so both kinds of span group alike.
 *
 * The SDK is loaded after the router's first navigation, so the router tracing never sees it and cannot name the span; the
 * span would stay `Pageload` for every page of the shop and all of them would land in one bucket. The matched route's path
 * is the parametrised one (not `/fr/order-completed/42`), which keeps the number of names small. `updateSpanName` also marks the
 * name final, so the SDK does not fall back to `Pageload` when the span ends.
 *
 * The pageload span's DURATION is not meaningful any more: it now measures "until the SDK started (2.5 s after load) plus its
 * idle time", not the page's load. Look at the web vitals attached to it (LCP, CLS, INP, TTFB, FCP) for the page's speed.
 */
function namePageload(Sentry: SentryModule, router: CurrentRoute): void {
  const active = Sentry.getActiveSpan()
  const root = active && Sentry.getRootSpan(active)
  if (!root || Sentry.spanToJSON(root).attributes['sentry.op'] !== 'pageload') return
  const route = router.currentRoute.value
  Sentry.updateSpanName(root, route.matched.at(-1)?.path ?? route.path)
}

/*
 * Browser only. The server build inlines dynamic imports, so an unconditional `import('./sentrySdk.ts')` would be a static
 * import there, linked when the server starts: the Node entry of @sentry/nuxt has no `browserTracingIntegration`, and the
 * server would fail to boot. `import.meta.client` is a build-time constant: the branch (and the import) is dropped from the
 * server bundle.
 */
const loadBrowserSdk = (): Promise<SentryModule> =>
  import.meta.client
    ? import('./sentrySdk.ts')
    : Promise.reject(new Error('The Sentry browser SDK only loads in the browser'))

let started: Promise<SentryModule> | null = null
let announceStarted: (Sentry: SentryModule) => void = () => undefined
const startedSignal = new Promise<SentryModule>((resolve) => {
  announceStarted = resolve
})

/**
 * Resolves once the SDK is initialised, whoever started it (the buffering plugin, or `reportError` for a caught error). It
 * never loads anything itself and never rejects: it stays pending when the SDK is never needed.
 */
export const whenSentryStarted = (): Promise<SentryModule> => startedSignal

/** Loads and initialises Sentry once; every later call gets the same promise. */
export function startSentry(
  env: SentryEnvironment,
  loadSdk: () => Promise<SentryModule> = loadBrowserSdk,
): Promise<SentryModule> {
  started ??= loadSdk().then((Sentry) => {
    initSentry(Sentry, env)
    announceStarted(Sentry)
    return Sentry
  })
  // A failed load (offline, stale chunk) is retried on the next call instead of being cached.
  started.catch(() => {
    started = null
  })
  return started
}
