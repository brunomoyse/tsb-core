import { NAV_ITEMS, visibleNavItems } from './navItems'
import { describe, expect, it } from 'vite-plus/test'

const keys = (items: readonly { key: string }[]) => items.map((item) => item.key)

describe('visibleNavItems', () => {
  it('a guest sees the public pages and Sign in', () => {
    expect(keys(visibleNavItems('main', false))).toEqual(['menu', 'contact'])
    expect(keys(visibleNavItems('account', false))).toEqual(['login'])
  })

  it('a signed-in visitor sees the public pages, My account and Log out (no Sign in)', () => {
    expect(keys(visibleNavItems('main', true))).toEqual(['menu', 'contact'])
    expect(keys(visibleNavItems('account', true))).toEqual(['account', 'logout'])
  })

  it('every entry belongs to exactly one group and has a locale key and an icon', () => {
    for (const item of NAV_ITEMS) {
      expect(['main', 'account']).toContain(item.group)
      expect(item.labelKey).toMatch(/^nav\./u)
      expect(item.icon).toMatch(/^\/icons\/.+\.svg$/u)
      expect(item.to.startsWith('/')).toBe(true)
    }
    expect(new Set(keys(NAV_ITEMS)).size).toBe(NAV_ITEMS.length)
  })
})
