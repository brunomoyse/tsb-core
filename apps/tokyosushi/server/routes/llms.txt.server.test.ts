// /llms.txt: a plain-text guide for AI crawlers, served on the production domain of the brand only.
// Run: `vp test run apps/tokyosushi/server/routes/llms.txt.server.test.ts`.
import { describe, expect, it } from 'vite-plus/test'
import { brand } from '#brand/brand'
import { callHandler } from '../../../../test/nitro/callHandler'
import handler from './llms.txt'
import { setRuntimeConfig } from '../../../../test/nitro/imports'

// The `server` project resolves `#brand` to this app: the route renders the brand it is shipped with.

const fetchLlms = async (baseUrl: unknown) => {
  setRuntimeConfig({ public: { baseUrl } })
  return callHandler(handler, { path: '/llms.txt' })
}
const production = `https://${brand.domain}`

describe('outside production', () => {
  it.each([
    ['a test deployment', 'https://test.example'],
    ['localhost', 'http://localhost:3000'],
    ['the www host of the production domain', `https://www.${brand.domain}`],
    ['the production domain over http', `http://${brand.domain}`],
    ['an unset base URL', undefined],
    ['an empty base URL', ''],
  ])('is a 404 on %s (nothing to advertise to crawlers)', async (_label, baseUrl) => {
    const response = await fetchLlms(baseUrl)
    expect(response.status).toBe(404)
  })
})

describe('on the production domain', () => {
  it('is plain text, titled with the brand and giving its address and phone number', async () => {
    const response = await fetchLlms(production)
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('text/plain; charset=utf-8')
    const body = await response.text()
    expect(body.startsWith(`# ${brand.name}\n`)).toBe(true)
    expect(body).toContain(brand.phone)
    expect(body).toContain(`${brand.address.street}, ${brand.address.postal} ${brand.address.city}`)
  })

  it('links the pages with absolute production URLs and the other languages', async () => {
    const body = await (await fetchLlms(production)).text()
    for (const page of ['menu', 'contact', 'faq', 'terms', 'privacy']) {
      expect(body).toContain(`(${production}/fr/${page})`)
    }
    for (const lang of ['en', 'zh', 'nl']) expect(body).toContain(`${production}/${lang}`)
    // Every link is on the production domain: no relative or staging URL leaks in.
    for (const [, url] of body.matchAll(/\]\((?<url>[^)]+)\)/gu)) {
      expect(url).toMatch(new RegExp(`^${production}/`, 'u'))
    }
  })

  it('describes the sushi restaurant, not the malatang one of the other brand', async () => {
    const body = await (await fetchLlms(production)).text()
    expect(body).toContain('sushi')
    expect(body).not.toContain('malatang')
    expect(body).not.toContain(`${production}/fr/concept`)
  })

  it('tolerates trailing slashes on the configured base URL', async () => {
    const response = await fetchLlms(`${production}//`)
    expect(response.status).toBe(200)
  })
})
