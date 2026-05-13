import * as Sentry from '@sentry/nuxt'

const cfg = useRuntimeConfig()

/*
 * Defensive cap against a runaway error source flooding the tunnel. The
 * actual OIDC iframe-loop root cause is fixed in useOidc.ts (removeUser on
 * signinSilent failure), but if a different source ever floods Sentry from
 * the client we don't want to burn the quota — cap to MAX_EVENTS_PER_SESSION
 * captured events per page load and silently drop the rest.
 */
const MAX_EVENTS_PER_SESSION = 30
let sessionEventCount = 0

/*
 * Known oidc-client-ts / silent-renew error messages we never want to ship.
 * These are operational signals (token expired, user logged out elsewhere,
 * Zitadel slow to respond) — not actionable bugs.
 */
const oidcNoise = [
    /signinSilent/iu,
    /silent_renew_error/iu,
    /Frame window timed out/iu,
    /No matching state found in storage/iu,
    /Token is not active/iu,
    /login_required/iu,
    /interaction_required/iu,
    /User is not authenticated/iu,
]

if (cfg.public.sentryDsn) {
    Sentry.init({
        dsn: cfg.public.sentryDsn as string,
        environment: (cfg.public.sentryEnvironment as string) || 'production',
        release: (cfg.public.sentryRelease as string) || undefined,

        /*
         * Route envelopes through our own origin to bypass ad-blockers and
         * privacy extensions that block *.ingest.sentry.io.
         */
        tunnel: '/api/sentry-tunnel',

        // ~10% of transactions get a performance trace; lower in prod if volume is high.
        tracesSampleRate: 0.1,

        /*
         * Integrations: default stack includes BrowserTracing + Replay when enabled.
         * Keep replay off by default — privacy + payload size concerns for a webshop.
         */
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: 0,

        // Drop PII-ish breadcrumbs (URLs with email/token) automatically.
        sendDefaultPii: false,

        ignoreErrors: oidcNoise,

        beforeSend(event, hint) {
            // Per-session event cap: hard backstop against firehose scenarios.
            if (sessionEventCount >= MAX_EVENTS_PER_SESSION) {
                return null
            }

            /*
             * Drop anything originating inside oidc-client-ts even if the
             * message doesn't match the ignoreErrors patterns above.
             */
            const frames = event.exception?.values?.[0]?.stacktrace?.frames ?? []
            if (frames.some(f => typeof f.filename === 'string' && f.filename.includes('oidc-client-ts'))) {
                return null
            }

            const error = hint?.originalException
            if (error instanceof Error && typeof error.stack === 'string' && error.stack.includes('oidc-client-ts')) {
                return null
            }

            sessionEventCount += 1
            return event
        },
    })
}
