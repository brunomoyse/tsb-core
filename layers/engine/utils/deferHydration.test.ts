// deferHydration: the module scripts and their preloads leave the head and are started by a loader at the end of the body,
// after the first paint. Pure string work on what Nuxt hands to the `render:html` hook.
// Run: `vp test run layers/engine/utils/deferHydration.test.ts`.
import { FALLBACK_MS, type HtmlParts, deferModuleGraph } from './deferHydration'
import { describe, expect, it } from 'vite-plus/test'

const entry = '<script type="module" src="/_nuxt/entry.js" crossorigin></script>'
const messages =
  '<link rel="preload" as="fetch" href="/_i18n/abc/fr/messages.json" crossorigin="anonymous" data-hid="i18n-messages">'
const prefetch = '<link rel="prefetch" as="script" crossorigin href="/_nuxt/later.js">'
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
    messages,
    prefetch,
  ],
  bodyPrepend: [],
  body: ['<div id="__nuxt">content</div>'],
  bodyAppend: ['<script type="application/json" id="__NUXT_DATA__">[]</script>'],
  ...over,
})

interface Added {
  tag: string
  attrs: Record<string, string>
}

/**
 * The loader's script text, evaluated against a minimal browser: which scripts / links it adds, and when. `frame()` runs the
 * pending animation frame callbacks, `tick()` the pending zero-delay timers, `fire('load')` the window's load listeners,
 * `elapse()` the fallback timer.
 */
function runLoader(html: HtmlParts, browser: { hidden: boolean; readyState?: string }) {
  const loader = html.bodyAppend
    .at(-1)!
    .replace(/^<script>/u, '')
    .replace(/<\/script>$/u, '')
  const added: Added[] = []
  const frames: (() => void)[] = []
  const timers: { fn: () => void; ms: number }[] = []
  const listeners: Record<string, (() => void)[]> = {}
  const document = {
    hidden: browser.hidden,
    readyState: browser.readyState ?? 'loading',
    head: {
      appendChild: (e: Added) => added.push(e),
      insertAdjacentHTML: (_where: string, html: string) =>
        added.push({ tag: 'html', attrs: { html } }),
    },
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
  new Function('document', 'requestAnimationFrame', 'setTimeout', 'addEventListener', loader)(
    document,
    (fn: () => void) => frames.push(fn),
    (fn: () => void, ms: number) => timers.push({ fn, ms }),
    (type: string, fn: () => void) => (listeners[type] ??= []).push(fn),
  )
  const drain = (list: (() => void)[]) => {
    list.splice(0).forEach((fn) => fn())
  }
  return {
    added,
    names: () =>
      added
        .filter((e) => e.attrs.html !== '')
        .map((e) =>
          e.tag === 'html'
            ? `html:${e.attrs.html}`
            : `${e.tag}:${e.attrs.rel ?? e.attrs.type}:${e.attrs.href ?? e.attrs.src}`,
        ),
    frame: () => {
      drain(frames)
    },
    tick: () => {
      drain(timers.filter((timer) => timer.ms === 0).map((timer) => timer.fn))
    },
    fire: (type: string) => {
      drain(listeners[type] ?? [])
    },
    elapse: () => timers.find((timer) => timer.ms === FALLBACK_MS)?.fn(),
    pending: () => ({
      frames: frames.length,
      timers: timers.length,
      listeners: Object.keys(listeners),
    }),
  }
}

describe('deferModuleGraph', () => {
  it('takes the entry script and every module preload out of the document and keeps everything else', () => {
    const html = page()
    deferModuleGraph(html)
    const document = Object.values(html).flat().slice(0, -1).join('')
    expect(document).not.toContain('modulepreload')
    expect(document).not.toContain('type="module"')
    expect(document).not.toContain('prefetch')
    expect(document).not.toContain('messages.json')
    expect(html.head).toContain('<link rel="stylesheet" href="/_nuxt/entry.css">')
    expect(html.body).toEqual(['<div id="__nuxt">content</div>'])
    expect(html.bodyAppend[0]).toContain('__NUXT_DATA__')
  })

  it('puts the language file and the prefetch hints in the loader too, in the order they must start', () => {
    const html = page()
    deferModuleGraph(html)
    const loader = html.bodyAppend.at(-1)!
    expect(loader).toContain('/_i18n/abc/fr/messages.json')
    expect(loader).toContain('/_nuxt/later.js')
    // The tags travel as JSON inside a script: no raw tag that could close it.
    expect(loader.slice('<script>'.length, -'</script>'.length)).not.toMatch(/<[/a-z]/u)
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
  const PRELOADS = ['link:modulepreload:/_nuxt/a.js', 'link:modulepreload:/_nuxt/b.js']
  // The second step: the language file, the entry script, then the prefetch hints.
  const STAGE_2 = [`html:${messages}`, 'script:module:/_nuxt/entry.js', `html:${prefetch}`]

  it('adds the preloads after the first frame, and the entry only after the load event and one more frame', () => {
    const run = runLoader(loaderOf(), { hidden: false })
    expect(run.names()).toEqual([])
    run.frame()
    run.tick()
    expect(run.names()).toEqual(PRELOADS)
    // The load event has not come: the page is not hydrated yet.
    run.frame()
    run.tick()
    expect(run.names()).toEqual(PRELOADS)
    run.fire('load')
    expect(run.names()).toEqual(PRELOADS)
    run.frame()
    run.tick()
    expect(run.names()).toEqual([...PRELOADS, ...STAGE_2])
    expect(run.added.filter((e) => e.tag !== 'html').every((e) => e.attrs.crossOrigin === '')).toBe(
      true,
    )
  })

  it('does not wait for a load event that has already happened', () => {
    const run = runLoader(loaderOf(), { hidden: false, readyState: 'complete' })
    expect(run.pending().listeners).toEqual([])
    run.frame()
    run.tick()
    run.frame()
    run.tick()
    expect(run.names()).toEqual([...PRELOADS, ...STAGE_2])
  })

  it('starts everything by itself after the fallback delay when the load event never comes, and only once', () => {
    const run = runLoader(loaderOf(), { hidden: false })
    run.elapse()
    expect(run.names()).toEqual([...PRELOADS, ...STAGE_2])
    // Everything arrives late: nothing is added twice.
    run.frame()
    run.tick()
    run.fire('load')
    run.frame()
    run.tick()
    run.elapse()
    expect(run.added).toHaveLength(5)
  })

  it('starts at once in a background tab, where frames never run', () => {
    const run = runLoader(loaderOf(), { hidden: true })
    expect(run.names()).toEqual([...PRELOADS, ...STAGE_2])
    expect(run.pending()).toEqual({ frames: 0, timers: 0, listeners: [] })
  })
})
