/*
 * Starts the page's JavaScript after the first paint instead of with the HTML (audit: Lighthouse 100).
 *
 * The server renders every page in full, so the browser can paint it without any script. Nuxt nevertheless puts one
 * `<script type="module">` and ~70 `<link rel="modulepreload">` in the head: the scripts then download in parallel with the
 * stylesheet, the fonts and the hero image (on a slow phone connection they take the bandwidth the first paint needs) and
 * their evaluation, which hydrates the page, runs before the first frame, in front of the largest image. This takes both
 * out of the head and puts a few lines at the end of the body that start them in two steps:
 *   1. after the first rendering opportunity (requestAnimationFrame, then a task): the preloads, so the scripts download;
 *   2. after the window's load event (the images of the first screen are in) and one more frame: the language file the
 *      app is about to fetch (its `<link rel="preload" as="fetch">`), the entry script, so the page hydrates once everything
 *      the visitor sees has painted, and the `<link rel="prefetch">` hints for the pages' other chunks.
 * The page paints first, hydrates a moment later, and works the same afterwards. Nothing that is not needed for the first
 * paint is requested before it: the browser's hints for later (prefetch, the language file) only compete with the
 * stylesheet and the first image otherwise.
 *
 * Fallbacks, so that hydration can never be stuck: a background tab never runs requestAnimationFrame (it starts at once),
 * and a timer starts everything anyway after FALLBACK_MS (a load event held up by a slow third party).
 */

export const FALLBACK_MS = 3000

/** The parts of the document Nuxt hands to the `render:html` hook (all of them are lists of HTML strings). */
export interface HtmlParts {
  head: string[]
  bodyPrepend: string[]
  body: string[]
  bodyAppend: string[]
}

const PARTS = ['head', 'bodyPrepend', 'body', 'bodyAppend'] as const
const MODULE_PRELOAD = /<link\b[^>]*\brel="modulepreload"[^>]*>/gu
const MODULE_ENTRY = /<script\b[^>]*\btype="module"[^>]*\bsrc="([^"]+)"[^>]*>\s*<\/script>/gu
const HREF = /\bhref="([^"]+)"/u
const FETCH_PRELOAD = /<link\b[^>]*\brel="preload"[^>]*\bas="fetch"[^>]*>/gu
const PREFETCH = /<link\b[^>]*\brel="prefetch"[^>]*>/gu

interface Deferred {
  preloads: string[]
  entries: string[]
  /** Tags to add just before the entry script (HTML), and after it. */
  before: string[]
  after: string[]
}

// JSON for an inline script: `<` is escaped so that no value can ever contain `</script>`.
const json = (value: unknown): string => JSON.stringify(value).replace(/</gu, '\\u003c')

const loader = ({ preloads, entries, before, after }: Deferred): string =>
  `<script>(function(){var P=${json(preloads)},E=${json(entries)},B=${json(before.join(''))},A=${json(after.join(''))},a=0,b=0,h=document.head;` +
  `function pre(){if(a)return;a=1;for(var i=0,e;i<P.length;i++){e=document.createElement("link");e.rel="modulepreload";e.crossOrigin="";e.href=P[i];h.appendChild(e)}}` +
  `function run(){if(b)return;b=1;pre();h.insertAdjacentHTML("beforeend",B);for(var i=0,e;i<E.length;i++){e=document.createElement("script");e.type="module";e.crossOrigin="";e.src=E[i];h.appendChild(e)}h.insertAdjacentHTML("beforeend",A)}` +
  `function after(f){requestAnimationFrame(function(){setTimeout(f,0)})}` +
  `if(document.hidden){run()}else{after(pre);` +
  `if(document.readyState==="complete"){after(run)}else{addEventListener("load",function(){after(run)})}` +
  `setTimeout(run,${FALLBACK_MS})}})()</script>`

/**
 * Moves the module scripts and their preloads out of the document into a loader at the end of the body. Does nothing
 * when the page has no module script (nothing to hydrate), so an unexpected shape of the HTML leaves it untouched.
 */
export function deferModuleGraph(html: HtmlParts): void {
  const deferred: Deferred = { preloads: [], entries: [], before: [], after: [] }
  const { preloads, entries } = deferred
  const strip = (part: string): string =>
    part
      .replace(FETCH_PRELOAD, (tag) => {
        deferred.before.push(tag)
        return ''
      })
      .replace(PREFETCH, (tag) => {
        deferred.after.push(tag)
        return ''
      })
      .replace(MODULE_PRELOAD, (tag) => {
        const href = HREF.exec(tag)?.[1]
        if (href) preloads.push(href)
        return ''
      })
      .replace(MODULE_ENTRY, (_script, src: string) => {
        entries.push(src)
        return ''
      })
  const stripped = PARTS.map((key) => html[key].map(strip).filter((part) => part !== ''))
  if (entries.length === 0) return
  PARTS.forEach((key, index) => {
    html[key] = stripped[index]!
  })
  // The entry is loaded by its script: its preload would only repeat it.
  deferred.preloads = preloads.filter((href) => !entries.includes(href))
  html.bodyAppend.push(loader(deferred))
}
