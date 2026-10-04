// UseTracking in the browser: events go to window.umami when the script is loaded, nowhere (silently) when not.
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { useTracking } from '#engine/composables/useTracking'

interface Scope {
  umami?: { track: (name: string, data?: Record<string, unknown>) => void }
}
const scope = window as unknown as Scope

afterEach(() => {
  delete scope.umami
})

describe('useTracking', () => {
  it('forwards the event name and props to umami', () => {
    const track = vi.fn()
    scope.umami = { track }
    useTracking().trackEvent('add_to_cart', { productId: 'p1' })
    expect(track).toHaveBeenCalledExactlyOnceWith('add_to_cart', { productId: 'p1' })
  })

  it('forwards an event without props', () => {
    const track = vi.fn()
    scope.umami = { track }
    useTracking().trackEvent('page_ready')
    expect(track).toHaveBeenCalledExactlyOnceWith('page_ready', undefined)
  })

  it('does nothing when umami is not loaded (blocked or not yet there)', () => {
    expect(() => {
      useTracking().trackEvent('x')
    }).not.toThrow()
  })

  it('looks umami up at call time, so a script that loads late is used', () => {
    const { trackEvent } = useTracking()
    trackEvent('early')
    const track = vi.fn()
    scope.umami = { track }
    trackEvent('late')
    expect(track).toHaveBeenCalledExactlyOnceWith('late', undefined)
  })

  it('identifyUser / resetUser are anonymous no-ops that never reach umami', () => {
    const track = vi.fn()
    scope.umami = { track }
    const { identifyUser, resetUser } = useTracking()
    expect(identifyUser()).toBeUndefined()
    expect(resetUser()).toBeUndefined()
    expect(track).not.toHaveBeenCalled()
  })
})
