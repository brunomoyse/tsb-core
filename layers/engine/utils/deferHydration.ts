/*
 * Keeps what the first paint does not need out of the first request round (audit: Lighthouse 100).
 *
 * The server renders every page in full, so the browser can paint it without any script. Nuxt nevertheless puts one
 * `<script type="module">` and ~70 `<link rel="modulepreload">` in the head, next to two hints that the first paint does
 * not need either: the language file the app is about to fetch (a `<link rel="preload" as="fetch">`) and the
 * `<link rel="prefetch">` for the pages' other chunks.
 *
 * Two modes (runtime config `deferHydration`, env `NUXT_DEFER_HYDRATION`, see server/plugins/defer-hydration.ts):
 *
 * - REDUCED (the default). The entry script and the modulepreloads stay where Nuxt put them, so the JavaScript starts
 *   downloading with the HTML and the page hydrates as early as it can: a visitor who taps a button right after the first
 *   paint finds it working. Only the modulepreloads of the other chunks are marked `fetchpriority="low"` (the browser then
 *   serves the stylesheet, the fonts and the hero image first, and the entry script, which keeps its default priority,
 *   before them), and only the language file and the prefetch hints are added after the first frame, by a few lines at the
 *   end of the body (requestAnimationFrame, then a task).
 * - FULL (opt in). The entry script and every preload leave the head too: the loader adds them, then the language file and
 *   the prefetch hints, after the first frame. The page paints about 150-1200 ms earlier on a throttled phone but
 *   hydrates 260-2100 ms later, which leaves it painted and dead for twice as long (the add-to-cart buttons are
 *   `<button @click>`, and Vue has no event replay). Measured in the senior review (.audit-handover/LH100-REVIEW.md, 1.3);
 *   keep it off unless real-user data (Sentry web vitals per route) says the earlier paint is worth it.
 *
 * Both work only because the loader is an inline script: the CSP (`script-src 'unsafe-inline'`, nuxt.config.ts) allows it. If
 * the CSP ever moves to nonces or hashes, the loader needs the nonce (with 'strict-dynamic' the scripts it adds inherit
 * the trust).
 *
 * Fallbacks, so that nothing is ever stuck: a background tab never runs requestAnimationFrame (the loader starts at once),
 * and a timer starts it anyway after FALLBACK_MS (a very slow stylesheet holds the first frame back). A page without a
 * module script (nothing to hydrate) or with an unexpected shape of HTML is left untouched.
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
const MODULE_ENTRY = /<script\b[^>]*\btype="module"[^>]*\bsrc="(?<src>[^"]+)"[^>]*>\s*<\/script>/gu
const HREF = /\bhref="(?<href>[^"]+)"/u
const FETCH_PRELOAD = /<link\b[^>]*\brel="preload"[^>]*\bas="fetch"[^>]*>/gu
const PREFETCH = /<link\b[^>]*\brel="prefetch"[^>]*>/gu
const FETCH_PRIORITY = /\bfetchpriority=/u

interface Deferred {
  preloads: string[]
  entries: string[]
  /** Tags (HTML) to add together with the module preloads, before the entry script, and after it. */
  before: string[]
  after: string[]
}

// JSON for an inline script: `<` is escaped so that no value can ever contain `</script>`.
const json = (value: unknown): string => JSON.stringify(value).replace(/</gu, '\\u003c')

// The first frame (requestAnimationFrame, then a task), at once in a background tab, whatever happens after FALLBACK_MS.
const WHEN = `if(document.hidden){go()}else{requestAnimationFrame(function(){setTimeout(go,0)});setTimeout(go,${FALLBACK_MS})}})()</script>`

/** Full mode: adds the preloads and the language file, the entry scripts, then the prefetch hints. */
const fullLoader = ({ preloads, entries, before, after }: Deferred): string =>
  `<script>(function(){var P=${json(preloads)},E=${json(entries)},B=${json(before.join(''))},A=${json(after.join(''))},d=0,h=document.head;` +
  `function go(){if(d)return;d=1;h.insertAdjacentHTML("beforeend",B);for(var i=0,e;i<P.length;i++){e=document.createElement("link");e.rel="modulepreload";e.crossOrigin="";e.href=P[i];h.appendChild(e)}` +
  `for(i=0;i<E.length;i++){e=document.createElement("script");e.type="module";e.crossOrigin="";e.src=E[i];h.appendChild(e)}h.insertAdjacentHTML("beforeend",A)}${
    WHEN
  }`

/** Reduced mode: adds the language file and the prefetch hints. */
const reducedLoader = ({ before, after }: Deferred): string =>
  `<script>(function(){var T=${json(before.join('') + after.join(''))},d=0;` +
  `function go(){if(d)return;d=1;document.head.insertAdjacentHTML("beforeend",T)}${WHEN}`

export interface DeferOptions {
  /** Also move the entry script and the module preloads out of the head (see the header). Default: false. */
  full?: boolean
}

/**
 * Applies the mode above to the document Nuxt rendered. Does nothing when the page has no module script (nothing to
 * hydrate), so an unexpected shape of the HTML leaves it untouched.
 */
export function deferModuleGraph(html: HtmlParts, { full = false }: DeferOptions = {}): void {
  const text = PARTS.flatMap((key) => html[key]).join('')
  const entries = [...text.matchAll(MODULE_ENTRY)].map((match) => match[1]!)
  if (entries.length === 0) return

  const deferred: Deferred = { preloads: [], entries, before: [], after: [] }
  const strip = (part: string): string => {
    let result = part
      .replace(FETCH_PRELOAD, (tag) => {
        deferred.before.push(tag)
        return ''
      })
      .replace(PREFETCH, (tag) => {
        deferred.after.push(tag)
        return ''
      })
    if (full) {
      result = result
        .replace(MODULE_PRELOAD, (tag) => {
          const href = HREF.exec(tag)?.groups?.href
          if (href !== undefined && href !== '') deferred.preloads.push(href)
          return ''
        })
        .replace(MODULE_ENTRY, '')
    } else {
      // The entry's own preload keeps the default priority, the others yield to the stylesheet, fonts and images.
      result = result.replace(MODULE_PRELOAD, (tag) => {
        const href = HREF.exec(tag)?.groups?.href
        return href !== undefined && href !== '' && entries.includes(href) ? tag : lowPriority(tag)
      })
    }
    return result
  }
  const stripped = PARTS.map((key) => html[key].map(strip).filter((part) => part !== ''))
  PARTS.forEach((key, index) => {
    html[key] = stripped[index]!
  })
  if (full) {
    // The entry is loaded by its script: its preload would only repeat it.
    deferred.preloads = deferred.preloads.filter((href) => !entries.includes(href))
    html.bodyAppend.push(fullLoader(deferred))
  } else if (deferred.before.length + deferred.after.length > 0) {
    html.bodyAppend.push(reducedLoader(deferred))
  }
}

function lowPriority(tag: string): string {
  if (FETCH_PRIORITY.test(tag)) return tag
  return tag.replace(/<link\b/u, '<link fetchpriority="low"')
}
