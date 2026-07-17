import { defineNuxtConfig } from 'nuxt/config'
import { fileURLToPath } from 'node:url'

// Tokyo Sushi Bar brand layer: site metadata, display-font/background CSS, and
// Sentry project defaults. The base app extends this via NUXT_BRAND.
export default defineNuxtConfig({
    // Absolute path: `~` in a layer config resolves to the main project, not
    // this layer, so build the path from import.meta.url.
    css: [fileURLToPath(new URL('./assets/css/brand.css', import.meta.url))],

    $meta: {
        title: 'Tokyo Sushi Bar',
        description: 'Restaurant japonais à Liège — sushi frais, sashimi et cuisine japonaise authentique. Livraison et à emporter.',
    },

    app: {
        head: {
            title: 'Tokyo Sushi Bar',
            meta: [
                { name: 'description', content: 'Restaurant japonais à Liège — sushi frais, sashimi et cuisine japonaise authentique. Livraison et à emporter.' },
            ],
        },
    },

    sentry: {
        sourceMapsUploadOptions: {
            org: process.env.SENTRY_ORG || 'tokyo-sushi-bar',
            project: process.env.SENTRY_PROJECT || 'tsb-core',
        },
    },
})
