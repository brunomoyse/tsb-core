// deferHydration: by default the entry script and the modulepreloads stay in the head (the preloads of the other chunks at
// low priority) and only the language file and the prefetch hints wait for the first frame; in full mode the module scripts
// leave the head too and a loader starts them. Pure string work on what Nuxt hands to the `render:html` hook.
// Run: `vp test run layers/engine/utils/deferHydration.test.ts`.
import { FALLBACK_MS, type HtmlParts, deferModuleGraph } from './deferHydration'
import { describe, expect, it } from 'vite-plus/test'

const entry = '<script type="module" src="/_nuxt/entry.js" crossorigin></script>'
const messages =
  '<link rel="preload" as="fetch" href="/_i18n/abc/fr/messages.json" crossorigin="anonymous" data-hid="i18n-messages">'
const prefetch = '<link rel="prefetch" as="script" crossorigin href="/_nuxt/later.js">'
const preload = (name: string) =>
  `<link rel="modulepreload" as="script" crossorigin href="/_nuxt/${name}.js">`
const low = (name: string) => preload(name).replace('<link', '<link fetchpriority="low"')

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
 * The loader's script text, evaluated against a minimal browser: which scripts / links / tags it adds. `frame()` runs the
 * pending animation frame callbacks, `tick()` the pending zero-delay timers, `elapse()` the fallback timer.
 */
