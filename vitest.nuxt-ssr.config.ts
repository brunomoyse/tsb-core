import { defineVitestConfig } from '@nuxt/test-utils/config'
import { nuxtProject } from './test/nuxtProject'

// Same Nuxt environment, but code compiled as the server bundle sees it (`import.meta.server === true`).
export default defineVitestConfig(
  nuxtProject({ name: 'nuxt-ssr', include: ['{layers,apps}/**/*.nuxt-ssr.test.ts'], ssr: true }),
)
