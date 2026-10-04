// Nitro plugin: in production it registers a `render:html` hook that applies utils/deferHydration.ts to the page (the
// reduced variant, or the full deferral when the runtime config `deferHydration` is on); in dev it registers nothing.
// Nitro's plugin helper and runtime config are the boundary. The HTML below has the shape Nuxt renders.
// Run: `vp test run layers/engine/server/plugins/defer-hydration.server.test.ts`.
import { describe, expect, it, vi } from 'vite-plus/test'
import { setFlags } from '../../../../test/flags'

const nitro = vi.hoisted(() => ({ config: {} as Record<string, unknown> }))
vi.mock('nitropack/runtime', () => ({
  defineNitroPlugin: (plugin: (app: unknown) => void) => plugin,
  useRuntimeConfig: () => nitro.config,
}))

const load = async () => {
  vi.resetModules()
  return (await import('./defer-hydration')).default as unknown as (app: unknown) => void
}

/** Registers the plugin and returns what the hook does to a page. */
const render = async (config: Record<string, unknown> = {}) => {
  nitro.config = config
  const plugin = await load()
  const hook = vi.fn()
  plugin({ hooks: { hook } })
  expect(hook).toHaveBeenCalledExactlyOnceWith('render:html', expect.any(Function))
  const html = {
    head: [
      '<meta charset="utf-8">',
      '<link rel="stylesheet" href="/_nuxt/entry.css">',
      '<link rel="modulepreload" as="script" crossorigin href="/_nuxt/entry.js">',
      '<link rel="modulepreload" as="script" crossorigin href="/_nuxt/menu.js">',
      '<link rel="preload" as="fetch" crossorigin="anonymous" href="/_i18n/abc/fr/messages.json">',
      '<link rel="prefetch" as="script" crossorigin href="/_nuxt/cart.js">',
      '<script type="module" src="/_nuxt/entry.js" crossorigin></script>',
    ],
    bodyPrepend: [],
    body: ['<div id="__nuxt">content</div>'],
    bodyAppend: ['<script type="application/json" id="__NUXT_DATA__">[]</script>'],
  }
  hook.mock.calls[0]![1](html)
  return html
}
const document = (html: Awaited<ReturnType<typeof render>>) =>
  [...html.head, ...html.bodyPrepend, ...html.body, ...html.bodyAppend].join('')

describe('defer-hydration plugin', () => {
  it('ships the reduced variant by default: entry script and modulepreloads stay in the head', async () => {
    const html = await render()
    expect(html.head.filter((tag) => tag.includes('type="module"'))).toHaveLength(1)
    expect(html.head).toContain(
      '<link rel="modulepreload" as="script" crossorigin href="/_nuxt/entry.js">',
    )
    expect(html.head).toContain(
      '<link fetchpriority="low" rel="modulepreload" as="script" crossorigin href="/_nuxt/menu.js">',
    )
    // The language file and the prefetch hints are in the one loader, not in the document.
    expect(html.head.join('')).not.toMatch(/prefetch|messages\.json/u)
    expect(html.bodyAppend).toHaveLength(2)
    expect(html.bodyAppend[0]).toContain('__NUXT_DATA__')
    expect(html.bodyAppend[1]).toContain('messages.json')
    expect(html.bodyAppend[1]).toContain('/_nuxt/cart.js')
    expect(document(html).match(/<script>/gu)).toHaveLength(1)
  })

  it('the full deferral is off unless the runtime config turns it on', async () => {
    expect((await render({ deferHydration: false })).head.join('')).toContain('type="module"')
    expect((await render({ deferHydration: 'false' })).head.join('')).toContain('type="module"')
  })

  it('moves the entry script and every preload to the loader in full mode (NUXT_DEFER_HYDRATION=true)', async () => {
    for (const flag of [true, 'true', '1']) {
      const html = await render({ deferHydration: flag })
      expect(html.head).toEqual([
        '<meta charset="utf-8">',
        '<link rel="stylesheet" href="/_nuxt/entry.css">',
      ])
      expect(html.body).toEqual(['<div id="__nuxt">content</div>'])
      expect(html.bodyAppend).toHaveLength(2)
      expect(html.bodyAppend[0]).toContain('__NUXT_DATA__')
      const loader = html.bodyAppend[1]!
      expect(loader).toContain('["/_nuxt/menu.js"]')
      expect(loader).toContain('["/_nuxt/entry.js"]')
      expect(loader).toContain('messages.json')
      expect(html.head.join('') + html.body.join('')).not.toMatch(/type="module"|modulepreload/u)
    }
  })

  it('registers nothing in development', async () => {
    setFlags({ dev: true })
    nitro.config = {}
    const plugin = await load()
    const hook = vi.fn()
    plugin({ hooks: { hook } })
    expect(hook).not.toHaveBeenCalled()
  })
})