function runLoader(html: HtmlParts, browser: { hidden: boolean }) {
  const loader = html.bodyAppend
    .at(-1)!
    .replace(/^<script>/u, '')
    .replace(/<\/script>$/u, '')
  const added: Added[] = []
  const frames: (() => void)[] = []
  const timers: { fn: () => void; ms: number }[] = []
  const document = {
    hidden: browser.hidden,
    head: {
      appendChild: (e: Added) => added.push(e),
      insertAdjacentHTML: (_where: string, markup: string) =>
        added.push({ tag: 'html', attrs: { html: markup } }),
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
  new Function('document', 'requestAnimationFrame', 'setTimeout', loader)(
    document,
    (fn: () => void) => frames.push(fn),
    (fn: () => void, ms: number) => timers.push({ fn, ms }),
  )
  const drain = (list: (() => void)[]) => {
    list.splice(0).forEach((fn) => {
      fn()
    })
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
    elapse: () => timers.find((timer) => timer.ms === FALLBACK_MS)?.fn(),
    pending: () => ({ frames: frames.length, timers: timers.length }),
  }
}

describe('deferModuleGraph (reduced, the default)', () => {
  it('keeps the entry script and every module preload in the head, the other preloads at low priority', () => {
    const html = page()
    deferModuleGraph(html)
    expect(html.head).toContain(entry)
    // The entry's own preload keeps the default priority: it is what the page needs first.
    expect(html.head).toContain(preload('entry'))
    expect(html.head).toContain(low('a'))
    expect(html.head).toContain(low('b'))
    expect(html.head.filter((tag) => tag.includes('modulepreload'))).toHaveLength(3)
    expect(html.head).toContain('<link rel="stylesheet" href="/_nuxt/entry.css">')
    expect(html.body).toEqual(['<div id="__nuxt">content</div>'])
    expect(html.bodyAppend[0]).toContain('__NUXT_DATA__')
  })

  it('does not touch the priority a preload already has', () => {
    const own = '<link rel="modulepreload" as="script" fetchpriority="high" href="/_nuxt/a.js">'
    const html = page({ head: [own, entry] })
    deferModuleGraph(html)
    expect(html.head).toEqual([own, entry])
  })

  it('moves only the language file and the prefetch hints into a loader at the end of the body', () => {
    const html = page()
    deferModuleGraph(html)
    const document = Object.values(html).flat().slice(0, -1).join('')
    expect(document).not.toContain('prefetch')
    expect(document).not.toContain('messages.json')
    expect(html.bodyAppend).toHaveLength(2)
    const loader = html.bodyAppend[1]!
    expect(loader).toContain('/_i18n/abc/fr/messages.json')
    expect(loader).toContain('/_nuxt/later.js')
    // Neither the entry nor a preload travels in it.
    expect(loader).not.toContain('modulepreload')
    expect(loader).not.toContain('/_nuxt/entry.js')
    // The tags travel as JSON inside a script: no raw tag that could close it.
    expect(loader.slice('<script>'.length, -'</script>'.length)).not.toMatch(/<[/a-z]/u)
  })

  it('adds no loader when there is nothing to hold back', () => {
    const html = page({ head: [preload('entry'), entry] })
    deferModuleGraph(html)
    expect(html.bodyAppend).toHaveLength(1)
    expect(html.head).toEqual([preload('entry'), entry])
  })

  it('finds the scripts wherever Nuxt put them', () => {
    const html = page({ head: [], bodyAppend: [preload('a'), entry, prefetch] })
    deferModuleGraph(html)
    expect(html.bodyAppend.slice(0, 2)).toEqual([low('a'), entry])
    expect(html.bodyAppend).toHaveLength(3)
  })

  it('leaves a page without a module script exactly as it was', () => {
    const html = page({ head: [preload('a'), prefetch, '<meta charset="utf-8">'] })
    const before = structuredClone(html)
    deferModuleGraph(html)
    expect(html).toEqual(before)
  })

  it('ignores a modulepreload that has no href (it is only marked low priority)', () => {
    const html = page({ head: ['<link rel="modulepreload">', entry] })
    deferModuleGraph(html)
    expect(html.head[0]).toBe('<link fetchpriority="low" rel="modulepreload">')
  })
})

describe('deferModuleGraph (full)', () => {
  it('takes the entry script and every module preload out of the document and keeps everything else', () => {
    const html = page()
    deferModuleGraph(html, { full: true })
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
    deferModuleGraph(html, { full: true })
    const loader = html.bodyAppend.at(-1)!
    expect(loader).toContain('/_i18n/abc/fr/messages.json')
    expect(loader).toContain('/_nuxt/later.js')
    // The tags travel as JSON inside a script: no raw tag that could close it.
    expect(loader.slice('<script>'.length, -'</script>'.length)).not.toMatch(/<[/a-z]/u)
  })

  it('adds one loader last in the body that carries the entry and the other preloads (not the entry twice)', () => {
    const html = page()
    deferModuleGraph(html, { full: true })
    expect(html.bodyAppend).toHaveLength(2)
    const loader = html.bodyAppend[1]!
    expect(loader).toContain('["/_nuxt/a.js","/_nuxt/b.js"]')
    expect(loader).toContain('["/_nuxt/entry.js"]')
    expect(loader.match(/\/_nuxt\/entry\.js/gu)).toHaveLength(1)
  })

  it('finds the scripts wherever Nuxt put them', () => {
    const html = page({ head: [], bodyAppend: [preload('a'), entry] })
    deferModuleGraph(html, { full: true })
    expect(html.bodyAppend).toHaveLength(1)
    expect(html.bodyAppend[0]).toContain('["/_nuxt/a.js"]')
  })

  it('leaves a page without a module script exactly as it was', () => {
    const html = page({ head: [preload('a'), '<meta charset="utf-8">'] })
    const before = structuredClone(html)
    deferModuleGraph(html, { full: true })
    expect(html).toEqual(before)
  })

  it('ignores a modulepreload that has no href', () => {
    const html = page({ head: ['<link rel="modulepreload">', entry] })
    deferModuleGraph(html, { full: true })
    expect(html.bodyAppend.at(-1)).toContain('P=[]')
  })

  it('also handles several entries', () => {
    const html = page({
      head: [
        '<script type="module" src="/a.js"></script>',
        '<script type="module" src="/b.js"></script>',
      ],
    })
    deferModuleGraph(html, { full: true })
    expect(html.bodyAppend.at(-1)).toContain('["/a.js","/b.js"]')
  })
})

describe('the reduced loader', () => {
  const loaderOf = () => {
    const html = page()
    deferModuleGraph(html)
    return html
  }
  const HINTS = [`html:${messages}${prefetch}`]

  it('adds nothing before the first frame, then the language file and the hints after the frame and a task', () => {
    const run = runLoader(loaderOf(), { hidden: false })
    expect(run.names()).toEqual([])
    run.frame()
    expect(run.names()).toEqual([])
    run.tick()
    expect(run.names()).toEqual(HINTS)
  })

  it('starts by itself after the fallback delay when no frame comes, and only once', () => {
    const run = runLoader(loaderOf(), { hidden: false })
    run.elapse()
    expect(run.names()).toEqual(HINTS)
    run.frame()
    run.tick()
    run.elapse()
    expect(run.added).toHaveLength(1)
  })

  it('starts at once in a background tab, where frames never run', () => {
    const run = runLoader(loaderOf(), { hidden: true })
    expect(run.names()).toEqual(HINTS)
    expect(run.pending()).toEqual({ frames: 0, timers: 0 })
  })
})

describe('the full loader', () => {
  const loaderOf = () => {
    const html = page()
    deferModuleGraph(html, { full: true })
    return html
  }
  // Everything in the order it must start: the language file, the preloads, the entry script, the prefetch hints.
  const EVERYTHING = [
    `html:${messages}`,
    'link:modulepreload:/_nuxt/a.js',
    'link:modulepreload:/_nuxt/b.js',
    'script:module:/_nuxt/entry.js',
    `html:${prefetch}`,
  ]

  it('adds nothing before the first frame, then everything, in order, after the frame and a task', () => {
    const run = runLoader(loaderOf(), { hidden: false })
    expect(run.names()).toEqual([])
    run.frame()
    expect(run.names()).toEqual([])
    run.tick()
    expect(run.names()).toEqual(EVERYTHING)
    expect(run.added.filter((e) => e.tag !== 'html').every((e) => e.attrs.crossOrigin === '')).toBe(
      true,
    )
  })

  it('starts everything by itself after the fallback delay when no frame comes, and only once', () => {
    const run = runLoader(loaderOf(), { hidden: false })
    run.elapse()
    expect(run.names()).toEqual(EVERYTHING)
    // The frame arrives late: nothing is added twice.
    run.frame()
    run.tick()
    run.elapse()
    expect(run.added).toHaveLength(5)
  })

  it('starts at once in a background tab, where frames never run', () => {
    const run = runLoader(loaderOf(), { hidden: true })
    expect(run.names()).toEqual(EVERYTHING)
    expect(run.pending()).toEqual({ frames: 0, timers: 0 })
  })
})
