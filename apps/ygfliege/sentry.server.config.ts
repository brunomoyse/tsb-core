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
    // Sentry v11 replaced sendDefaultPii with dataCollection, whose defaults collect
    // User info, cookies, bodies, query params and GraphQL variables. Opt out explicitly.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpBodies: [],
      urlQueryParams: false,
      graphQL: { variables: false },
      stackFrameVariables: false,
    },
  })
}
