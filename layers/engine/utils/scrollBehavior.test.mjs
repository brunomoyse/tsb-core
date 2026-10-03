// Run: `node --test layers/engine/utils/scrollBehavior.test.mjs`.

import assert from 'node:assert/strict'
import { scrollBehavior } from './scrollBehavior.ts'
import { test } from 'node:test'

const withWindow = (matchMedia, fn) => {
  const previous = globalThis.window
  globalThis.window = matchMedia === undefined ? {} : { matchMedia }
  try { return fn() } finally {
    if (previous === undefined) delete globalThis.window
    else globalThis.window = previous
  }
}

test('smooth by default', () => {
  assert.equal(withWindow(() => ({ matches: false }), scrollBehavior), 'smooth')
})

test('an instant jump when the visitor prefers reduced motion', () => {
  assert.equal(withWindow((query) => ({ matches: query === '(prefers-reduced-motion: reduce)' }), scrollBehavior), 'auto')
})

test('an instant jump without a window (server render) or without matchMedia', () => {
  assert.equal(scrollBehavior(), 'auto')
  assert.equal(withWindow(undefined, scrollBehavior), 'auto')
})
