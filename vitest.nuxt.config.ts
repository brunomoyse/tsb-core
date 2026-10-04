import { defineVitestConfig } from '@nuxt/test-utils/config'
import { nuxtProject } from './test/nuxtProject'

// Client-side Nuxt environment: composables, stores, plugins, route middleware (`import.meta.client === true`).
export default defineVitestConfig(
  nuxtProject({ name: 'nuxt', include: ['{layers,apps}/**/*.nuxt.test.ts'] }),
)
