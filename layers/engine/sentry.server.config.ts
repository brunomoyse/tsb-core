import * as Sentry from '@sentry/nuxt'

const dsn = process.env.SENTRY_DSN
// An empty variable counts as unset.
const nonEmpty = (value: string | undefined): string | undefined =>
  value !== undefined && value !== '' ? value : undefined
const env =
  nonEmpty(process.env.SENTRY_ENVIRONMENT) ?? nonEmpty(process.env.NODE_ENV) ?? 'production'
const release = process.env.SENTRY_RELEASE

if (nonEmpty(dsn) !== undefined) {
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
