// Setup of the `server` vitest project: Nitro auto-imports the whole of h3 into server code, so a handler may call
// `defineEventHandler`, `setHeader`, `createError`, ... without importing them, and so may it `useRuntimeConfig()` and
// `$fetch(...)`. Expose the same names as globals (the last two are the doubles of test/nitro/imports.ts).
import * as h3 from 'h3'
import { beforeEach } from 'vite-plus/test'
import { $fetch, setRuntimeConfig, useRuntimeConfig } from './imports'

for (const [name, value] of Object.entries(h3)) {
  if (!(name in globalThis)) Object.defineProperty(globalThis, name, { value, configurable: true })
}

Object.defineProperty(globalThis, 'useRuntimeConfig', {
  value: useRuntimeConfig,
  configurable: true,
})
Object.defineProperty(globalThis, '$fetch', { value: $fetch, configurable: true })

beforeEach(() => {
  setRuntimeConfig({ public: {} })
  $fetch.mockReset()
})
