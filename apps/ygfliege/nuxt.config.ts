import { defineNuxtConfig } from 'nuxt/config'
import { fileURLToPath } from 'node:url'

// ─────────────────────────────────────────────────────────────────────────────
// Yangguofu Malatang Liège app — the main app for ygfliege.be. Extends the
// Shared engine layer and owns everything visual: pages, components, layouts,
// Theme, assets, copy, and the brand identity (brand.ts / app.config.ts /
// Locale overrides).
//
//   #engine → the shared layer (app files import engine code via this alias;
//             Engine-internal imports keep using ~/ which resolves per-layer).
//   #brand  → this app's root, so engine files that import brand data
//             (i18n.config.ts, server/routes/robots.txt.ts) and
//             UseAppConfig().brand resolve against this brand.
// ─────────────────────────────────────────────────────────────────────────────

const appDir = fileURLToPath(new URL('.', import.meta.url))

export default defineNuxtConfig({
  extends: [fileURLToPath(new URL('../../layers/engine', import.meta.url))],

  alias: {
    '#engine': fileURLToPath(new URL('../../layers/engine', import.meta.url)),
    '#brand': appDir,
  },

  css: [
    // Main.css @imports components.css — the commerce vocabulary needs to
    // Share a PostCSS pass with the @tailwind directives, and every entry
    // In this array is compiled independently.
    '~/assets/css/main.css',
    // YGF design tokens (--ygf-* custom properties) + page background.
    '~/assets/css/brand.css',
  ],

  // Modules that are UI/brand concerns (theme + fonts). Engine registers the
  // Rest (i18n, pinia, sitemap, sentry); module arrays concat across layers.
  modules: ['@nuxtjs/tailwindcss', '@nuxtjs/google-fonts'],

  $meta: {
    title: 'Yangguofu Malatang Liège',
    description:
      'Yangguofu Malatang à Liège — composez votre bol de malatang, bouillon aux herbes cuit minute. Le bonheur tient dans un bol.',
  },

  app: {
    pageTransition: { name: 'page', mode: 'out-in' },
    head: {
      title: 'Yangguofu Malatang Liège',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        {
          name: 'description',
          content:
            'Yangguofu Malatang à Liège — composez votre bol de malatang, bouillon aux herbes cuit minute. Le bonheur tient dans un bol.',
        },
        { name: 'theme-color', content: '#F58220' },
        // Light only (no dark theme): stops Android auto-dark from inverting the UI.
        { name: 'color-scheme', content: 'only light' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'icon', type: 'image/png', sizes: '512x512', href: '/icon-512.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
        { rel: 'manifest', href: '/site.webmanifest' },
      ],
    },
  },

  // Inter for body text. Noto Sans SC (headings + CJK) and Noto Serif SC (the Chinese calligraphy accents, 杨国福麻辣烫)
  // Are not requested from Google Fonts any more (audit PR 6.3, P13): the module saved every unicode-range slice of a CJK
  // Family under one file name, so ~100 rules per weight (500 KB of the stylesheet) pointed at a single slice and most
  // Glyphs came from the visitor's own font anyway, at the price of a 75 KB download. The CJK glyphs are set in the
  // System's CJK font (see --font-chinese in brand.css); the accents use a 24 KB subset of Noto Serif SC, family 'YGF Accent Serif' (brand.css).
  googleFonts: {
    families: {
      Inter: [400, 500, 600, 700],
    },
    display: 'swap',
    download: true,
    preload: true,
    inject: true,
    overwriting: true,
  },

  /*
   * @sentry/nuxt module (registered by the engine layer when SENTRY_DSN is
   * set). TODO(user): create the Sentry project for ygfliege and set the
   * org/project defaults here.
   */
  sentry: {
    org: process.env.SENTRY_ORG || 'yangguofu-malatang-liege',
    project: process.env.SENTRY_PROJECT || 'ygfliege-core',
    authToken: process.env.SENTRY_AUTH_TOKEN,
    sourcemaps: {
      disable: !process.env.SENTRY_AUTH_TOKEN,
    },
  },

  // The brand's own static pages join the engine's list of pages answered from memory (see the engine nuxt.config).
  runtimeConfig: {
    staticPageCache: { pages: ['about', 'concept'] },
  },

  // Per-subdirectory long cache headers for static assets. Nitro's
  // Public-asset handler sets Cache-Control directly; routeRules headers
  // Don't override it.
  nitro: {
    publicAssets: [
      { baseURL: '/images', dir: `${appDir}public/images`, maxAge: 60 * 60 * 24 * 365 },
      { baseURL: '/videos', dir: `${appDir}public/videos`, maxAge: 60 * 60 * 24 * 365 },
    ],
  },
})
