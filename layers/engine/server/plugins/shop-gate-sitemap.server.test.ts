// Nitro plugin: while the shop is off it drops the shop routes from the resolved sitemap; with the shop on it
// registers nothing. Nitro's plugin helper and runtime config are the boundary.
// Run: `vp test run layers/engine/server/plugins/shop-gate-sitemap.server.test.ts`.
import { describe, expect, it, vi } from 'vite-plus/test'

const nitro = vi.hoisted(() => ({ config: {} as Record<string, unknown> }))
vi.mock('nitropack/runtime', () => ({
  defineNitroPlugin: (plugin: (app: unknown) => void) => plugin,
  useRuntimeConfig: () => nitro.config,
}))

const register = async (shopEnabled: unknown) => {
  nitro.config = { public: { shopEnabled } }
  vi.resetModules()
  const plugin = (await import('./shop-gate-sitemap')).default as unknown as (app: unknown) => void
  const hook = vi.fn()
  plugin({ hooks: { hook } })
  return hook
}

describe('shop-gate-sitemap plugin', () => {
  it('registers nothing while the shop is on', async () => {
    expect(await register(true)).not.toHaveBeenCalled()
    expect(await register(undefined)).not.toHaveBeenCalled()
  })

  it('drops the shop routes, as entries or as plain URLs, while the shop is off', async () => {
    const hook = await register(false)
    expect(hook).toHaveBeenCalledExactlyOnceWith('sitemap:resolved', expect.any(Function))
    const ctx = {
      urls: [
        { loc: 'https://ygfliege.be/fr' },
        { loc: 'https://ygfliege.be/fr/menu' },
        { loc: '/en/menu' },
        'https://ygfliege.be/nl/menu',
        { loc: 'https://ygfliege.be/fr/concept' },
        '/fr/contact',
        {},
      ],
    }
    hook.mock.calls[0]![1](ctx)
    expect(ctx.urls).toEqual([
      { loc: 'https://ygfliege.be/fr' },
      { loc: 'https://ygfliege.be/fr/concept' },
      '/fr/contact',
      {},
    ])
  })
})
