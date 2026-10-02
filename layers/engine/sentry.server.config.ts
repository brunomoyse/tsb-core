import * as Sentry from '@sentry/nuxt'

const dsn = process.env.SENTRY_DSN
const env = process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'production'
const release = process.env.SENTRY_RELEASE

if (dsn) {
    Sentry.init({
        dsn,
        environment: env,
        release,
        tracesSampleRate: 0.1,
        sendDefaultPii: false,
    })
}
