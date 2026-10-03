// The toast queue: one at a time, grouped toasts replace each other, bounded (audit M19).
// Run: `vp test run layers/engine/utils/toastQueue.test.mjs`.

import { MAX_QUEUED_TOASTS, advanceToast, enqueueToast, hasToastGroup } from './toastQueue.ts'
import assert from 'node:assert/strict'
import { test } from 'vite-plus/test'

let id = 0
const toast = (message, extra = {}) => ({ id: ++id, message, variant: 'neutral', ...extra })
const empty = () => ({ current: null, queue: [] })

test('the first toast is shown at once, the next ones wait their turn in order', () => {
  let state = enqueueToast(empty(), toast('one'))
  assert.equal(state.current.message, 'one')
  assert.equal(state.currentChanged, true)
  state = enqueueToast(state, toast('two'))
  state = enqueueToast(state, toast('three'))
  assert.equal(state.current.message, 'one')
  assert.equal(state.currentChanged, false)
  assert.deepEqual(
    state.queue.map((t) => t.message),
    ['two', 'three'],
  )
  state = advanceToast(state)
  assert.equal(state.current.message, 'two')
  state = advanceToast(state)
  assert.equal(state.current.message, 'three')
  state = advanceToast(state)
  assert.equal(state.current, null)
  assert.deepEqual(advanceToast(state), { current: null, queue: [] })
})

test('a toast of the same group replaces the one showing and restarts its timer', () => {
  let state = enqueueToast(
    empty(),
    toast('removed A', { group: 'cart-removal', action: { label: 'Undo' } }),
  )
  state = enqueueToast(
    state,
    toast('2 removed', { group: 'cart-removal', action: { label: 'Undo' } }),
  )
  assert.equal(state.current.message, '2 removed')
  assert.equal(state.currentChanged, true)
  assert.deepEqual(state.queue, [])
})

test('a toast of the same group replaces the waiting one, not the showing one', () => {
  let state = enqueueToast(empty(), toast('unrelated'))
  state = enqueueToast(
    state,
    toast('removed A', { group: 'cart-removal', action: { label: 'Undo' } }),
  )
  state = enqueueToast(
    state,
    toast('2 removed', { group: 'cart-removal', action: { label: 'Undo' } }),
  )
  assert.equal(state.current.message, 'unrelated')
  assert.equal(state.currentChanged, false)
  assert.deepEqual(
    state.queue.map((t) => t.message),
    ['2 removed'],
  )
})

test('the same message is not announced twice, while showing or waiting', () => {
  let state = enqueueToast(empty(), toast('network error', { variant: 'error' }))
  state = enqueueToast(state, toast('network error', { variant: 'error' }))
  assert.equal(state.restartCurrent, true)
  assert.deepEqual(state.queue, [])
  state = enqueueToast(state, toast('other'))
  state = enqueueToast(state, toast('other'))
  assert.deepEqual(
    state.queue.map((t) => t.message),
    ['other'],
  )
  // A different variant is a different announcement.
  state = enqueueToast(state, toast('other', { variant: 'error' }))
  assert.equal(state.queue.length, 2)
})

test('toasts with an action are never collapsed into identical ones', () => {
  let state = enqueueToast(empty(), toast('removed X', { action: { label: 'Undo' } }))
  state = enqueueToast(state, toast('removed X', { action: { label: 'Undo' } }))
  assert.deepEqual(
    state.queue.map((t) => t.message),
    ['removed X'],
  )
})

test('the queue is bounded; toasts with an action are dropped last', () => {
  let state = enqueueToast(empty(), toast('shown'))
  state = enqueueToast(state, toast('undo me', { action: { label: 'Undo' } }))
  for (let i = 0; i < MAX_QUEUED_TOASTS; i++) state = enqueueToast(state, toast(`filler ${i}`))
  assert.equal(state.queue.length, MAX_QUEUED_TOASTS)
  assert.equal(state.queue[0].message, 'undo me')
  assert.equal(state.queue.at(-1).message, `filler ${MAX_QUEUED_TOASTS - 1}`)
  assert.equal(
    state.queue.some((t) => t.message === 'filler 0'),
    false,
  )

  // Only action toasts waiting: the oldest of them goes.
  let full = enqueueToast(empty(), toast('shown'))
  for (let i = 0; i < MAX_QUEUED_TOASTS + 1; i++)
    full = enqueueToast(full, toast(`undo ${i}`, { action: { label: 'Undo' } }))
  assert.equal(full.queue.length, MAX_QUEUED_TOASTS)
  assert.equal(full.queue[0].message, 'undo 1')
})

test('hasToastGroup sees the showing and the waiting toast', () => {
  let state = enqueueToast(empty(), toast('a', { group: 'g' }))
  assert.equal(hasToastGroup(state, 'g'), true)
  assert.equal(hasToastGroup(state, 'h'), false)
  state = enqueueToast(state, toast('b', { group: 'h' }))
  state = advanceToast(state)
  assert.equal(hasToastGroup(state, 'g'), false)
  assert.equal(hasToastGroup(state, 'h'), true)
  assert.equal(hasToastGroup(advanceToast(state), 'h'), false)
})
