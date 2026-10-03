import { defineCachedFunction, useNitroApp, useRuntimeConfig } from 'nitropack/runtime'
import { defineEventHandler, getRequestHeader, getRequestURL, setResponseHeader } from 'h3'
import {
  STATIC_PAGE_FILL_HEADER as FILL_HEADER,
  type StaticPageCacheConfig,
  cacheableLocale,
  staticPageLocale,
} from '../../utils/staticPageCache'

/*
 * One render per static page and language, answered from memory (audit PR 6.1, P10).
 *
 * Terms, privacy, FAQ, contact (and, per brand, about / concept) are the same for every visitor, yet every request
 * rendered the whole Vue app and waited for the restaurant config of the layout. Now the first request renders the page
 * and the next ones, for `MAX_AGE` seconds, get that HTML immediately. After that the stale copy is still served while a
 * fresh one is rendered in the background (stale-while-revalidate), so nobody waits for a re-render but a cold start.
 *
 * What it is NOT: a Nitro `routeRules` cache. That would render with the headers of the first visitor stripped and
 * replay the answer to everybody, which breaks the language redirect (`redirectOn: 'all'`: an English browser opening
 * /fr/terms is sent to /en/terms) and replays a stale Set-Cookie. So this is a middleware: a request goes through the
 * cache only when the language module would not have redirected it (utils/staticPageCache.ts); everything else falls
 * through to the normal render, untouched. The cached render itself is made without cookies or Accept-Language
 * (a canonical page for its URL), keyed by path alone (a query string never makes another entry, so the cache cannot be
 * grown from outside: at most locales x pages entries).
 *
 * The restaurant config in the cached HTML (opening hours, the policy numbers in the FAQ) is up to a few minutes old when
 * the browser receives it; useRestaurantConfig asks again after hydration for a page that was rendered for the cache
 * (the render carries FILL_HEADER, which the render itself passes through to the application untouched).
 * Personalised pages (cart, checkout, me, auth, order-completed) are never listed.
 */

/** Seconds a render is fresh. */
const MAX_AGE = 300
/** Headers of the render that belong to that one response, not to the page. */
const SKIPPED_HEADERS = new Set([
  'set-cookie',
  'content-length',
  'content-encoding',
  'transfer-encoding',
  'connection',
  'keep-alive',
  'date',
  'etag',
  'last-modified',
])
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365

interface Rendered {
  status: number
  headers: [string, string][]
  body: string
}

const render = defineCachedFunction(
  async (pathname: string): Promise<Rendered> => {
    const res = await useNitroApp().localFetch(pathname, { headers: { [FILL_HEADER]: '1' } })
    return {
      status: res.status,
      headers: [...res.headers.entries()].filter(([name]) => !SKIPPED_HEADERS.has(name)),
      body: await res.text(),
    }
  },
  {
    name: 'static-page',
    group: 'tsb',
    maxAge: MAX_AGE,
    swr: true,
    getKey: (pathname: string) => pathname,
    // Only a successful render is kept: a 404 or a failure is asked again.
    validate: (entry) => entry.value?.status === 200,
  },
)

export default defineEventHandler(async (event) => {
  if (event.method !== 'GET' || getRequestHeader(event, FILL_HEADER)) return
  const config = useRuntimeConfig(event).staticPageCache as StaticPageCacheConfig | undefined
  if (!config) return

  const { pathname } = getRequestURL(event)
  if (!staticPageLocale(pathname, config)) return
  const locale = cacheableLocale(
    {
      pathname,
      cookie: getRequestHeader(event, 'cookie'),
      acceptLanguage: getRequestHeader(event, 'accept-language'),
    },
    config,
  )
  if (!locale) return

  let page: Rendered
  try {
    page = await render(pathname)
  } catch {
    // The render failed: let the normal handler produce the error page.
    return
  }
  if (page.status !== 200) return

  for (const [name, value] of page.headers) setResponseHeader(event, name, value)
  // What the live render sets for a page in this language (same cookie, same lifetime as the language module's redirects).
  setResponseHeader(
    event,
    'set-cookie',
    `${config.cookie}=${locale}; Max-Age=${COOKIE_MAX_AGE}; Path=/; SameSite=Lax`,
  )
  return page.body
})
