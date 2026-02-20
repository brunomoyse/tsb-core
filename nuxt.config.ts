import {defineNuxtConfig} from "nuxt/config";

export default defineNuxtConfig({
    ssr: true,

    css: ["~/assets/css/main.css", "~/assets/css/sakura.css"],

    $meta: {
        title: "Tokyo Sushi Bar",
        description: "Tokyo Sushi Bar",
    },

    app: {
        pageTransition: {name: "page", mode: "out-in"},
        head: {
            title: "Tokyo Sushi Bar",
            meta: [
                {charset: "utf-8"},
                {name: "viewport", content: "width=device-width, initial-scale=1"},
                {name: "description", content: "Tokyo Sushi Bar"},
            ],
            link: [{rel: "icon", type: "image/x-icon", href: "/favicon.ico"}],
        },
    },

    modules: [
        "@nuxtjs/tailwindcss",
        "@nuxtjs/google-fonts",
        "@nuxtjs/i18n",
        "@pinia/nuxt",
        'pinia-plugin-persistedstate/nuxt',
        'nuxt-schema-org'
    ],

    plugins: [
        '~/plugins/api',
        '~/plugins/gqlFetch',
    ],

    i18n: {
        bundle: {
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
            redirectOn: 'all' // v10: stricter redirection with prefix strategy
        },
        strategy: 'prefix',
        vueI18n: "../i18n.config.ts",
    },

    runtimeConfig: {
        public: {
            baseUrl: process.env.BASE_URL,
            s3bucketUrl: process.env.S3_BUCKET_URL,
            api: process.env.API_BASE_URL,
            graphqlHttp: process.env.API_BASE_URL + '/graphql',
            graphqlWs: process.env.GRAPHQL_WS_URL,
            cookie: {
                accessToken: {
                    name: 'access_token',
                    httpOnly: true,
                    sameSite: 'lax',
                    maxAge: 900, // 15 minutes
                },
                refreshToken: {
                    name: 'refresh_token',
                    httpOnly: true,
                    sameSite: 'lax',
                    maxAge: 604800, // 7 days
                },
            }
        },
    },

    schemaOrg: {
        identity: {
            type: 'Organization',
            name: 'Tokyo Sushi Bar',
            url: process.env.BASE_URL,
            logo: process.env.BASE_URL + '/logo.png',
        }
    },
    // @ts-expect-error property googleFonts does not exist
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
                'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://d1sq9yypil8nox.cloudfront.net; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://api.tokyosushi.be wss://api.tokyosushi.be;",
            },
        },
    },

    compatibilityDate: "2025-07-08", // Nuxt 4 RC release date
});
