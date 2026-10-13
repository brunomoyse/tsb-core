// sentryServer: which server events are bot noise. Run: `vp test run layers/engine/utils/sentryServer.test.ts`.
import { describe, expect, it } from 'vite-plus/test'
import { isMalformedRequest } from './sentryServer'

describe('isMalformedRequest', () => {
  it('flags a request whose Host header no URL parser accepts', () => {
    expect(isMalformedRequest({ request: { url: 'http://149.202.059.064/' } })).toBe(true)
  })

  it('keeps a request with a valid URL', () => {
    expect(isMalformedRequest({ request: { url: 'https://tokyosushibarliege.be/fr/menu' } })).toBe(
      false,
    )
    expect(isMalformedRequest({ request: { url: 'http://149.202.59.64/' } })).toBe(false)
  })

  it('keeps an event without a request URL', () => {
    expect(isMalformedRequest({})).toBe(false)
    expect(isMalformedRequest({ request: {} })).toBe(false)
    expect(isMalformedRequest({ request: { url: '' } })).toBe(false)
  })
})
