// useTracking in plain Node (no window): the SSR side of the umami beacon.
import { describe, expect, it, vi } from 'vite-plus/test'
import { useTracking } from '#engine/composables/useTracking'

describe('useTracking without a window (SSR)', () => {
  it('trackEvent sends nothing, even if a beacon happens to exist on the global object', () => {
    const track = vi.fn()
    vi.stubGlobal('umami', { track })
    expect(typeof window).toBe('undefined')
    expect(useTracking().trackEvent('order_placed', { total: 10 })).toBeUndefined()
    expect(track).not.toHaveBeenCalled()
  })
})
