// Image priority on the menu page (audit PR 3.7, P2).
// Run: `node --test layers/engine/utils/menuImagePriority.test.mjs`.

import { categoryCardOffsets, menuImagePriority } from './menuImagePriority.ts'
import assert from 'node:assert/strict'
import { test } from 'node:test'

test('only the first two images of the page are high priority', () => {
  const high = Array.from({ length: 60 }, (_, i) => menuImagePriority(i)).filter((p) => p.fetchpriority === 'high')
  assert.equal(high.length, 2)
})

test('the first four load eagerly, the rest lazily and at low priority', () => {
  assert.deepEqual(menuImagePriority(0), { loading: 'eager', fetchpriority: 'high' })
  assert.deepEqual(menuImagePriority(1), { loading: 'eager', fetchpriority: 'high' })
  assert.deepEqual(menuImagePriority(2), { loading: 'eager', fetchpriority: undefined })
  assert.deepEqual(menuImagePriority(3), { loading: 'eager', fetchpriority: undefined })
  assert.deepEqual(menuImagePriority(4), { loading: 'lazy', fetchpriority: 'low' })
  assert.deepEqual(menuImagePriority(59), { loading: 'lazy', fetchpriority: 'low' })
})

test('a card in the second category is not eager just because it is the first of its category', () => {
  const offsets = categoryCardOffsets([5, 8, 3])
  assert.deepEqual(offsets, [0, 5, 13])
  assert.equal(menuImagePriority(offsets[1] + 0).loading, 'lazy')
  assert.equal(menuImagePriority(offsets[0] + 3).loading, 'eager')
})

test('no categories, no offsets', () => {
  assert.deepEqual(categoryCardOffsets([]), [])
})
