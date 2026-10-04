import { defineVitestConfig } from '@nuxt/test-utils/config'
import { nuxtProject } from './test/nuxtProject'

// The same environment as vitest.nuxt.config.ts, booted from apps/ygfliege: its brand data, app config, i18n
// overrides and plugins are the real ones. For `apps/ygfliege/**` and for any `*.ygfliege.nuxt.test.ts` next to
// engine code that behaves differently for this brand.
export default defineVitestConfig(
  nuxtProject({
    name: 'nuxt-ygfliege',
    app: 'ygfliege',
    include: ['apps/ygfliege/**/*.nuxt.test.ts', '{layers,apps}/**/*.ygfliege.nuxt.test.ts'],
  }),
)
