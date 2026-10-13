// Global route middleware: while the shop is off (public runtime config `shopEnabled`), the shop routes redirect to the
// home page of their language; with the flag unset nothing changes. navigateTo is the boundary.
// Run: `vp test run layers/engine/middleware/00.shop-gate.global.nuxt.test.ts`.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import type { RouteLocationNormalized } from 'vue-router'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useRuntimeConfig } from '#imports'
import { useShopEnabled } from '#engine/composables/useShopEnabled'

const navigateTo = vi.hoisted(() => vi.fn((to: string) => `navigated:${to}`))
mockNuxtImport('navigateTo', () => navigateTo)

const { default: shopGate } = await import('./00.shop-gate.global')

const run = (path: string) =>
  (shopGate as unknown as (to: RouteLocationNormalized) => unknown)({
    path,
  } as unknown as RouteLocationNormalized)

const publicConfig = () => useRuntimeConfig().public as unknown as { shopEnabled: unknown }
let original: unknown

beforeEach(() => {
  vi.clearAllMocks()
  original = publicConfig().shopEnabled
})

afterEach(() => {
  publicConfig().shopEnabled = original
})

describe('with the shop on (the default)', () => {
  it('is on when nothing configures it', () => {
    expect(useShopEnabled()).toBe(true)
  })

  it('lets every route through', () => {
    for (const path of ['/fr/menu', '/fr/checkout', '/fr/me/orders', '/fr/auth/login']) {
      expect(run(path)).toBeUndefined()
    }
    expect(navigateTo).not.toHaveBeenCalled()
  })
})

describe('with the shop off', () => {
  beforeEach(() => {
    // The env value as text, the way a container sets it.
    publicConfig().shopEnabled = 'false'
  })

  it('reads the text value as off', () => {
    expect(useShopEnabled()).toBe(false)
  })

  it('sends a shop route to the home page of its language with a 302', () => {
    expect(run('/nl/menu')).toBe('navigated:/nl')
    expect(navigateTo).toHaveBeenCalledExactlyOnceWith('/nl', { redirectCode: 302 })
  })

  it('keeps the info pages and the login UI up', () => {
    for (const path of ['/fr', '/fr/concept', '/fr/contact', '/fr/terms', '/fr/auth/login']) {
      expect(run(path)).toBeUndefined()
    }
    expect(navigateTo).not.toHaveBeenCalled()
  })
})
