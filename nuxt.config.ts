import { defineNuxtConfig } from 'nuxt/config'

// Derive origins for CSP from environment variables (dev defaults)
const apiOrigin = new URL(process.env.API_BASE_URL || 'http://localhost:8080/api/v1').origin
const wsOrigin = apiOrigin.replace(/^http/, 'ws')
const s3Url = process.env.S3_BUCKET_URL
const osm = 'https://www.openstreetmap.org'
const posthogHost = process.env.POSTHOG_HOST || 'https://eu.i.posthog.com'

const csp = `${[
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://eu-assets.i.posthog.com",
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data:${s3Url ? ` ${s3Url}` : ''}`,
    "font-src 'self' https://fonts.gstatic.com",
    `connect-src 'self' ${apiOrigin} ${wsOrigin} ${osm} ${posthogHost} https://eu-assets.i.posthog.com`,
    `frame-src ${osm}`,
    "worker-src 'self' blob:",
].join('; ')};`

export default defineNuxtConfig({
    ssr: true,

    css: ["~/assets/css/main.css", "~/assets/css/sakura.css"],

    $meta: {
        title: "Tokyo Sushi Bar",
        description: "Restaurant japonais à Liège — sushi frais, sashimi et cuisine japonaise authentique. Livraison et à emporter.",
    },

    site: {
        url: process.env.BASE_URL,
    },

    app: {
        pageTransition: {name: "page", mode: "out-in"},
        head: {
            title: "Tokyo Sushi Bar",
            meta: [
                {charset: "utf-8"},
                {name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover"},
                {name: "description", content: "Restaurant japonais à Liège — sushi frais, sashimi et cuisine japonaise authentique. Livraison et à emporter."},
            ],
            link: [
                // Favicon: light theme (black logo)
                {rel: "icon", type: "image/x-icon", href: "/favicon-light.ico", media: "(prefers-color-scheme: light)"},
                {rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-light-32x32.png", media: "(prefers-color-scheme: light)"},
                {rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-light-16x16.png", media: "(prefers-color-scheme: light)"},
                // Favicon: dark theme (white logo)
                {rel: "icon", type: "image/x-icon", href: "/favicon-dark.ico", media: "(prefers-color-scheme: dark)"},
                {rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-dark-32x32.png", media: "(prefers-color-scheme: dark)"},
                {rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-dark-16x16.png", media: "(prefers-color-scheme: dark)"},
                {rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png"},
                {rel: "manifest", href: "/site.webmanifest"},
            ],
        },
    },

    modules: [
        "@nuxtjs/tailwindcss",
        "@nuxtjs/google-fonts",
        "@nuxtjs/i18n",
        "@pinia/nuxt",
        'pinia-plugin-persistedstate/nuxt',
        'nuxt-schema-org',
        '@nuxtjs/sitemap'
    ],

    plugins: [
        '~/plugins/api',
        '~/plugins/gqlFetch',
    ],

    i18n: {
        baseUrl: process.env.BASE_URL,
        bundle: {
            // @ts-expect-error i18n v10 option not yet in published types
            optimizeTranslationDirective: false,
        },
        defaultLocale: 'fr',
        locales: [
            {
                code: 'fr',
                language: 'fr-BE'
            },
            {
                code: 'en',
                language: 'en'
            },
            {
                code: 'zh',
                language: 'zh-CN'
            }
        ],
        detectBrowserLanguage: {
            useCookie: true,
            cookieKey: 'i18n_redirected',
            redirectOn: 'all' // V10: stricter redirection with prefix strategy
        },
        strategy: 'prefix',
        vueI18n: "../i18n.config.ts",
    },

    runtimeConfig: {
        public: {
            baseUrl: process.env.BASE_URL,
            s3bucketUrl: process.env.S3_BUCKET_URL,
            api: process.env.API_BASE_URL,
            graphqlHttp: `${process.env.API_BASE_URL}/graphql`,
            graphqlWs: process.env.GRAPHQL_WS_URL,
            posthogApiKey: process.env.POSTHOG_API_KEY || '',
            posthogHost: process.env.POSTHOG_HOST || 'https://eu.i.posthog.com',
            cookie: {
                accessToken: {
                    name: 'access_token',
                    httpOnly: true,
                    sameSite: 'lax',
                    maxAge: 3600, // 1 hour
                },
                refreshToken: {
                    name: 'refresh_token',
                    httpOnly: true,
                    sameSite: 'lax',
                    maxAge: 2592000, // 30 days
                },
            }
        },
    },

    schemaOrg: {
        identity: {
            type: 'Restaurant',
            name: 'Tokyo Sushi Bar',
            url: process.env.BASE_URL,
            logo: `${process.env.BASE_URL}/images/tsb-black-font-400.png`,
        }
    },

    sitemap: {
        exclude: [
            '/**/login',
            '/**/register',
            '/**/checkout',
            '/**/me',
            '/**/me/**',
            '/**/logout',
            '/**/order-completed/**',
        ],
    },
    googleFonts: {
        families: {
            Montserrat: [400, 500, 600, 700],
        },
    },

    routeRules: {
        '/**': {
            headers: {
                'X-Frame-Options': 'DENY',
                'X-Content-Type-Options': 'nosniff',
                'Referrer-Policy': 'strict-origin-when-cross-origin',
                'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
                'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
                'Content-Security-Policy': csp,
            },
        },
    },

    compatibilityDate: "2025-07-08", // Nuxt 4 RC release date
});
