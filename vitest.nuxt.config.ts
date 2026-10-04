import { defineVitestConfig } from '@nuxt/test-utils/config'
import { nuxtProject } from './test/nuxtProject'

// Client-side Nuxt environment: composables, stores, plugins, route middleware (`import.meta.client === true`),
// in the real app of apps/tokyosushi. The code and the tests that belong to ygfliege run in its own app
// (vitest.nuxt-ygfliege.config.ts).
export default defineVitestConfig(
  nuxtProject({
    name: 'nuxt',
    app: 'tokyosushi',
    include: ['{layers,apps}/**/*.nuxt.test.ts'],
    exclude: ['apps/ygfliege/**', '**/*.ygfliege.nuxt.test.ts'],
  }),
)
