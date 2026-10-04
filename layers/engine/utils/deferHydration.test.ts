// deferHydration: the module scripts and their preloads leave the head and are started by a loader at the end of the body,
// after the first paint. Pure string work on what Nuxt hands to the `render:html` hook.
// Run: `vp test run layers/engine/utils/deferHydration.test.ts`.
import { FALLBACK_MS, type HtmlParts, deferModuleGraph } from './deferHydration'
import { describe, expect, it } from 'vite-plus/test'

const entry = '<script type="module" src="/_nuxt/entry.js" crossorigin></script>'
const preload = (name: string) =>
  `<link rel="modulepreload" as="script" crossorigin href="/_nuxt/${name}.js">`

const page = (over: Partial<HtmlParts> = {}): HtmlParts => ({
  head: [
    '<meta charset="utf-8">',
    '<link rel="stylesheet" href="/_nuxt/entry.css">',
    preload('entry'),
    preload('a'),
    preload('b'),
    entry,
    '<link rel="prefetch" as="script" crossorigin href="/_nuxt/later.js">',
  ],
  bodyPrepend: [],
  body: ['<div id="__nuxt">content</div>'],
  bodyAppend: ['<script type="application/json" id="__NUXT_DATA__">[]</script>'],
  ...over,
})

/** The loader's script text, evaluated against a minimal browser: which scripts / links it adds, and when. */
function runLoader(html: HtmlParts, browser: { hidden: boolean }) {
  const loader = html.bodyAppend
    .at(-1)!
    .replace(/^<script>/u, '')
    .replace(/<\/script>$/u, '')
  const added: { tag: string; attrs: Record<string, string> }[] = []
  const frames: (() => void)[] = []
  const timers: { fn: () => void; ms: number }[] = []
  const document = {
    hidden: browser.hidden,
    head: { appendChild: (e: { tag: string; attrs: Record<string, string> }) => added.push(e) },
    createElement: (tag: string) => {
      const attrs: Record<string, string> = {}
      return new Proxy({ tag, attrs } as Record<string, unknown>, {
        set: (target, key, value) => {
          attrs[String(key)] = String(value)
          return Reflect.set(target, key, value)
        },
      })
    },
  }
  new Function('document', 'requestAnimationFrame', 'setTimeout', loader)(
    document,
    (fn: () => void) => frames.push(fn),
    (fn: () => void, ms: number) => timers.push({ fn, ms }),
  )
  return { added, frames, timers }
}

describe('deferModuleGraph', () => {
  it('takes the entry script and every module preload out of the document and keeps everything else', () => {
    const html = page()
    deferModuleGraph(html)
    const document = Object.values(html).flat().slice(0, -1).join('')
    expect(document).not.toContain('modulepreload')
    expect(document).not.toContain('type="module"')
    expect(html.head).toContain('<link rel="stylesheet" href="/_nuxt/entry.css">')
    expect(html.head).toContain(
      '<link rel="prefetch" as="script" crossorigin href="/_nuxt/later.js">',
    )
    expect(html.body).toEqual(['<div id="__nuxt">content</div>'])
    expect(html.bodyAppend[0]).toContain('__NUXT_DATA__')
  })

  it('adds one loader last in the body that carries the entry and the other preloads (not the entry twice)', () => {
    const html = page()
    deferModuleGraph(html)
    expect(html.bodyAppend).toHaveLength(2)
    const loader = html.bodyAppend[1]!
    expect(loader).toContain('["/_nuxt/a.js","/_nuxt/b.js"]')
    expect(loader).toContain('["/_nuxt/entry.js"]')
    expect(loader.match(/\/_nuxt\/entry\.js/gu)).toHaveLength(1)
  })

  it('finds the scripts wherever Nuxt put them', () => {
    const html = page({ head: [], bodyAppend: [preload('a'), entry] })
    deferModuleGraph(html)
    expect(html.bodyAppend).toHaveLength(1)
    expect(html.bodyAppend[0]).toContain('["/_nuxt/a.js"]')
  })

  it('leaves a page without a module script exactly as it was', () => {
    const html = page({ head: [preload('a'), '<meta charset="utf-8">'] })
    const before = structuredClone(html)
    deferModuleGraph(html)
    expect(html).toEqual(before)
  })

  it('ignores a modulepreload that has no href', () => {
    const html = page({ head: ['<link rel="modulepreload">', entry] })
    deferModuleGraph(html)
    expect(html.bodyAppend.at(-1)).toContain('P=[]')
  })

  it('also handles several entries', () => {
    const html = page({
      head: [
        '<script type="module" src="/a.js"></script>',
        '<script type="module" src="/b.js"></script>',
      ],
    })
    deferModuleGraph(html)
    expect(html.bodyAppend.at(-1)).toContain('["/a.js","/b.js"]')
  })
})

describe('the loader', () => {
  const loaderOf = () => {
    const html = page()
    deferModuleGraph(html)
    return html
  }

  it('waits for the first frame and a task after it, then adds the preloads and the entry as a module script', () => {
    const { added, frames, timers } = runLoader(loaderOf(), { hidden: false })
    expect(added).toEqual([])
    expect(frames).toHaveLength(1)
    frames[0]!()
    // The task after the frame.
    expect(timers.map((timer) => timer.ms)).toEqual([FALLBACK_MS, 0])
    timers.find((timer) => timer.ms === 0)!.fn()
    expect(
      added.map((e) => `${e.tag}:${e.attrs.rel ?? e.attrs.type}:${e.attrs.href ?? e.attrs.src}`),
    ).toEqual([
      'link:modulepreload:/_nuxt/a.js',
      'link:modulepreload:/_nuxt/b.js',
      'script:module:/_nuxt/entry.js',
    ])
    expect(added.every((e) => e.attrs.crossOrigin === '')).toBe(true)
  })

  it('starts by itself after the fallback delay when no frame ever comes, and only once', () => {
    const { added, frames, timers } = runLoader(loaderOf(), { hidden: false })
    timers.find((timer) => timer.ms === FALLBACK_MS)!.fn()
    expect(added).toHaveLength(3)
    // The frame arrives late: nothing is added twice.
    frames[0]!()
    for (const timer of timers) timer.fn()
    expect(added).toHaveLength(3)
  })

  it('starts at once in a background tab, where frames never run', () => {
    const { added, frames, timers } = runLoader(loaderOf(), { hidden: true })
    expect(added).toHaveLength(3)
    expect(frames).toHaveLength(0)
    expect(timers).toHaveLength(0)
  })
})
