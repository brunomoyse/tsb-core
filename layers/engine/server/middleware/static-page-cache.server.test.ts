// Static-page cache middleware: terms / privacy / faq ... are rendered once per language and replayed from memory.
// A request goes through it only when the language module would not redirect it; everything else falls through to the
// live render untouched. Nitro's cache (defineCachedFunction) and the internal render (localFetch) are the boundaries;
// the cache is replaced by a small in-memory fake that honours the options the middleware gives it (key, validate,
// maxAge, swr), so that "answered from the cache" is a request that did not render again.
// Run: `vp test run layers/engine/server/middleware/static-page-cache.server.test.ts`.
import { createApp, toWebHandler } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { setFlags } from '../../../../test/flags'
import {
  STATIC_PAGE_FILL_HEADER,
  STATIC_PAGE_SKIP_HEADER,
  type StaticPageCacheConfig,
} from '../../utils/staticPageCache'

interface CacheOptions {
  name: string
  group: string
  maxAge: number
  swr: boolean
  getKey: (pathname: string) => string
  validate: (entry: { value?: { status: number; incomplete: boolean }; mtime?: number }) => boolean
}
interface Rendered {
  status: number
  incomplete: boolean
  headers: [string, string][]
  body: string
}

interface NitroDouble {
  config: unknown
  localFetch: ReturnType<typeof vi.fn>
  cached: { render?: (pathname: string) => Promise<Rendered>; options?: CacheOptions }
  entries: Map<string, { value: Rendered; mtime: number }>
  background: Promise<unknown>[]
}
const nitro = vi.hoisted((): NitroDouble => ({
  config: undefined,
  localFetch: vi.fn(),
  cached: {},
  entries: new Map(),
  background: [],
}))

vi.mock('nitropack/runtime', () => ({
  // Nitro's cache, reduced to its contract: an entry is read back while `validate` accepts it, fresh for `maxAge`
  // seconds, then (swr) still served while a new render is stored in the background.
  defineCachedFunction: (fn: (pathname: string) => Promise<Rendered>, options: CacheOptions) => {
    nitro.cached.render = fn
    nitro.cached.options = options
    return async (pathname: string) => {
      const key = options.getKey(pathname)
      const renderAndStore = async () => {
        const value = await fn(pathname)
        nitro.entries.set(key, { value, mtime: Date.now() })
        return value
      }
      const entry = nitro.entries.get(key)
      if (entry && options.validate(entry)) {
        if (Date.now() - entry.mtime <= options.maxAge * 1000) return entry.value
        if (options.swr) {
          nitro.background.push(renderAndStore().catch(() => undefined))
          return entry.value
        }
      }
      return renderAndStore()
    }
  },
  useNitroApp: () => ({ localFetch: nitro.localFetch }),
  useRuntimeConfig: () => ({ staticPageCache: nitro.config }),
}))

const { default: middleware } = await import('./static-page-cache')

const config: StaticPageCacheConfig = {
  locales: ['fr', 'en', 'nl', 'zh'],
  pages: ['terms', 'faq'],
  cookie: 'i18n_redirected',
}

const LIVE = 'LIVE RENDER'

/** The middleware in front of a "live" handler: LIVE means the request fell through. */
async function request(
  path: string,
  { method = 'GET', headers }: { method?: string; headers?: Record<string, string> } = {},
) {
  const app = createApp()
  app.use(middleware)
  app.use(defineEventHandler(() => LIVE))
  const response = await toWebHandler(app)(
    new Request(`http://localhost${path}`, { method, headers }),
  )
  return { response, body: await response.text() }
}

const renderAs = (
  body: string,
  { status = 200, headers = {} }: { status?: number; headers?: Record<string, string> } = {},
) => new Response(body, { status, headers })

beforeEach(() => {
  vi.resetAllMocks()
  nitro.entries.clear()
  nitro.background = []
  nitro.config = config
  nitro.localFetch.mockImplementation(() =>
    Promise.resolve(renderAs('<html>terms</html>', { headers: { 'content-type': 'text/html' } })),
  )
})

