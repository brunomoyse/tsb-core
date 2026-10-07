// Polyfills plugin: runs before every other plugin and installs the missing built-ins.
// Run: `vp test run layers/engine/plugins/polyfills.client.nuxt.test.ts`.
import { describe, expect, it, vi } from 'vite-plus/test'

const polyfills = vi.hoisted(() => ({ installPolyfills: vi.fn() }))
vi.mock('#engine/utils/polyfills', () => polyfills)

const { default: plugin } = await import('./polyfills.client')

describe('polyfills plugin', () => {
  it('runs first, before Sentry (-40), and installs the polyfills', async () => {
    const meta = plugin as unknown as { order: number; setup: () => unknown }
    expect(meta.order).toBeLessThan(-40)
    await meta.setup()
    expect(polyfills.installPolyfills).toHaveBeenCalledOnce()
  })
})
