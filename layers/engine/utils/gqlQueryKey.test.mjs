// The useAsyncData key of a GraphQL query includes its variables (audit R3).
// Run: `node --test layers/engine/utils/gqlQueryKey.test.mjs`.

import assert from 'node:assert/strict'
import { gqlQueryKey } from './gqlQueryKey.ts'
import { test } from 'node:test'

const Q = 'query Product($id: ID!) { product(id: $id) { id } }'

test('different variables give different keys', () => {
  assert.notEqual(gqlQueryKey(Q, { id: 'a' }, 'fr'), gqlQueryKey(Q, { id: 'b' }, 'fr'))
})

test('the same variables give the same key whatever the key order', () => {
  assert.equal(gqlQueryKey(Q, { a: 1, b: { x: 1, y: [1, 2] } }, 'fr'), gqlQueryKey(Q, { b: { y: [1, 2], x: 1 }, a: 1 }, 'fr'))
})

test('array order matters', () => {
  assert.notEqual(gqlQueryKey(Q, { ids: [1, 2] }, 'fr'), gqlQueryKey(Q, { ids: [2, 1] }, 'fr'))
})

test('locale and document are part of the key', () => {
  assert.notEqual(gqlQueryKey(Q, { id: 'a' }, 'fr'), gqlQueryKey(Q, { id: 'a' }, 'en'))
  assert.notEqual(gqlQueryKey(Q, { id: 'a' }, 'fr'), gqlQueryKey(`${Q} `, { id: 'a' }, 'fr'))
})

test('no variables, empty variables and undefined values are one key', () => {
  const k = gqlQueryKey(Q, {}, 'fr')
  assert.equal(gqlQueryKey(Q, undefined, 'fr'), k)
  assert.equal(gqlQueryKey(Q, null, 'fr'), k)
  assert.equal(gqlQueryKey(Q, { id: undefined }, 'fr'), k)
  assert.match(k, /^gql:[^:]+:fr$/u)
})

test('null is a value, not an absence', () => {
  assert.notEqual(gqlQueryKey(Q, { id: null }, 'fr'), gqlQueryKey(Q, {}, 'fr'))
})