describe('a cacheable request', () => {
  it('is answered with the cached render, and sets the language cookie as the live page would', async () => {
    const { response, body } = await request('/fr/terms')

    expect(body).toBe('<html>terms</html>')
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('text/html')
    expect(response.headers.get('set-cookie')).toBe(
      'i18n_redirected=fr; Max-Age=31536000; Path=/; SameSite=Lax',
    )
  })

  it('renders internally by path alone, flagged as a render for the cache, without cookies or Accept-Language', async () => {
    await request('/en/faq?utm_source=newsletter', {
      headers: { 'accept-language': 'en-GB,en;q=0.9' },
    })
    expect(nitro.localFetch).toHaveBeenCalledExactlyOnceWith('/en/faq', {
      headers: { [STATIC_PAGE_FILL_HEADER]: '1' },
    })
  })

  it.each([
    ['no cookie and no Accept-Language (a crawler)', {}],
    ['a cookie for the language of the page', { cookie: 'a=b; i18n_redirected=fr' }],
    [
      'an Accept-Language that prefers the language of the page',
      { 'accept-language': 'fr-BE,en;q=0.5' },
    ],
  ])('is served from the cache for %s', async (_label, headers) => {
    const { body } = await request('/fr/terms', { headers })
    expect(body).toBe('<html>terms</html>')
  })

  it('copies the headers of the render that belong to the page, not the ones of that one response', async () => {
    nitro.localFetch.mockResolvedValue(
      renderAs('<html>x</html>', {
        headers: {
          'content-type': 'text/html',
          'cache-control': 'public, max-age=60',
          link: '</a.css>; rel=preload',
          'set-cookie': 'session=visitor-1',
          etag: 'W/"abc"',
          'last-modified': 'Sat, 03 Oct 2026 10:00:00 GMT',
          'x-custom': 'kept',
          [STATIC_PAGE_SKIP_HEADER]: '1',
        },
      }),
    )
    const { response } = await request('/fr/terms')
    expect(response.headers.get('cache-control')).toBe('public, max-age=60')
    expect(response.headers.get('link')).toBe('</a.css>; rel=preload')
    expect(response.headers.get('x-custom')).toBe('kept')
    // The render's own Set-Cookie is replaced by the language cookie; per-response headers and the internal flag are gone.
    expect(response.headers.get('set-cookie')).toBe(
      'i18n_redirected=fr; Max-Age=31536000; Path=/; SameSite=Lax',
    )
    expect(response.headers.has('etag')).toBe(false)
    expect(response.headers.has('last-modified')).toBe(false)
    expect(response.headers.has(STATIC_PAGE_SKIP_HEADER)).toBe(false)
  })
})

describe('a request that falls through to the live render', () => {
  const live = async (path: string, init?: Parameters<typeof request>[1]) => {
    const { body } = await request(path, init)
    expect(body).toBe(LIVE)
    expect(nitro.localFetch).not.toHaveBeenCalled()
  }

  it('POST, or any method but GET', async () => {
    await live('/fr/terms', { method: 'POST' })
  })

  it('the render for the cache itself (no recursion)', async () => {
    await live('/fr/terms', { headers: { [STATIC_PAGE_FILL_HEADER]: '1' } })
  })

  it('a deployment without the cache config', async () => {
    nitro.config = undefined
    await live('/fr/terms')
  })

  it.each([
    ['a page that is not listed', '/fr/menu'],
    ['a personalised page', '/fr/me'],
    ['a language we do not have', '/de/terms'],
    ['a trailing slash', '/fr/terms/'],
    ['no language prefix', '/terms'],
    ['the root', '/'],
  ])('%s', async (_label, path) => {
    await live(path)
  })

  it.each([
    [
      'a cookie for another language (the language module would redirect)',
      { cookie: 'i18n_redirected=en' },
    ],
    ['a cookie with a value that is no language', { cookie: 'i18n_redirected=klingon' }],
    ['an Accept-Language that prefers another language', { 'accept-language': 'en-GB,fr;q=0.5' }],
    ['an Accept-Language with no language of ours', { 'accept-language': 'de-DE,ja' }],
  ])('%s', async (_label, headers) => {
    await live('/fr/terms', { headers })
  })

  it('development (a page edited a minute ago must show)', async () => {
    setFlags({ dev: true })
    await live('/fr/terms')
  })
})

describe('when the render does not give a usable page', () => {
  it.each([404, 500, 302])('a status %i is left to the live render', async (status) => {
    nitro.localFetch.mockResolvedValue(renderAs('nope', { status }))
    const { body } = await request('/fr/terms')
    expect(body).toBe(LIVE)
  })

  it('a render that throws is left to the live render (it produces the error page)', async () => {
    nitro.localFetch.mockRejectedValue(new Error('render crashed'))
    const { body } = await request('/fr/terms')
    expect(body).toBe(LIVE)
  })

  it('a render without its restaurant config is served to this visitor, flag removed (it is not kept: see validate)', async () => {
    nitro.localFetch.mockResolvedValue(
      renderAs('<html>no hours</html>', { headers: { [STATIC_PAGE_SKIP_HEADER]: '1' } }),
    )
    const { response, body } = await request('/fr/terms')
    expect(body).toBe('<html>no hours</html>')
    expect(response.headers.has(STATIC_PAGE_SKIP_HEADER)).toBe(false)
  })
})

