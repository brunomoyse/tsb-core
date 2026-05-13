// Parity check with `tsb-service/pkg/money/rounding_test.go`.
// Run: `node --experimental-strip-types --test utils/money.test.mjs`.
// Uses Node's built-in test runner so no new dependency is added to tsb-core.

import assert from 'node:assert/strict'
import { roundToNearest10Cents } from './money.ts'
import { test } from 'node:test'

test('all last-digit cases', () => {
  const cases = [
    [24.4, 24.4],
    [24.41, 24.4],
    [24.42, 24.4],
    [24.43, 24.4],
    [24.44, 24.4],
    [24.45, 24.5],
    [24.46, 24.5],
    [24.47, 24.5],
    [24.48, 24.5],
    [24.49, 24.5],
    [12.95, 13.0],
    [12.99, 13.0],
    [99.95, 100.0],
    [2.68, 2.7],
    [0.0, 0.0],
    [10.0, 10.0],
  ]
  for (const [input, expected] of cases) {
    assert.strictEqual(roundToNearest10Cents(input), expected, `round(${input})`)
  }
})

test('idempotence', () => {
  for (const v of [24.42, 24.45, 12.93, 12.97, 0.03, 999.99]) {
    const once = roundToNearest10Cents(v)
    const twice = roundToNearest10Cents(once)
    assert.strictEqual(twice, once, `idempotence for ${v}`)
  }
})

test('negative inputs round symmetrically', () => {
  assert.strictEqual(roundToNearest10Cents(-2.68), -2.7)
  assert.strictEqual(roundToNearest10Cents(-2.42), -2.4)
  assert.strictEqual(roundToNearest10Cents(-2.45), -2.5)
  assert.strictEqual(roundToNearest10Cents(-0.01), 0)
})
