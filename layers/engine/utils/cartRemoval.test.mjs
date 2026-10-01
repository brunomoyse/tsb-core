// The undo batching of removed cart lines (audit M19).
// Run: `node --test layers/engine/utils/cartRemoval.test.mjs`.

import { REMOVAL_TOAST_GROUP, nextRemovalBatch, removalToastMessage } from './cartRemoval.ts'
import assert from 'node:assert/strict'
import { test } from 'node:test'

test('a removal with no toast alive starts a fresh batch', () => {
  assert.deepEqual(nextRemovalBatch([], 'a', false), ['a'])
  assert.deepEqual(nextRemovalBatch(['old'], 'a', false), ['a'])
})

test('removals while the toast is alive accumulate, in order, so one Undo restores them all', () => {
  let batch = nextRemovalBatch([], 'a', false)
  batch = nextRemovalBatch(batch, 'b', true)
  batch = nextRemovalBatch(batch, 'c', true)
  assert.deepEqual(batch, ['a', 'b', 'c'])
})

test('after the toast is gone (expired, closed, undone) the next removal starts over', () => {
  const batch = nextRemovalBatch(['a', 'b'], 'c', false)
  assert.deepEqual(batch, ['c'])
})

test('the input batch is never mutated', () => {
  const batch = Object.freeze(['a'])
  assert.deepEqual(nextRemovalBatch(batch, 'b', true), ['a', 'b'])
  assert.deepEqual(batch, ['a'])
})

test('one line shows its name, several show a count', () => {
  assert.equal(removalToastMessage(1), 'one')
  assert.equal(removalToastMessage(2), 'many')
  assert.equal(removalToastMessage(7), 'many')
  assert.equal(typeof REMOVAL_TOAST_GROUP, 'string')
})
