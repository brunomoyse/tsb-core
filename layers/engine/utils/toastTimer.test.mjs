import { MIN_RESUME_MS, createToastTimer } from './toastTimer.ts'
import assert from 'node:assert/strict'
import { test } from 'vite-plus/test'

// A clock the test moves by hand; timers fire when `advance` passes them.
const fakeEnv = () => {
  let t = 0
  let next = 1
  const timers = new Map()
  return {
    env: {
      now: () => t,
      set: (fn, ms) => {
        const id = next++
        timers.set(id, { at: t + ms, fn })
        return id
      },
      clear: (id) => {
        timers.delete(id)
      },
    },
    advance(ms) {
      const end = t + ms
      for (;;) {
        const [due] = [...timers.entries()]
          .filter(([, v]) => v.at <= end)
          .sort((a, b) => a[1].at - b[1].at)
        if (!due) break
        timers.delete(due[0])
        t = due[1].at
        due[1].fn()
      }
      t = end
    },
    get pending() {
      return timers.size
    },
  }
}

test('expires after its duration', () => {
  const clock = fakeEnv()
  let expired = 0
  const timer = createToastTimer(() => {
    expired++
  }, clock.env)
  timer.start(5000)
  clock.advance(4999)
  assert.equal(expired, 0)
  clock.advance(1)
  assert.equal(expired, 1)
})

test('pause keeps the time left and resume runs it on', () => {
  const clock = fakeEnv()
  let expired = 0
  const timer = createToastTimer(() => {
    expired++
  }, clock.env)
  timer.start(5000)
  clock.advance(1000)
  timer.pause()
  assert.equal(timer.paused, true)
  clock.advance(60_000)
  assert.equal(expired, 0)
  timer.resume()
  clock.advance(3999)
  assert.equal(expired, 0)
  clock.advance(1)
  assert.equal(expired, 1)
})

test('resume gives at least MIN_RESUME_MS', () => {
  const clock = fakeEnv()
  let expired = 0
  const timer = createToastTimer(() => {
    expired++
  }, clock.env)
  timer.start(5000)
  clock.advance(4900)
  timer.pause()
  timer.resume()
  clock.advance(MIN_RESUME_MS - 1)
  assert.equal(expired, 0)
  clock.advance(1)
  assert.equal(expired, 1)
})

test('a restart while paused (the same message shown again) stays held until resume', () => {
  const clock = fakeEnv()
  let expired = 0
  const timer = createToastTimer(() => {
    expired++
  }, clock.env)
  timer.start(5000)
  clock.advance(1000)
  timer.pause()
  timer.start(5000)
  assert.equal(clock.pending, 0)
  clock.advance(120_000)
  assert.equal(expired, 0)
  timer.resume()
  clock.advance(4999)
  assert.equal(expired, 0)
  clock.advance(1)
  assert.equal(expired, 1)
})

test('a replacement while paused is held too, with the new duration', () => {
  const clock = fakeEnv()
  let expired = 0
  const timer = createToastTimer(() => {
    expired++
  }, clock.env)
  timer.start(5000)
  timer.pause()
  timer.start(8000) // The replacing toast
  clock.advance(60_000)
  assert.equal(expired, 0)
  timer.resume()
  clock.advance(8000)
  assert.equal(expired, 1)
})

test('pausing twice does not lose time, and a pause with no timer is a no-op', () => {
  const clock = fakeEnv()
  let expired = 0
  const timer = createToastTimer(() => {
    expired++
  }, clock.env)
  timer.pause()
  assert.equal(timer.paused, false)
  timer.start(5000)
  clock.advance(1000)
  timer.pause()
  clock.advance(1000)
  timer.pause()
  timer.resume()
  clock.advance(3999)
  assert.equal(expired, 0)
  clock.advance(1)
  assert.equal(expired, 1)
})

test('stop ends the pause: the next toast runs normally', () => {
  const clock = fakeEnv()
  let expired = 0
  const timer = createToastTimer(() => {
    expired++
  }, clock.env)
  timer.start(5000)
  timer.pause()
  timer.stop()
  assert.equal(timer.paused, false)
  timer.start(2000)
  clock.advance(2000)
  assert.equal(expired, 1)
})

test('hold stops the clock but keeps the pause (a persistent toast replacing the one being read)', () => {
  const clock = fakeEnv()
  const timer = createToastTimer(() => {}, clock.env)
  timer.start(5000)
  timer.pause()
  timer.hold()
  assert.equal(timer.paused, true)
  assert.equal(clock.pending, 0)
})
