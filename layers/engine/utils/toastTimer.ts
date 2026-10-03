/*
 * The expiry clock of the toast on screen, kept apart from the Pinia store so it can be tested with a
 * fake clock. A toast is paused while it is hovered or focused (a toast being read, an Undo being
 * reached for, must not vanish); the time left is kept and runs on after.
 *
 * A pause outlives a toast REPLACEMENT or a restart (a group replacement, the same message shown again):
 * `start` then only records the new duration and holds it until `resume`, so the clock does not start
 * under a pointer that is still on the toast. `stop` (the toast is gone) ends the pause.
 */

export const MIN_RESUME_MS = 1000

export interface TimerEnv<H> {
  now: () => number
  set: (fn: () => void, ms: number) => H
  clear: (handle: H) => void
}

const defaultEnv: TimerEnv<ReturnType<typeof setTimeout>> = {
  now: () => Date.now(),
  set: (fn, ms) => setTimeout(fn, ms),
  clear: (handle) => clearTimeout(handle),
}

export function createToastTimer<H = ReturnType<typeof setTimeout>>(
  onExpire: () => void,
  env: TimerEnv<H> = defaultEnv as unknown as TimerEnv<H>,
) {
  let handle: H | null = null
  let startedAt = 0
  let remaining = 0
  let paused = false

  const clear = (): void => {
    if (handle !== null) env.clear(handle)
    handle = null
  }
  const arm = (ms: number): void => {
    clear()
    remaining = ms
    startedAt = env.now()
    handle = env.set(onExpire, ms)
  }

  return {
    /** A toast (or a restart of it) begins: runs for `ms`, unless the toast is being read: then held until `resume`. */
    start(ms: number): void {
      if (paused) {
        clear()
        remaining = ms
        return
      }
      arm(ms)
    },
    /** Hover or focus: the clock stops (or, while held, stays stopped). */
    pause(): void {
      if (paused) return
      if (handle === null) return
      remaining -= env.now() - startedAt
      clear()
      paused = true
    },
    /** The pointer and the focus left: the rest of the time runs (at least MIN_RESUME_MS). */
    resume(): void {
      if (!paused) return
      paused = false
      arm(Math.max(remaining, MIN_RESUME_MS))
    },
    /** The toast is gone, or has no expiry (persistent): no timer, no pause. */
    stop(): void {
      clear()
      paused = false
    },
    /** Stops the clock without ending a pause (a persistent toast replaced the one being read). */
    hold(): void {
      clear()
    },
    get paused(): boolean {
      return paused
    },
  }
}
