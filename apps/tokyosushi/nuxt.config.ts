import { defineNuxtConfig } from 'nuxt/config'
import { fileURLToPath } from 'node:url'

// ─────────────────────────────────────────────────────────────────────────────
// Tokyo Sushi Bar app — the main app. Extends the shared engine layer and owns
// everything visual: pages, components, layouts, theme, assets, copy, and the
// brand identity (brand.ts / app.config.ts / locale overrides).
//
//   #engine → the shared layer (app files import engine code via this alias;
//             engine-internal imports keep using ~/ which resolves per-layer).
//   #brand  → this app's root, so engine files that import brand data
//             (i18n.config.ts, server/routes/robots.txt.ts & llms.txt.ts) and
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
        "~/assets/css/main.css",
        "~/assets/css/sakura.css",
        // Brand display font (@font-face Channel) + html background.
        "~/assets/css/brand.css",
    ],

    // Modules that are UI/brand concerns (theme + fonts). Engine registers the
    // rest (i18n, pinia, sitemap, sentry); module arrays concat across layers.
    modules: [
        "@nuxtjs/tailwindcss",
        "@nuxtjs/google-fonts",
    ],

    $meta: {
        title: 'Tokyo Sushi Bar',
        description: 'Restaurant japonais à Liège — sushi frais, sashimi et cuisine japonaise authentique. Livraison et à emporter.',
    },

    app: {
        pageTransition: { name: "page", mode: "out-in" },
        head: {
            title: 'Tokyo Sushi Bar',
            meta: [
                { charset: "utf-8" },
                { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
                { name: 'description', content: 'Restaurant japonais à Liège — sushi frais, sashimi et cuisine japonaise authentique. Livraison et à emporter.' },
            ],
            link: [
                // Favicon: light theme (black logo)
                { rel: "icon", type: "image/x-icon", href: "/favicon-light.ico", media: "(prefers-color-scheme: light)" },
                { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-light-32x32.png", media: "(prefers-color-scheme: light)" },
                { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-light-16x16.png", media: "(prefers-color-scheme: light)" },
                // Favicon: dark theme (white logo)
                { rel: "icon", type: "image/x-icon", href: "/favicon-dark.ico", media: "(prefers-color-scheme: dark)" },
                { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-dark-32x32.png", media: "(prefers-color-scheme: dark)" },
                { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-dark-16x16.png", media: "(prefers-color-scheme: dark)" },
                { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
                { rel: "manifest", href: "/site.webmanifest" },
            ],
        },
    },

    googleFonts: {
        families: {
            Montserrat: [400, 500, 600, 700],
        },
        display: 'swap',
        download: true,
        preload: true,
        inject: true,
        overwriting: true,
    },

    /*
     * @sentry/nuxt module (registered by the engine layer when SENTRY_DSN is set)
     * — org/project defaults for this brand's Sentry project. SENTRY_AUTH_TOKEN
     * is the CI-only source-map upload token.
     */
    sentry: {
        sourceMapsUploadOptions: {
            enabled: Boolean(process.env.SENTRY_AUTH_TOKEN),
            org: process.env.SENTRY_ORG || 'tokyo-sushi-bar',
            project: process.env.SENTRY_PROJECT || 'tsb-core',
            authToken: process.env.SENTRY_AUTH_TOKEN,
        },
    },

    // Per-subdirectory long cache headers for static assets (logos, hero images,
    // display font, icons). Nitro's public-asset handler sets Cache-Control
    // directly; routeRules headers don't override it. All public assets live
    // under this app.
    nitro: {
        publicAssets: [
            { baseURL: '/images', dir: `${appDir}public/images`, maxAge: 60 * 60 * 24 * 365 },
            { baseURL: '/icons',  dir: `${appDir}public/icons`,  maxAge: 60 * 60 * 24 * 365 },
            { baseURL: '/fonts',  dir: `${appDir}public/fonts`,  maxAge: 60 * 60 * 24 * 365 },
        ],
    },
})
