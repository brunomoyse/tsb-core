import { defineNuxtConfig } from 'nuxt/config'
import { fileURLToPath } from 'node:url'

// ─────────────────────────────────────────────────────────────────────────────
// Shared engine layer: brand-agnostic infrastructure extended by every brand
// App under apps/*. Owns: modules, engine plugins, i18n plumbing, runtimeConfig,
// Security headers/CSP, sitemap, sentry (conditional), SSR.
//
// Brand apps (the *main* app) provide pages/components/layouts/theme/assets and
// Set the `#brand` alias to their own root. In a layer's nuxt.config, `~`
// Resolves to the *main app*, not this layer, so all engine-local paths are
// Built from import.meta.url.
// ─────────────────────────────────────────────────────────────────────────────

/*
 * Public environment every deployment must provide at BUILD time (they are baked into the client bundle). There is
 * deliberately no default for any of them: a brand that forgot one used to silently talk to Tokyo Sushi's identity
 * provider. A production build (`nuxt build` / `generate`) stops with the list of what is missing; dev servers and
 * `nuxi prepare` / `typecheck` do not need them.
 */
const REQUIRED_PUBLIC_ENV = [
  'BASE_URL',
  'API_BASE_URL',
  'S3_BUCKET_URL',
  'GRAPHQL_WS_URL',
  'ZITADEL_AUTHORITY',
  'ZITADEL_CLIENT_ID',
] as const

// An empty variable counts as unset: it falls back like a missing one (CI passes unset repository variables as '').
const envOr = (name: string, fallback: string): string => {
  const value = process.env[name]
  return value !== undefined && value !== '' ? value : fallback
}

// Derive origins for CSP from environment variables (the API falls back to a local one for development only).
const apiOrigin = new URL(envOr('API_BASE_URL', 'http://localhost:8080/api/v1')).origin
const wsOrigin = apiOrigin.replace(/^http/u, 'ws')
const s3Url = envOr('S3_BUCKET_URL', '')
const s3Origin = s3Url ? new URL(s3Url).origin : ''
const osm = 'https://www.openstreetmap.org'
const umamiHost = envOr('UMAMI_HOST', 'https://analytics.nuagemagique.dev')
const zitadelOrigin = envOr('ZITADEL_AUTHORITY', '')
const turnstile = 'https://challenges.cloudflare.com'
const sentryHost = 'https://*.ingest.de.sentry.io'

