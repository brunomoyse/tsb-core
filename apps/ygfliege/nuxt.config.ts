import { defineNuxtConfig } from 'nuxt/config'
import { fileURLToPath } from 'node:url'

// ─────────────────────────────────────────────────────────────────────────────
// Yangguofu Malatang Liège app — the main app for ygfliege.be. Extends the
// shared engine layer and owns everything visual: pages, components, layouts,
// theme, assets, copy, and the brand identity (brand.ts / app.config.ts /
// locale overrides).
//
//   #engine → the shared layer (app files import engine code via this alias;
//             engine-internal imports keep using ~/ which resolves per-layer).
//   #brand  → this app's root, so engine files that import brand data
//             (i18n.config.ts, server/routes/robots.txt.ts) and
//             useAppConfig().brand resolve against this brand.
// ─────────────────────────────────────────────────────────────────────────────

const appDir = fileURLToPath(new URL('.', import.meta.url))

export default defineNuxtConfig({
    extends: [
        fileURLToPath(new URL('../../layers/engine', import.meta.url)),
    ],

    alias: {
        '#engine': fileURLToPath(new URL('../../layers/engine', import.meta.url)),
        '#brand': appDir,
    },

    css: [
        // main.css @imports components.css — the commerce vocabulary needs to
        // share a PostCSS pass with the @tailwind directives, and every entry
        // in this array is compiled independently.
        "~/assets/css/main.css",
        // YGF design tokens (--ygf-* custom properties) + page background.
        "~/assets/css/brand.css",
    ],

    // Modules that are UI/brand concerns (theme + fonts). Engine registers the
    // rest (i18n, pinia, sitemap, sentry); module arrays concat across layers.
    modules: [
        "@nuxtjs/tailwindcss",
        "@nuxtjs/google-fonts",
    ],

    $meta: {
        title: 'Yangguofu Malatang Liège',
        description: 'Yangguofu Malatang à Liège — composez votre bol de malatang, bouillon aux herbes cuit minute. Le bonheur tient dans un bol.',
    },

    app: {
        pageTransition: { name: "page", mode: "out-in" },
        head: {
            title: 'Yangguofu Malatang Liège',
            meta: [
                { charset: "utf-8" },
                { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
                { name: 'description', content: 'Yangguofu Malatang à Liège — composez votre bol de malatang, bouillon aux herbes cuit minute. Le bonheur tient dans un bol.' },
                { name: 'theme-color', content: '#F58220' },
            ],
            link: [
                { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
                { rel: "icon", type: "image/png", sizes: "512x512", href: "/icon-512.png" },
                { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
            ],
        },
    },

    // Inter for body text, Noto Sans SC for headings + CJK, Noto Serif SC for
    // the Chinese calligraphy accents (杨国福麻辣烫) — per GUIDELINES.md.
    googleFonts: {
        families: {
            Inter: [400, 500, 600, 700],
            'Noto Sans SC': [400, 500, 700, 900],
            'Noto Serif SC': [700],
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
        sourceMapsUploadOptions: {
            enabled: Boolean(process.env.SENTRY_AUTH_TOKEN),
            org: process.env.SENTRY_ORG || 'yangguofu-malatang-liege',
            project: process.env.SENTRY_PROJECT || 'ygfliege-core',
            authToken: process.env.SENTRY_AUTH_TOKEN,
        },
    },

    // Per-subdirectory long cache headers for static assets. Nitro's
    // public-asset handler sets Cache-Control directly; routeRules headers
    // don't override it.
    nitro: {
        publicAssets: [
            { baseURL: '/images', dir: `${appDir}public/images`, maxAge: 60 * 60 * 24 * 365 },
            { baseURL: '/videos', dir: `${appDir}public/videos`, maxAge: 60 * 60 * 24 * 365 },
        ],
    },
})
