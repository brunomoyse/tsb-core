// Build-time flags of the app's own sources (`import.meta.server`, `import.meta.client`, `import.meta.dev`) made switchable
// Per test. Nuxt/Nitro replace them with constants at build time, which would leave one side of every
// `if (import.meta.server)` unreachable from a test. In the vitest projects, the sources of layers/ and apps/ are rewritten so
// That each flag reads `globalThis.tsbTestFlags` first, falling back to the project's default (see vite.config.ts):
//
//   Import { setFlags } from '<repo>/test/flags'
//   SetFlags({ server: true })   // this test runs "on the server"; reset automatically after each test
import type { Plugin } from 'vite'

export interface RuntimeFlags {
  server: boolean
  client: boolean
  dev: boolean
}

declare global {
  // oxlint-disable-next-line no-var -- a global declaration cannot be `let`/`const`.
  var tsbTestFlags: Partial<RuntimeFlags> | undefined
}

/** Sets flags for the current test; `server: true` also means `client: false` unless said otherwise. */
export function setFlags(flags: Partial<RuntimeFlags>) {
  const derived = flags.server === undefined ? {} : { client: !flags.server }
  globalThis.tsbTestFlags = { ...globalThis.tsbTestFlags, ...derived, ...flags }
}

export function resetFlags() {
  globalThis.tsbTestFlags = undefined
}

const root = new URL('..', import.meta.url).pathname
const FLAG = /import\.meta\.(?<flag>server|client|dev)\b/gu
const HAS_FLAG = /import\.meta\.(?:server|client|dev)\b/u

/** Vite plugin: rewrites the flags in the app's own sources (not node_modules, not generated code). */
export function runtimeFlagsPlugin(defaults: RuntimeFlags): Plugin {
  return {
    name: 'tsb:test-runtime-flags',
    enforce: 'pre',
    transform(code, id) {
      const file = id.split('?')[0]
      if (!file.startsWith(root) || file.includes('/node_modules/') || file.includes('/.nuxt/'))
        return null
      if (!/\.(?:ts|mts|js|mjs|vue)$/u.test(file) || !HAS_FLAG.test(code)) return null
      return code.replaceAll(
        FLAG,
        (_match, flag: keyof RuntimeFlags) =>
          `(globalThis.tsbTestFlags?.${flag} ?? ${defaults[flag]})`,
      )
    },
  }
}