const csp = `${[
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${umamiHost} ${turnstile}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data:${s3Url ? ` ${s3Url}` : ''}`,
  "font-src 'self' https://fonts.gstatic.com",
  `connect-src 'self' ${apiOrigin} ${wsOrigin}${zitadelOrigin ? ` ${zitadelOrigin}` : ''} ${osm} ${umamiHost} ${turnstile} ${sentryHost}`,
  `frame-src 'self' ${osm}${zitadelOrigin ? ` ${zitadelOrigin}` : ''} ${turnstile}`,
  "worker-src 'self' blob:",
].join('; ')};`

const engineDir = fileURLToPath(new URL('./', import.meta.url))

const LOCALES = [
  { code: 'fr', language: 'fr-BE' },
  { code: 'en', language: 'en' },
  { code: 'zh', language: 'zh-CN' },
  { code: 'nl', language: 'nl-BE' },
] as const
const LANGUAGE_COOKIE = 'i18n_redirected'

export default defineNuxtConfig({
  ssr: true,

  app: {
    head: {
      link: [
        // Open the connections the page is about to need while the HTML is still being parsed (audit PR 6.2, P12): the
        // Product images come from the S3/CDN origin (plain <img>, so the default connection pool), the API is called
        // With fetch and no credentials (hence `crossorigin`: the anonymous pool).
        ...(s3Origin ? [{ rel: 'preconnect', href: s3Origin }] : []),
        { rel: 'preconnect', href: apiOrigin, crossorigin: 'anonymous' as const },
      ],
      script: [
        /*
         * A returning visitor with a cart gets the menu's desktop cart column on the very first paint (audit PR 6.3, P13):
         * the cart is in localStorage, which the server cannot read, so the column used to appear after hydration and
         * narrow the menu, re-wrapping every product row. This flags <html data-has-cart> before the body is parsed; the
         * menu pages reserve the column from it (until they are mounted and know the real cart). Key and shape: the
         * 'cart' store (stores/cart.ts, utils/cartPersistence.ts).
         */
        {
          innerHTML:
            "try{var c=JSON.parse(localStorage.getItem('cart')||'null');if(c&&c.products&&c.products.length)document.documentElement.setAttribute('data-has-cart','')}catch(e){}",
        },
      ],
    },
  },

  hooks: {
    ready: (nuxt) => {
      // `_prepare` is `nuxi prepare` / `typecheck` (and the postinstall): types only, nothing is built.
      // oxlint-disable-next-line no-underscore-dangle -- `_prepare` is Nuxt's own flag for `nuxi prepare` / `typecheck`.
      if (nuxt.options.dev || nuxt.options._prepare) return
      const missing = REQUIRED_PUBLIC_ENV.filter((name) => (process.env[name]?.trim() ?? '') === '')
      if (missing.length > 0) {
        throw new Error(
          `Missing required environment variable(s) for a production build: ${missing.join(', ')}. ` +
            'They are baked into the client bundle, so set them when building (Docker: --build-arg, CI: repository variables).',
        )
      }
    },
  },

  site: {
    url: process.env.BASE_URL,
  },

  modules: [
    // Before @nuxtjs/i18n, which asks for the locale files this registers while it sets itself up.
    fileURLToPath(new URL('./build/i18n-messages', import.meta.url)),
    '@nuxtjs/i18n',
    '@pinia/nuxt',
    'pinia-plugin-persistedstate/nuxt',
    '@nuxtjs/sitemap',
    /*
     * Skip Sentry when no DSN is set at build time; including the module
     * bundles ~50KB of SDK that's inert without a DSN. Each app supplies its
     * own sentry.server.config.ts + org/project. The browser SDK is not set up by the module (no sentry.client.config.ts): plugins/sentry-lazy.client.ts loads it once the page is interactive.
     */
    ...(envOr('SENTRY_DSN', '') === '' ? [] : ['@sentry/nuxt/module']),
  ],

  // Pinia store auto-import. The stores live in THIS layer, so point the
  // Scanner at an absolute path; a brand app extending the engine has no
  // Stores/ dir of its own, and pinia only scans the main app by default.
  pinia: {
    storesDirs: [fileURLToPath(new URL('./stores/**', import.meta.url))],
  },

  plugins: [
    // Absolute paths: `~` in a layer config points at the main app, not here.
    fileURLToPath(new URL('./plugins/gqlFetch', import.meta.url)),
  ],

  i18n: {
    baseUrl: process.env.BASE_URL,
    bundle: {
      // @ts-expect-error i18n v10 option not yet in published types
      optimizeTranslationDirective: false,
    },
    defaultLocale: 'fr',
    compilation: {
      // The FAQ answers carry their own <br> and <strong> and are rendered as HTML on purpose (our own copy, not user input).
      // Locale files loaded lazily are checked for HTML, inline messages never were: say so instead of warning on every build.
      strictMessage: false,
    },
    experimental: {
      // The lazily-loaded messages (build/i18n-messages.ts) become hashed static files: precompressed, cached for good.
      // As the Nitro route they answer with a 10-second cache and no compression.
      prerenderMessages: true,
    },
    locales: [...LOCALES],
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: LANGUAGE_COOKIE,
      redirectOn: 'all',
    },
    strategy: 'prefix',
    // Base + #brand locale merge. Absolute path so the module resolves it
    // From this layer regardless of which app extends it.
    vueI18n: fileURLToPath(new URL('./i18n.config.ts', import.meta.url)),
  },

  runtimeConfig: {
    /*
     * The pages answered from memory (server/middleware/static-page-cache.ts, audit PR 6.1): the same for every visitor.
     * A brand adds its own (arrays concatenate across layers); personalised pages never belong here.
     */
    staticPageCache: {
      locales: LOCALES.map((l) => l.code),
      pages: ['terms', 'privacy', 'faq', 'contact', 'account-deletion'],
      cookie: LANGUAGE_COOKIE,
    },
    /*
     * The address of each language file (`{ fr: '/_i18n/<hash>/fr/messages.json', ... }`), filled in at build time by
     * build/i18n-messages.ts and read by middleware/preload-messages.global.ts. Empty in dev.
     */
    tsbI18nMessageUrls: {},
    /*
     * Runtime switch (`NUXT_DEFER_HYDRATION=true`) for the FULL deferral of the entry script until after the first paint
     * (server/plugins/defer-hydration.ts, utils/deferHydration.ts). Off: the entry script and modulepreloads stay in the head
     * and only the language file and prefetch hints wait for the first frame.
     */
    deferHydration: false,
    public: {
      baseUrl: process.env.BASE_URL,
      s3bucketUrl: process.env.S3_BUCKET_URL,
      api: process.env.API_BASE_URL,
      graphqlHttp: `${process.env.API_BASE_URL}/graphql`,
      graphqlWs: process.env.GRAPHQL_WS_URL,
      umamiHost: envOr('UMAMI_HOST', 'https://analytics.nuagemagique.dev'),
      umamiWebsiteId: envOr('UMAMI_WEBSITE_ID', ''),
      // Zitadel OIDC
      zitadelAuthority: envOr('ZITADEL_AUTHORITY', ''),
      zitadelClientId: envOr('ZITADEL_CLIENT_ID', ''),
      zitadelNativeClientId: envOr('ZITADEL_NATIVE_CLIENT_ID', ''),
      turnstileSiteKey: envOr('NUXT_PUBLIC_TURNSTILE_SITE_KEY', ''),
      // Sentry (DSN is safe to expose client-side by design)
      sentryDsn: envOr('SENTRY_DSN', ''),
      sentryEnvironment: envOr('SENTRY_ENVIRONMENT', 'production'),
      sentryRelease: envOr('SENTRY_RELEASE', ''),
    },
  },

  sitemap: {
    autoLastmod: true,
    defaults: {
      changefreq: 'weekly',
      priority: 0.8,
    },
    /*
     * Private and transactional pages. Unprefixed on purpose: the module expands each pattern to every locale prefix
     * itself, and the earlier `/**\/me`-style patterns matched none of /fr/me, /fr/checkout (checked in the generated
     * sitemaps: cart, checkout, me and me/orders were listed). robots.txt and each page's robots meta agree with this list.
     */
    exclude: [
      '/auth/**',
      '/login',
      '/logout',
      '/cart',
      '/checkout',
      '/me',
      '/me/**',
      '/order-completed/**',
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
    // The language files (build/i18n-messages.ts): the folder name is a hash of their content.
    '/_i18n/**': {
      headers: { 'Cache-Control': 'public, max-age=31536000, immutable' },
    },
  },

  // Nuxt only adds layers under <rootDir>/layers to the generated tsconfigs, so
  // Register this layer's files with the brand app's app/node/server projects
  // (used by `vp check` type checking through the root tsconfig.json).
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
    // Static files are compressed once at build time (gzip + brotli next to the originals) and served with the encoding
    // The browser accepts: Nitro does not compress anything itself and tsb-infra configures no compression in Traefik.
    // Cloudflare (when the zone is proxied) compresses what it relays, but the home server is reached without it.
    compressPublicAssets: { gzip: true, brotli: true },
    typescript: {
      tsConfig: {
        include: [`${engineDir}server/**/*`],
      },
    },
  },

  compatibilityDate: '2025-07-08', // Nuxt 4 RC release date
})