describe('the cache in front of the render', () => {
  const NOW = new Date('2026-10-04T12:00:00Z').getTime()
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW)
  })
  const later = (seconds: number) => vi.setSystemTime(NOW + seconds * 1000)

  it('renders a page once and answers the next requests from memory', async () => {
    await request('/fr/terms')
    await request('/fr/terms')
    const { body } = await request('/fr/terms')
    expect(body).toBe('<html>terms</html>')
    expect(nitro.localFetch).toHaveBeenCalledOnce()
  })

  it('a query string never makes another entry; every language and page has its own', async () => {
    await request('/fr/terms?utm=a')
    await request('/fr/terms?utm=b')
    expect(nitro.localFetch).toHaveBeenCalledOnce()
    await request('/en/terms')
    await request('/fr/faq')
    expect(nitro.localFetch.mock.calls.map((call) => call[0])).toEqual([
      '/fr/terms',
      '/en/terms',
      '/fr/faq',
    ])
  })

  it('after 5 minutes the old render is still served while a new one is made in the background', async () => {
    await request('/fr/terms')
    nitro.localFetch.mockResolvedValue(renderAs('<html>new</html>'))
    later(301)
    const { body } = await request('/fr/terms')
    expect(body).toBe('<html>terms</html>') // Nobody waits for the re-render
    await Promise.all(nitro.background)
    expect(nitro.localFetch).toHaveBeenCalledTimes(2)
    expect((await request('/fr/terms')).body).toBe('<html>new</html>')
  })

  it('a render older than one hour is not served any more: the request waits for a new one', async () => {
    await request('/fr/terms')
    nitro.localFetch.mockResolvedValue(renderAs('<html>after the outage</html>'))
    later(3601)
    const { body } = await request('/fr/terms')
    expect(body).toBe('<html>after the outage</html>')
    expect(nitro.localFetch).toHaveBeenCalledTimes(2)
  })

  it.each([
    ['a 404 render', () => renderAs('missing', { status: 404 })],
    [
      'a render made without its restaurant config',
      () => renderAs('<html>no hours</html>', { headers: { [STATIC_PAGE_SKIP_HEADER]: '1' } }),
    ],
  ])('does not keep %s: the next request renders again', async (_label, answer) => {
    nitro.localFetch.mockImplementation(() => Promise.resolve(answer()))
    await request('/fr/terms')
    await request('/fr/terms')
    expect(nitro.localFetch).toHaveBeenCalledTimes(2)
  })
})

describe('what is cached and for how long', () => {
  const options = () => nitro.cached.options!
  const NOW = new Date('2026-10-04T12:00:00Z').getTime()
  const entry = (
    overrides: Partial<{ status: number; incomplete: boolean }> = {},
    mtime = NOW,
  ) => ({
    value: { status: 200, incomplete: false, ...overrides },
    mtime,
  })

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW)
    return () => vi.useRealTimers()
  })

  it('keeps one entry per path (a query string never makes another), fresh for 5 minutes, stale-while-revalidate', () => {
    expect(options()).toMatchObject({ name: 'static-page', group: 'tsb', maxAge: 300, swr: true })
    expect(options().getKey('/fr/terms')).toBe('/fr/terms')
  })

  it('keeps a complete, successful render', () => {
    expect(options().validate(entry())).toBe(true)
  })

  it.each([
    ['a 404', { status: 404 }],
    ['a 500', { status: 500 }],
    ['a render made without its restaurant config', { incomplete: true }],
  ])('does not keep %s', (_label, overrides) => {
    expect(options().validate(entry(overrides))).toBe(false)
  })

  it('does not keep an entry that has no value', () => {
    expect(options().validate({ mtime: NOW })).toBe(false)
  })

  it('stops serving a render older than one hour, even stale (a long outage must not freeze an old page)', () => {
    expect(options().validate(entry({}, NOW - 3_600_000))).toBe(true)
    expect(options().validate(entry({}, NOW - 3_600_001))).toBe(false)
  })

  it('does not trust an entry without a timestamp', () => {
    expect(options().validate({ value: { status: 200, incomplete: false } })).toBe(false)
  })

  it('records what a render of the cache is made of: status, whether it is complete, the page headers and the body', async () => {
    nitro.localFetch.mockResolvedValue(
      renderAs('<html>x</html>', {
        status: 200,
        headers: { 'content-type': 'text/html', date: 'now', [STATIC_PAGE_SKIP_HEADER]: '1' },
      }),
    )
    const rendered = await nitro.cached.render!('/fr/terms')
    expect(rendered).toEqual({
      status: 200,
      incomplete: true,
      headers: [['content-type', 'text/html']],
      body: '<html>x</html>',
    })
  })
})
