// Setup of the `server` vitest project: Nitro auto-imports the whole of h3 into server code, so a handler may call
// `defineEventHandler`, `setHeader`, `createError`, ... without importing them. Expose the same names as globals.
import * as h3 from 'h3'
import { beforeEach } from 'vitest'
import { setRuntimeConfig } from './imports'

for (const [name, value] of Object.entries(h3)) {
  if (!(name in globalThis)) Object.defineProperty(globalThis, name, { value, configurable: true })
}

beforeEach(() => {
  setRuntimeConfig({ public: {} })
})
