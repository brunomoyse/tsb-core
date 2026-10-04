// Shared options of the two Nuxt-environment vitest projects (vitest.nuxt.config.ts, vitest.nuxt-ssr.config.ts).
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

// Compiles the app's own sources (layers/, apps/) as the server bundle sees them, while Nuxt itself keeps booting as
// A client app: defining `import.meta.server` globally would make Nuxt create its server app, which needs an SSR context.
const root = new URL('..', import.meta.url).pathname
const ssrFlags = {
  name: 'tsb:test-ssr-flags',
  enforce: 'pre' as const,
  transform(code: string, id: string) {
    const file = id.split('?')[0]
    if (!file.startsWith(root) || file.includes('/node_modules/') || file.includes('/.nuxt/'))
      return
    if (!/import\.meta\.(server|client)/u.test(code)) return
    return code
      .replaceAll(/import\.meta\.server\b/gu, 'true')
      .replaceAll(/import\.meta\.client\b/gu, 'false')
  },
}

export function nuxtProject(options: {
  name: string
  include: string[]
  /** Evaluate `import.meta.server` as true and `import.meta.client` as false in the app's own sources. */
  ssr?: boolean
}) {
  return {
    ...(options.ssr ? { plugins: [ssrFlags] } : {}),
    test: {
      name: options.name,
      environment: 'nuxt' as const,
      include: options.include,
      environmentOptions: {
        nuxt: { rootDir: './apps/tokyosushi', domEnvironment: 'happy-dom' as const },
      },
    },
  }
}
