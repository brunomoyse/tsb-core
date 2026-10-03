import type { ModuleOptions as SentryModuleOptions } from '@sentry/nuxt/module'

// The engine registers @sentry/nuxt/module only when SENTRY_DSN is set, so Nuxt's
// Generated module types lack the `sentry` key the brand apps configure.
declare module '@nuxt/schema' {
  interface NuxtConfig {
    sentry?: SentryModuleOptions
  }
}

export {}
