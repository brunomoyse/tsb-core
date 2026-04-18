import * as Sentry from '@sentry/nuxt'

const cfg = useRuntimeConfig()

if (cfg.public.sentryDsn) {
    Sentry.init({
        dsn: cfg.public.sentryDsn as string,
        environment: (cfg.public.sentryEnvironment as string) || 'production',
        release: (cfg.public.sentryRelease as string) || undefined,

        // ~10% of transactions get a performance trace; lower in prod if volume is high.
        tracesSampleRate: 0.1,

        // Integrations: default stack includes BrowserTracing + Replay when enabled.
        // Keep replay off by default — privacy + payload size concerns for a webshop.
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: 0,

        // Drop PII-ish breadcrumbs (URLs with email/token) automatically.
        sendDefaultPii: false,
    })
}
