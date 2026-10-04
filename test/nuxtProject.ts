import { fileURLToPath } from 'node:url'
import { runtimeFlagsPlugin } from './flags'

// Options of the Nuxt-environment vitest project (vitest.nuxt.config.ts).
// They boot the real Nuxt app of apps/tokyosushi (layers, aliases, auto-imports, Pinia, i18n) through @nuxt/test-utils.

// A production `nuxt build` insists on these (layers/engine/nuxt.config.ts); the test environment gets harmless
// Defaults so that `vp test run` needs no setup, and a developer's own values still win.
const env: Record<string, string> = {
  BASE_URL: 'https://tokyosushi.test',
  API_BASE_URL: 'https://api.tokyosushi.test/api/v1',
  S3_BUCKET_URL: 'https://s3.tokyosushi.test',
  GRAPHQL_WS_URL: 'wss://api.tokyosushi.test/api/v1/graphql',
  ZITADEL_AUTHORITY: 'https://auth.tokyosushi.test',
  ZITADEL_CLIENT_ID: 'unit-test-client-id',
}
for (const [key, value] of Object.entries(env)) process.env[key] ??= value

// The Nuxt app boots as a client (`import.meta.client`, not dev); a test flips the flags of the app's own sources with
// `setFlags` (test/flags.ts) to reach server-only or dev-only branches.
export function nuxtProject(options: { name: string; include: string[] }) {
  return {
    plugins: [runtimeFlagsPlugin({ server: false, client: true, dev: false })],
    test: {
      name: options.name,
      environment: 'nuxt' as const,
      include: options.include,
      setupFiles: [
        fileURLToPath(new URL('./setup/noNetwork.ts', import.meta.url)),
        fileURLToPath(new URL('./setup/flags.ts', import.meta.url)),
      ],
      environmentOptions: {
        nuxt: { rootDir: './apps/tokyosushi', domEnvironment: 'happy-dom' as const },
      },
    },
  }
}
