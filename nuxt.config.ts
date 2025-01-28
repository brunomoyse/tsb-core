export default defineNuxtConfig({
  //ssr: true,
  ssr: false,

  css: ["~/assets/css/main.css"],

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
    "shadcn-nuxt",
    "@pinia/nuxt",
    "@nuxtjs/google-fonts",
  ],

  // @ts-ignore-next-line
  shadcn: {
    /**
     * Prefix for all the imported component
     */
    prefix: "",
    /**
     * Directory that the component lives in.
     * @default "./components/ui"
     */
    componentDir: "./components/ui",
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

  googleFonts: {
    families: {
      Montserrat: [400, 500, 600, 700],
    },
  },

  compatibilityDate: "2025-01-27",
});