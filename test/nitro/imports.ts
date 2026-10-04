// Stand-in for Nitro's `#imports` in the `server` vitest project (see vite.config.ts): what a server handler gets from
// Nitro's auto-imports at runtime. The h3 helpers (defineEventHandler, setHeader, ...) are globals (test/nitro/setup.ts).
import { vi } from 'vite-plus/test'

type RuntimeConfig = Record<string, unknown> & { public: Record<string, unknown> }

let runtimeConfig: RuntimeConfig = { public: {} }

/** Replaces the runtime config the handler under test reads with `useRuntimeConfig()`. */
export function setRuntimeConfig(
  config: Partial<RuntimeConfig> & { public?: Record<string, unknown> },
) {
  runtimeConfig = { ...config, public: config.public ?? {} }
}

export const useRuntimeConfig = (_event?: unknown): RuntimeConfig => runtimeConfig

/**
 * Nitro's auto-imported `$fetch` (global in handlers). It refuses by default: a handler that calls out must be given
 * its answer with `$fetch.mockResolvedValue(...)`. Reset before every test (test/nitro/setup.ts).
 */
export const $fetch = vi.fn((url: unknown, _options?: unknown): Promise<unknown> => {
  throw new Error(`Unmocked $fetch in a server test: ${String(url)}`)
})
