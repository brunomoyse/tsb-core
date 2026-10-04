import { fileURLToPath } from 'node:url'
import { runtimeFlagsPlugin } from './flags'

// Options of the Nuxt-environment vitest projects (vitest.nuxt.config.ts, vitest.nuxt-ygfliege.config.ts).
// They boot the real Nuxt app of a brand (layers, aliases, auto-imports, Pinia, i18n) through @nuxt/test-utils.

// A production `nuxt build` insists on these (layers/engine/nuxt.config.ts); the test environment gets harmless
// brand-neutral values so that `vp test run` needs no setup. They are FORCED, not defaults: a developer's exported
// BASE_URL or an `apps/*/.env` must not change what the tests see. Tests that need a value read it from
// `useRuntimeConfig()` or set their own.
export const testEnv: Record<string, string> = {
  BASE_URL: 'https://shop.test',
  API_BASE_URL: 'https://api.shop.test/api/v1',
  S3_BUCKET_URL: 'https://s3.shop.test',
  GRAPHQL_WS_URL: 'wss://api.shop.test/api/v1/graphql',
  ZITADEL_AUTHORITY: 'https://auth.shop.test',
  ZITADEL_CLIENT_ID: 'unit-test-client-id',
}
Object.assign(process.env, testEnv)

export type BrandApp = 'tokyosushi' | 'ygfliege'

// The Nuxt app boots as a client (`import.meta.client`, not dev); a test flips the flags of the app's own sources with
// `setFlags` (test/flags.ts) to reach server-only or dev-only branches.
export function nuxtProject(options: {
  name: string
  app: BrandApp
  include: string[]
  exclude?: string[]
}) {
  return {
    plugins: [runtimeFlagsPlugin({ server: false, client: true, dev: false })],
    test: {
      name: options.name,
      environment: 'nuxt' as const,
      include: options.include,
      exclude: ['**/node_modules/**', '**/.nuxt/**', '**/.output/**', ...(options.exclude ?? [])],
      setupFiles: [
        fileURLToPath(new URL('./setup/noNetwork.ts', import.meta.url)),
        fileURLToPath(new URL('./setup/flags.ts', import.meta.url)),
        fileURLToPath(new URL('./setup/vue.ts', import.meta.url)),
      ],
      unstubGlobals: true,
      unstubEnvs: true,
      restoreMocks: true,
      environmentOptions: {
        nuxt: { rootDir: `./apps/${options.app}`, domEnvironment: 'happy-dom' as const },
      },
    },
  }
}
