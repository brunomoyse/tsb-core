// Stale-chunk errors trigger a reload instead of a Sentry alert.
// Run: `vp test run layers/engine/utils/chunkError.test.mjs`.

import assert from 'node:assert/strict'
import { isChunkLoadError } from './chunkError.ts'
import { test } from 'vite-plus/test'

test('matches the chunk-load wording of every browser engine', () => {
  for (const message of [
    'Importing a module script failed.',
    'Failed to fetch dynamically imported module: https://x/_nuxt/A1b2.js',
    'error loading dynamically imported module: https://x/_nuxt/A1b2.js',
    'Unable to preload CSS for /_nuxt/entry.css',
  ]) {
    assert.ok(isChunkLoadError(new TypeError(message)), message)
  }
})

test('ignores unrelated errors', () => {
  assert.equal(isChunkLoadError(new TypeError('Failed to fetch')), false)
  assert.equal(isChunkLoadError(new Error('Cannot read properties of undefined')), false)
  assert.equal(isChunkLoadError(undefined), false)
})
