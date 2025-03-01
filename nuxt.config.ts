import { defineNuxtConfig } from "nuxt/config";

export default defineNuxtConfig({
  ssr: true,

  css: ["~/assets/css/main.css", "~/assets/css/sakura.css"],

  $meta: {
    title: "Tokyo Sushi Bar",
    description: "Tokyo Sushi Bar",
  },

  app: {
    pageTransition: { name: "page", mode: "out-in" },
    head: {
      title: "Tokyo Sushi Bar",
      meta: [
        { charset: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { hid: "description", name: "description", content: "Tokyo Sushi Bar" },
      ],
      link: [{ rel: "icon", type: "image/x-icon", href: "/favicon.ico" }],
    },
  },

  modules: [
    "@nuxtjs/tailwindcss",
    "@nuxtjs/google-fonts",
    "@nuxtjs/i18n",
    "@pinia/nuxt",
    'pinia-plugin-persistedstate/nuxt'
  ],
  
  plugins: [
    '~/plugins/fetchAuth',
  ],

  i18n: {
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
      redirectOn: 'root' // recommended for SEO
    },
    baseUrl: process.env.BASE_URL,
    strategy: 'prefix_and_default',
    vueI18n: "./i18n.config.ts",
  },

  runtimeConfig: {
    public: {
      s3bucketUrl: process.env.S3_BUCKET_URL,
      client: {
        apiBaseUrl: process.env.API_BASE_URL_CLIENT,
      },
      server: {
        apiBaseUrl: process.env.API_BASE_URL_SERVER,
      },
    },
  },
  // @ts-ignore-next-line
  googleFonts: {
    families: {
      Montserrat: [400, 500, 600, 700],
    },
  },

  compatibilityDate: "2025-03-01",
});
