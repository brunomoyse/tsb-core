// Notifications store: one toast on screen, the others queued; expiry clock with pause/resume; client-only timer.
// Time is faked, everything else (store, queue and timer rules) is real.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { createPinia, setActivePinia } from 'pinia'
import { MAX_QUEUED_TOASTS } from '#engine/utils/toastQueue'
import { setFlags } from '../../../test/flags'
import { useNotificationsStore } from '#engine/stores/notifications'

function store() {
  setActivePinia(createPinia())
  return useNotificationsStore()
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  // The expiry clock lives at module scope: leave it stopped for the next test.
  const s = useNotificationsStore()
  s.queue = []
  s.dismiss()
  vi.useRealTimers()
})

describe('notify', () => {
  it('shows the first toast at once with the defaults, and returns its id', () => {
    const s = store()
    const id = s.notify({ message: 'Saved' })
    expect(s.current).toEqual({
      id,
      message: 'Saved',
      persistent: false,
      duration: 5000,
      variant: 'neutral',
      action: undefined,
      group: undefined,
    })
    expect(s.seq).toBe(1)
    expect(s.queue).toEqual([])
  })

  it('ids are unique and increasing', () => {
    const s = store()
    const a = s.notify({ message: 'a' })
    const b = s.notify({ message: 'b' })
    expect(b).toBeGreaterThan(a)
  })

  it('keeps the payload options (variant, duration, action, group, persistent)', () => {
    const s = store()
    const handler = vi.fn()
    s.notify({
      message: 'Removed',
      variant: 'success',
      duration: 8000,
      group: 'cart-removal',
      persistent: true,
      action: { label: 'Undo', handler },
    })
    expect(s.current).toMatchObject({
      variant: 'success',
      duration: 8000,
      group: 'cart-removal',
      persistent: true,
    })
    s.current!.action!.handler()
    expect(handler).toHaveBeenCalledOnce()
  })

  it('a second toast waits its turn', () => {
    const s = store()
    s.notify({ message: 'first' })
    s.notify({ message: 'second' })
    expect(s.current!.message).toBe('first')
    expect(s.queue.map((t) => t.message)).toEqual(['second'])
    expect(s.seq).toBe(1)
  })

  it('a toast of the same group replaces the one on screen and bumps seq (the host re-mounts it)', () => {
    const s = store()
    s.notify({ message: '1 item removed', group: 'removal' })
    s.notify({ message: '2 items removed', group: 'removal' })
    expect(s.current!.message).toBe('2 items removed')
    expect(s.queue).toEqual([])
    expect(s.seq).toBe(2)
  })

  it('the same message again restarts the clock instead of queueing a copy', () => {
    const s = store()
    s.notify({ message: 'Copied' })
    vi.advanceTimersByTime(4000)
    s.notify({ message: 'Copied' })
    expect(s.queue).toEqual([])
    vi.advanceTimersByTime(4000)
    expect(s.current).not.toBeNull()
    vi.advanceTimersByTime(1000)
    expect(s.current).toBeNull()
  })

  it('bounds the queue', () => {
    const s = store()
    for (let i = 0; i < MAX_QUEUED_TOASTS + 4; i++) s.notify({ message: `m${i}` })
    expect(s.queue).toHaveLength(MAX_QUEUED_TOASTS)
    expect(s.current!.message).toBe('m0')
  })
})

