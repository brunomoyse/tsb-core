import { defineNuxtConfig } from 'nuxt/config'
import { fileURLToPath } from 'node:url'

// ─────────────────────────────────────────────────────────────────────────────
// Shared engine layer — brand-agnostic infrastructure extended by every brand
// App under apps/*. Owns: modules, engine plugins, i18n plumbing, runtimeConfig,
// Security headers/CSP, sitemap, sentry (conditional), SSR.
//
// Brand apps (the *main* app) provide pages/components/layouts/theme/assets and
// Set the `#brand` alias to their own root. In a layer's nuxt.config, `~`
// Resolves to the *main app*, not this layer, so all engine-local paths are
// Built from import.meta.url.
// ─────────────────────────────────────────────────────────────────────────────

// Derive origins for CSP from environment variables (dev defaults).
const apiOrigin = new URL(process.env.API_BASE_URL || 'http://localhost:8080/api/v1').origin
const wsOrigin = apiOrigin.replace(/^http/u, 'ws')
const s3Url = process.env.S3_BUCKET_URL
const osm = 'https://www.openstreetmap.org'
const umamiHost = process.env.UMAMI_HOST || 'https://analytics.nuagemagique.dev'
const zitadelOrigin = process.env.ZITADEL_AUTHORITY || 'https://auth.tokyosushibarliege.be'
const turnstile = 'https://challenges.cloudflare.com'
const iconifyHost = 'https://api.iconify.design'
const sentryHost = 'https://*.ingest.de.sentry.io'

const csp = `${[
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${umamiHost} ${turnstile}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data:${s3Url ? ` ${s3Url}` : ''} ${iconifyHost}`,
  "font-src 'self' https://fonts.gstatic.com",
  `connect-src 'self' ${apiOrigin} ${wsOrigin} ${zitadelOrigin} ${osm} ${umamiHost} ${turnstile} ${sentryHost}`,
  `frame-src 'self' ${osm} ${zitadelOrigin} ${turnstile}`,
  "worker-src 'self' blob:",
].join('; ')};`

const engineDir = fileURLToPath(new URL('./', import.meta.url))

export default defineNuxtConfig({
  ssr: true,

  site: {
    url: process.env.BASE_URL,
  },

  modules: [
    '@nuxtjs/i18n',
    '@pinia/nuxt',
    'pinia-plugin-persistedstate/nuxt',
    '@nuxtjs/sitemap',
    /*
     * Skip Sentry when no DSN is set at build time — including the module
     * bundles ~50KB of SDK that's inert without a DSN. Each app supplies its
     * own sentry.client/server.config.ts + org/project.
     */
    ...(process.env.SENTRY_DSN ? ['@sentry/nuxt/module'] : []),
  ],

  // Pinia store auto-import. The stores live in THIS layer, so point the
  // Scanner at an absolute path — a brand app extending the engine has no
  // Stores/ dir of its own, and pinia only scans the main app by default.
  pinia: {
    storesDirs: [fileURLToPath(new URL('./stores/**', import.meta.url))],
  },

  plugins: [
    // Absolute paths: `~` in a layer config points at the main app, not here.
    fileURLToPath(new URL('./plugins/api', import.meta.url)),
    fileURLToPath(new URL('./plugins/gqlFetch', import.meta.url)),
  ],

  i18n: {
    baseUrl: process.env.BASE_URL,
    bundle: {
      // @ts-expect-error i18n v10 option not yet in published types
      optimizeTranslationDirective: false,
    },
    defaultLocale: 'fr',
    locales: [
      { code: 'fr', language: 'fr-BE' },
      { code: 'en', language: 'en' },
      { code: 'zh', language: 'zh-CN' },
      { code: 'nl', language: 'nl-BE' },
    ],
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
      redirectOn: 'all',
    },
    strategy: 'prefix',
    // Base + #brand locale merge. Absolute path so the module resolves it
    // From this layer regardless of which app extends it.
    vueI18n: fileURLToPath(new URL('./i18n.config.ts', import.meta.url)),
  },

  runtimeConfig: {
    public: {
      baseUrl: process.env.BASE_URL,
      s3bucketUrl: process.env.S3_BUCKET_URL,
      api: process.env.API_BASE_URL,
      graphqlHttp: `${process.env.API_BASE_URL}/graphql`,
      graphqlWs: process.env.GRAPHQL_WS_URL,
      umamiHost: process.env.UMAMI_HOST || 'https://analytics.nuagemagique.dev',
      umamiWebsiteId: process.env.UMAMI_WEBSITE_ID || '',
      // Zitadel OIDC
      zitadelAuthority: process.env.ZITADEL_AUTHORITY || 'https://auth.tokyosushibarliege.be',
      zitadelClientId: process.env.ZITADEL_CLIENT_ID || '',
      zitadelNativeClientId: process.env.ZITADEL_NATIVE_CLIENT_ID || '',
      turnstileSiteKey: process.env.NUXT_PUBLIC_TURNSTILE_SITE_KEY || '',
      // Sentry (DSN is safe to expose client-side by design)
      sentryDsn: process.env.SENTRY_DSN || '',
      sentryEnvironment: process.env.SENTRY_ENVIRONMENT || 'production',
      sentryRelease: process.env.SENTRY_RELEASE || '',
    },
  },

  sitemap: {
    autoLastmod: true,
    defaults: {
      changefreq: 'weekly',
      priority: 0.8,
    },
    exclude: [
      '/auth/**',
      '/**/login',
      '/**/checkout',
      '/**/me',
      '/**/me/**',
      '/**/logout',
      '/**/order-completed/**',
    ],
  },

  routeRules: {
    '/**': {
      headers: {
        'X-Frame-Options': 'SAMEORIGIN',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
        'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
        'Content-Security-Policy': csp,
      },
    },
    '/_nuxt/**': {
      headers: { 'Cache-Control': 'public, max-age=31536000, immutable' },
    },
  },

  // Nuxt only adds layers under <rootDir>/layers to the generated tsconfigs, so
  // Register this layer's files with the brand app's app/node/server projects
  // (used by `vp check` type checking through layers/engine/tsconfig.json).
  typescript: {
    tsConfig: {
      include: [`${engineDir}**/*`],
      exclude: [`${engineDir}server/**`, `${engineDir}e2e/**`, `${engineDir}nuxt.config.ts`],
    },
    nodeTsConfig: {
      include: [`${engineDir}nuxt.config.ts`, `${engineDir}types/nuxt-config.d.ts`],
    },
  },
  nitro: {
    typescript: {
      tsConfig: {
        include: [`${engineDir}server/**/*`],
      },
    },
  },

  compatibilityDate: '2025-07-08', // Nuxt 4 RC release date
})
