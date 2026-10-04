// /robots.txt: crawlers are shut out of everything except on the production domain of the brand.
// Run: `vp test run layers/engine/server/routes/robots.txt.server.test.ts`.
import { describe, expect, it } from 'vite-plus/test'
import { brand } from '#brand/brand'
import { callHandler } from '../../../../test/nitro/callHandler'
import robots from './robots.txt'
import { setRuntimeConfig } from '../../../../test/nitro/imports'

const fetchRobots = async (baseUrl: unknown) => {
  setRuntimeConfig({ public: { baseUrl } })
  const response = await callHandler(robots, { path: '/robots.txt' })
  return { response, body: await response.text() }
}

const BLOCK_ALL = 'User-agent: *\nDisallow: /\n'
const production = `https://${brand.domain}`

describe('outside production', () => {
  it.each([
    ['a test deployment', 'https://ygf.brunomoyse.be'],
    ['localhost', 'http://localhost:3000'],
    ['the www host of the production domain', `https://www.${brand.domain}`],
    ['the production domain over http', `http://${brand.domain}`],
    ['an unset base URL', undefined],
    ['an empty base URL', ''],
  ])('blocks every crawler on %s', async (_label, baseUrl) => {
    const { body } = await fetchRobots(baseUrl)
    expect(body).toBe(BLOCK_ALL)
  })

  it('is served as plain text, status 200', async () => {
    const { response } = await fetchRobots('https://staging.example')
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('text/plain; charset=utf-8')
  })
})

describe('on the production domain', () => {
  it('allows the site, lists the private areas (with and without language prefix) and points to the sitemap index', async () => {
    const { response, body } = await fetchRobots(production)
    expect(response.headers.get('content-type')).toBe('text/plain; charset=utf-8')
    const lines = body.split('\n')
    expect(lines[0]).toBe('User-agent: *')
    expect(lines).toContain('Allow: /')
    expect(lines).not.toContain('Disallow: /')
    for (const area of ['auth/', 'cart', 'checkout', 'order-completed/']) {
      expect(lines).toContain(`Disallow: /${area}`)
      expect(lines).toContain(`Disallow: /*/${area}`)
    }
    // /me is anchored so that it does not also hide /fr/menu.
    expect(lines).toEqual(
      expect.arrayContaining([
        'Disallow: /me$',
        'Disallow: /me/',
        'Disallow: /*/me$',
        'Disallow: /*/me/',
      ]),
    )
    expect(lines).not.toContain('Disallow: /me')
    expect(lines).toContain(`Sitemap: ${production}/sitemap_index.xml`)
    expect(body.endsWith('\n')).toBe(true)
  })

  it('tolerates trailing slashes on the configured base URL', async () => {
    const { body } = await fetchRobots(`${production}//`)
    expect(body).toContain(`Sitemap: ${production}/sitemap_index.xml\n`)
    expect(body).toContain('Allow: /')
  })
})
