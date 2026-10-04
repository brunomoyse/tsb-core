// WhenIdle: run a task when the browser is idle (requestIdleCallback), or after a second where it does not exist.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { whenIdle } from '#engine/utils/whenIdle'

interface Idle {
  requestIdleCallback?: unknown
  cancelIdleCallback?: unknown
}
const scope = window as unknown as Idle

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  vi.useRealTimers()
  delete scope.requestIdleCallback
  delete scope.cancelIdleCallback
})

describe('whenIdle with requestIdleCallback', () => {
  it('schedules the task with the timeout and cancels with the same id', () => {
    const request = vi.fn(() => 42)
    const cancel = vi.fn()
    scope.requestIdleCallback = request
    scope.cancelIdleCallback = cancel
    const task = vi.fn()
    const stop = whenIdle(task, 2500)
    expect(request).toHaveBeenCalledExactlyOnceWith(task, { timeout: 2500 })
    stop()
    expect(cancel).toHaveBeenCalledExactlyOnceWith(42)
  })

  it('defaults the timeout to 3 seconds', () => {
    const request = vi.fn((_task: unknown, _options: unknown) => 1)
    scope.requestIdleCallback = request
    scope.cancelIdleCallback = vi.fn()
    whenIdle(vi.fn())
    expect(request.mock.calls[0]![1]).toEqual({ timeout: 3000 })
  })
})

describe('whenIdle without requestIdleCallback (Safari)', () => {
  it('runs the task after one second', () => {
    const task = vi.fn()
    whenIdle(task)
    vi.advanceTimersByTime(999)
    expect(task).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(task).toHaveBeenCalledOnce()
  })

  it('cancel prevents it', () => {
    const task = vi.fn()
    whenIdle(task)()
    vi.advanceTimersByTime(5000)
    expect(task).not.toHaveBeenCalled()
  })
})
