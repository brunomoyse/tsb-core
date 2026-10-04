// UseTracking in plain Node (no window): the SSR side of the umami beacon.
import { describe, expect, it } from 'vite-plus/test'
import { useTracking } from '#engine/composables/useTracking'

describe('useTracking without a window (SSR)', () => {
  it('trackEvent is a silent no-op', () => {
    expect(typeof window).toBe('undefined')
    expect(() => {
      useTracking().trackEvent('order_placed', { total: 10 })
    }).not.toThrow()
  })
})
