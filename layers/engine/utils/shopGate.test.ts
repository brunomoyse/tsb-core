// Shop gate: which paths are shop routes, where they go while the shop is off, and how the flag value is read.
// Run: `vp test run layers/engine/utils/shopGate.test.ts`.
import { describe, expect, it } from 'vite-plus/test'
import { isShopEnabledValue, isShopUrl, shopGateRedirect } from './shopGate'

describe('isShopEnabledValue', () => {
  it.each([true, 'true', '1', 'on', undefined, null, ''])('keeps the shop on for %s', (value) => {
    expect(isShopEnabledValue(value)).toBe(true)
  })

  it.each([false, 'false', 'FALSE', ' false ', '0', 0, 'off'])('turns it off for %s', (value) => {
    expect(isShopEnabledValue(value)).toBe(false)
  })
})

describe('shopGateRedirect', () => {
  it.each([
    ['/fr/menu', '/fr'],
    ['/en/menu?product=abc', '/en'],
    ['/nl/cart', '/nl'],
    ['/zh/checkout', '/zh'],
    ['/fr/order-completed/123', '/fr'],
    ['/fr/me', '/fr'],
    ['/fr/me/orders', '/fr'],
    ['/menu', '/'],
    ['/me/orders', '/'],
  ])('sends %s to %s', (path, target) => {
    expect(shopGateRedirect(path)).toBe(target)
  })

  it.each([
    '/',
    '',
    '/fr',
    '/fr/',
    '/fr/concept',
    '/fr/about',
    '/fr/contact',
    '/fr/faq',
    '/fr/terms',
    '/fr/privacy',
    '/fr/account-deletion',
    // Zitadel's login UI, used by the staff dashboard: never gated.
    '/fr/auth/login',
    '/fr/auth/callback',
    '/auth/logout',
    // Only the segment counts, not a prefix of it.
    '/fr/menus',
    '/fr/meet',
  ])('leaves %s alone', (path) => {
    expect(shopGateRedirect(path)).toBeNull()
  })
})

describe('isShopUrl', () => {
  it('reads absolute URLs and paths alike', () => {
    expect(isShopUrl('https://ygfliege.be/fr/menu')).toBe(true)
    expect(isShopUrl('/en/checkout')).toBe(true)
    expect(isShopUrl('https://ygfliege.be/fr/concept')).toBe(false)
    expect(isShopUrl('https://ygfliege.be')).toBe(false)
  })
})