describe('expiry', () => {
  it('a toast leaves after its duration and the next one takes over with its own clock', () => {
    const s = store()
    s.notify({ message: 'first', duration: 3000 })
    s.notify({ message: 'second', duration: 1000 })
    vi.advanceTimersByTime(2999)
    expect(s.current!.message).toBe('first')
    vi.advanceTimersByTime(1)
    expect(s.current!.message).toBe('second')
    expect(s.seq).toBe(2)
    vi.advanceTimersByTime(1000)
    expect(s.current).toBeNull()
  })

  it('a persistent toast never expires, until it is dismissed', () => {
    const s = store()
    s.notify({ message: 'Offline', persistent: true })
    vi.advanceTimersByTime(3_600_000)
    expect(s.current!.message).toBe('Offline')
    s.dismiss()
    expect(s.current).toBeNull()
  })

  it('dismiss cancels the clock of the toast and starts the next one', () => {
    const s = store()
    s.notify({ message: 'first', duration: 1000 })
    s.notify({ message: 'second', duration: 5000 })
    vi.advanceTimersByTime(500)
    s.dismiss()
    expect(s.current!.message).toBe('second')
    vi.advanceTimersByTime(1000)
    expect(s.current!.message).toBe('second')
    vi.advanceTimersByTime(4000)
    expect(s.current).toBeNull()
  })

  it('dismiss with nothing on screen is harmless', () => {
    const s = store()
    expect(() => {
      s.dismiss()
    }).not.toThrow()
    expect(s.current).toBeNull()
  })

  it('a persistent toast replacing a timed one stops its clock', () => {
    const s = store()
    s.notify({ message: 'timed', group: 'g', duration: 1000 })
    s.notify({ message: 'sticky', group: 'g', persistent: true })
    vi.advanceTimersByTime(10_000)
    expect(s.current!.message).toBe('sticky')
  })

  it('does not start a clock on the server (no timer handle in the SSR state)', () => {
    setFlags({ server: true })
    const s = store()
    s.notify({ message: 'SSR' })
    expect(vi.getTimerCount()).toBe(0)
    expect(s.current!.message).toBe('SSR')
  })
})

describe('pause and resume (hover / focus)', () => {
  it('a paused toast does not expire; the rest of its time runs after resume', () => {
    const s = store()
    s.notify({ message: 'reading', duration: 5000 })
    vi.advanceTimersByTime(2000)
    s.pause()
    expect(s.isPaused()).toBe(true)
    vi.advanceTimersByTime(60_000)
    expect(s.current).not.toBeNull()
    s.resume()
    expect(s.isPaused()).toBe(false)
    vi.advanceTimersByTime(2999)
    expect(s.current).not.toBeNull()
    vi.advanceTimersByTime(1)
    expect(s.current).toBeNull()
  })

  it('gives at least one second after resume', () => {
    const s = store()
    s.notify({ message: 'almost gone', duration: 5000 })
    vi.advanceTimersByTime(4900)
    s.pause()
    s.resume()
    vi.advanceTimersByTime(999)
    expect(s.current).not.toBeNull()
    vi.advanceTimersByTime(1)
    expect(s.current).toBeNull()
  })

  it('the pause survives a replacement: the new toast waits until resume', () => {
    const s = store()
    s.notify({ message: 'a', group: 'g', duration: 2000 })
    s.pause()
    s.notify({ message: 'b', group: 'g', duration: 2000 })
    vi.advanceTimersByTime(60_000)
    expect(s.current!.message).toBe('b')
    s.resume()
    vi.advanceTimersByTime(2000)
    expect(s.current).toBeNull()
  })

  it('resume with nothing on screen stops the clock instead of arming one', () => {
    const s = store()
    s.resume()
    expect(s.isPaused()).toBe(false)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('resume on a persistent toast keeps it without a timer', () => {
    const s = store()
    s.notify({ message: 'sticky', persistent: true })
    s.pause()
    s.resume()
    expect(vi.getTimerCount()).toBe(0)
    expect(s.current).not.toBeNull()
  })

  it('isPaused is false before any toast has existed: the module has no clock yet', async () => {
    // The clock is created by the first toast of the module: a fresh copy of the module has none.
    vi.resetModules()
    const { useNotificationsStore: freshStore } = await import('#engine/stores/notifications')
    setActivePinia(createPinia())
    expect(freshStore().isPaused()).toBe(false)
  })

  it('dismiss ends a pause', () => {
    const s = store()
    s.notify({ message: 'a' })
    s.pause()
    s.dismiss()
    expect(s.isPaused()).toBe(false)
  })
})

describe('hasGroup', () => {
  it('is true for the group showing or waiting, false otherwise', () => {
    const s = store()
    expect(s.hasGroup('removal')).toBe(false)
    s.notify({ message: 'x', group: 'other' })
    s.notify({ message: 'y', group: 'removal' })
    expect(s.hasGroup('other')).toBe(true)
    expect(s.hasGroup('removal')).toBe(true)
    expect(s.hasGroup('nope')).toBe(false)
  })
})
