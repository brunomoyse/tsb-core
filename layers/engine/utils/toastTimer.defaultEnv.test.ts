// The toast timer on the real clock (the default environment), plus the pause guards.
import { MIN_RESUME_MS, createToastTimer } from './toastTimer'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('createToastTimer with the default clock', () => {
  it('expires after the duration', () => {
    const onExpire = vi.fn()
    createToastTimer(onExpire).start(3000)
    vi.advanceTimersByTime(2999)
    expect(onExpire).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(onExpire).toHaveBeenCalledOnce()
  })

  it('starting again cancels the previous expiry', () => {
    const onExpire = vi.fn()
    const timer = createToastTimer(onExpire)
    timer.start(3000)
    vi.advanceTimersByTime(2000)
    timer.start(3000)
    vi.advanceTimersByTime(2999)
    expect(onExpire).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(onExpire).toHaveBeenCalledOnce()
  })

  it('stop cancels it', () => {
    const onExpire = vi.fn()
    const timer = createToastTimer(onExpire)
    timer.start(1000)
    timer.stop()
    vi.advanceTimersByTime(5000)
    expect(onExpire).not.toHaveBeenCalled()
  })

  it('pausing twice keeps the time left of the first pause', () => {
    const onExpire = vi.fn()
    const timer = createToastTimer(onExpire)
    timer.start(5000)
    vi.advanceTimersByTime(1000)
    timer.pause()
    vi.advanceTimersByTime(2000)
    timer.pause()
    timer.resume()
    vi.advanceTimersByTime(3999)
    expect(onExpire).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(onExpire).toHaveBeenCalledOnce()
  })

  it('pausing with nothing running (held / stopped) does not pause', () => {
    const timer = createToastTimer(vi.fn())
    timer.pause()
    expect(timer.paused).toBe(false)
    timer.hold()
    timer.pause()
    expect(timer.paused).toBe(false)
  })

  it('resume without a pause does nothing', () => {
    const onExpire = vi.fn()
    const timer = createToastTimer(onExpire)
    timer.resume()
    vi.advanceTimersByTime(MIN_RESUME_MS * 10)
    expect(onExpire).not.toHaveBeenCalled()
  })
})
