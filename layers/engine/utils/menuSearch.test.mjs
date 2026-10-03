// The `?q=` of the menu page (audit PR 3.8, P9).
// Run: `vp test run layers/engine/utils/menuSearch.test.mjs`.

import { MAX_SEARCH_LENGTH, searchFromQuery } from './menuSearch.ts'
import assert from 'node:assert/strict'
import { test } from 'vite-plus/test'

test('a term is taken as typed, trimmed', () => {
  assert.equal(searchFromQuery('  sushi '), 'sushi')
  assert.equal(searchFromQuery('bouillon tomate'), 'bouillon tomate')
})

test('a repeated parameter takes the first, a missing or odd one is empty', () => {
  assert.equal(searchFromQuery(['a', 'b']), 'a')
  for (const v of [undefined, null, '', [], [null], 42, {}]) assert.equal(searchFromQuery(v), '')
})

test('the length is capped', () => {
  assert.equal(searchFromQuery('x'.repeat(500)).length, MAX_SEARCH_LENGTH)
})
