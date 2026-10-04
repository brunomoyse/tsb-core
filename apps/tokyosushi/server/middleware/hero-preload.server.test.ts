// Home page only: a `Link` header preloads the hero image of the viewport (mobile or desktop) before the HTML is parsed.
// Run: `vp test run apps/tokyosushi/server/middleware/hero-preload.server.test.ts`.
import { createApp, toWebHandler } from 'h3'
import { describe, expect, it } from 'vite-plus/test'
import { callHandler } from '../../../../test/nitro/callHandler'
import heroPreload from './hero-preload'

const link = async (path: string) => (await callHandler(heroPreload, { path })).headers.get('link')

describe('the home page', () => {
  it.each([
    '/',
    '/fr',
    '/fr/',
    '/en',
    '/en/',
    '/zh',
    '/zh/',
    '/nl',
    '/nl/',
    '/fr?utm_source=x',
    '/?a=1',
  ])('gets the preload of both hero images (%s)', async (path) => {
    const header = await link(path)
    expect(header).not.toBeNull()
    const [mobile, desktop] = header!.split(', </')
    expect(mobile).toContain('</images/restaurant-illustrated-mobile.avif>')
    expect(mobile).toContain('media="(max-width: 640px)"')
    expect(`</${desktop}`).toContain('</images/restaurant-illustrated.avif>')
    expect(desktop).toContain('media="(min-width: 641px)"')
    for (const part of [mobile, desktop]) {
      expect(part).toContain('rel=preload')
      expect(part).toContain('as=image')
      expect(part).toContain('type="image/avif"')
      expect(part).toContain('fetchpriority="high"')
    }
  })

  it('keeps a Link header that an earlier handler already set', async () => {
    const app = createApp()
    app.use(
      defineEventHandler((event) => {
        setResponseHeader(event, 'Link', '</fonts/a.woff2>; rel=preload; as=font')
      }),
    )
    app.use(heroPreload)
    const response = await toWebHandler(app)(new Request('http://localhost/fr'))
    const header = response.headers.get('link')!
    expect(header).toContain('</fonts/a.woff2>; rel=preload; as=font')
    expect(header).toContain('/images/restaurant-illustrated.avif')
  })
})

describe('every other page', () => {
  it.each([
    '/fr/menu',
    '/menu',
    '/de',
    '/fr/auth/login',
    '/frx',
    '/fr//',
    '/_nuxt/entry.js',
    '/api/v1/graphql',
  ])('gets no preload (%s)', async (path) => {
    expect(await link(path)).toBeNull()
  })
})

describe('an event without a path', () => {
  it('is ignored instead of failing the request', () => {
    expect(() =>
      (heroPreload as unknown as (event: unknown) => unknown)({ path: undefined }),
    ).not.toThrow()
  })
})
