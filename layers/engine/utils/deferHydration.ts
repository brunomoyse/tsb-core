/*
 * Starts the page's JavaScript after the first paint instead of with the HTML (audit: Lighthouse 100).
 *
 * The server renders every page in full, so the browser can paint it without any script. Nuxt nevertheless puts one
 * `<script type="module">` and ~70 `<link rel="modulepreload">` in the head: the scripts then download in parallel with the
 * stylesheet, the fonts and the hero image (on a slow phone connection they take the bandwidth the first paint needs) and
 * their evaluation, which hydrates the page, runs before the first frame. This takes both out of the head and puts a few
 * lines at the end of the body that add them once the browser has had its first rendering opportunity (requestAnimationFrame,
 * then a task). The page paints first, hydrates a moment later, and works the same afterwards.
 *
 * Fallbacks, so that hydration can never be stuck: a background tab never runs requestAnimationFrame (it starts at once),
 * and a timer starts it anyway after FALLBACK_MS (a very slow stylesheet).
 */

export const FALLBACK_MS = 1500

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

const loader = (preloads: string[], entries: string[]): string =>
  `<script>(function(){var P=${JSON.stringify(preloads)},E=${JSON.stringify(entries)},d=0;` +
  `function go(){if(d)return;d=1;var h=document.head,i,e;` +
  `for(i=0;i<P.length;i++){e=document.createElement("link");e.rel="modulepreload";e.crossOrigin="";e.href=P[i];h.appendChild(e)}` +
  `for(i=0;i<E.length;i++){e=document.createElement("script");e.type="module";e.crossOrigin="";e.src=E[i];h.appendChild(e)}}` +
  `if(document.hidden){go()}else{requestAnimationFrame(function(){setTimeout(go,0)});setTimeout(go,${FALLBACK_MS})}})()</script>`

/**
 * Moves the module scripts and their preloads out of the document into a loader at the end of the body. Does nothing
 * when the page has no module script (nothing to hydrate), so an unexpected shape of the HTML leaves it untouched.
 */
export function deferModuleGraph(html: HtmlParts): void {
  const entries: string[] = []
  const preloads: string[] = []
  const strip = (part: string): string =>
    part
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
  html.bodyAppend.push(
    loader(
      preloads.filter((href) => !entries.includes(href)),
      entries,
    ),
  )
}
