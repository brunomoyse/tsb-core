// Nitro plugin: in production it registers a `render:html` hook that defers the module graph (utils/deferHydration.ts);
// in dev it registers nothing. Nitro's plugin helper is the boundary.
// Run: `vp test run layers/engine/server/plugins/defer-hydration.server.test.ts`.
import { describe, expect, it, vi } from 'vite-plus/test'
import { setFlags } from '../../../../test/flags'

vi.mock('nitropack/runtime', () => ({
  defineNitroPlugin: (plugin: (app: unknown) => void) => plugin,
}))

const load = async () => {
  vi.resetModules()
  return (await import('./defer-hydration')).default as unknown as (app: unknown) => void
}
const nitroApp = () => {
  const hook = vi.fn()
  return { hook, app: { hooks: { hook } } }
}

describe('defer-hydration plugin', () => {
  it('registers a render:html hook that moves the module scripts to the end of the body', async () => {
    const plugin = await load()
    const { hook, app } = nitroApp()
    plugin(app)
    expect(hook).toHaveBeenCalledExactlyOnceWith('render:html', expect.any(Function))
    const html = {
      head: ['<script type="module" src="/_nuxt/e.js"></script>'],
      bodyPrepend: [],
      body: [],
      bodyAppend: [],
    }
    hook.mock.calls[0]![1](html)
    expect(html.head).toEqual([])
    expect(html.bodyAppend).toHaveLength(1)
    expect(html.bodyAppend[0]).toContain('/_nuxt/e.js')
  })

  it('registers nothing in development', async () => {
    setFlags({ dev: true })
    const plugin = await load()
    const { hook, app } = nitroApp()
    plugin(app)
    expect(hook).not.toHaveBeenCalled()
  })
})
