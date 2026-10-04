// Parity check with `tsb-service/pkg/money/rounding_test.go`, in integer cents.
// Run: `vp test run layers/engine/utils/money.test.mjs`.
// Uses Node's built-in test runner so no new dependency is added to tsb-core.

import {
  centsToDecimalString,
  centsToEuros,
  formatCentsForLocale,
  intlLocaleFor,
  roundCentsToNearest10,
  roundCentsToStep,
  toCents,
} from './money.ts'
import assert from 'node:assert/strict'
import { test } from 'vite-plus/test'

test('all last-digit cases', () => {
  const cases = [
    [2440, 2440],
    [2441, 2440],
    [2442, 2440],
    [2443, 2440],
    [2444, 2440],
    [2445, 2450],
    [2446, 2450],
    [2447, 2450],
    [2448, 2450],
    [2449, 2450],
    [1295, 1300],
    [1299, 1300],
    [9995, 10000],
    [268, 270],
    [0, 0],
    [1000, 1000],
  ]
  for (const [input, expected] of cases) {
    assert.strictEqual(roundCentsToNearest10(input), expected, `round(${input})`)
  }
})

test('idempotence', () => {
  for (const v of [2442, 2445, 1293, 1297, 3, 99999]) {
    const once = roundCentsToNearest10(v)
    assert.strictEqual(roundCentsToNearest10(once), once, `idempotence for ${v}`)
  }
})

test('negative inputs round symmetrically', () => {
  assert.strictEqual(roundCentsToNearest10(-268), -270)
  assert.strictEqual(roundCentsToNearest10(-242), -240)
  assert.strictEqual(roundCentsToNearest10(-245), -250)
  assert.strictEqual(roundCentsToNearest10(-1), 0)
  assert.ok(Object.is(roundCentsToNearest10(-1), 0), 'never -0')
})

test('toCents parses API decimal strings and numbers once', () => {
  assert.strictEqual(toCents('24.15'), 2415)
  assert.strictEqual(toCents('12.5'), 1250)
  assert.strictEqual(toCents(0.1 + 0.2), 30)
  assert.strictEqual(toCents(null), 0)
  assert.strictEqual(toCents(undefined), 0)
  assert.strictEqual(toCents('abc'), 0)
  // The classic float trap: 4.35 * 100 = 434.99999999999994
  assert.strictEqual(toCents('4.35'), 435)
  assert.strictEqual(toCents('8.2'), 820)
})

test('centsToDecimalString is exact and always has two decimals', () => {
  assert.strictEqual(centsToDecimalString(2415), '24.15')
  assert.strictEqual(centsToDecimalString(5), '0.05')
  assert.strictEqual(centsToDecimalString(0), '0.00')
  assert.strictEqual(centsToDecimalString(1250), '12.50')
  assert.strictEqual(centsToDecimalString(-270), '-2.70')
  assert.strictEqual(centsToDecimalString(100000), '1000.00')
  // Round trip through the API string.
  for (const cents of [0, 1, 9, 10, 99, 100, 101, 2415, 99999]) {
    assert.strictEqual(toCents(centsToDecimalString(cents)), cents)
  }
})

test('centsToEuros is the display-edge division', () => {
  assert.strictEqual(centsToEuros(2500), 25)
  assert.strictEqual(centsToEuros(30), 0.3)
})

test('price formatting follows the app locale, always EUR (audit V11)', () => {
  assert.strictEqual(intlLocaleFor('fr'), 'fr-BE')
  assert.strictEqual(intlLocaleFor('nl'), 'nl-BE')
  assert.strictEqual(intlLocaleFor('en'), 'en-IE')
  assert.strictEqual(intlLocaleFor('zh'), 'zh-CN')
  assert.strictEqual(intlLocaleFor('fr-BE'), 'fr-BE')
  assert.strictEqual(intlLocaleFor(undefined), 'fr-BE')
  assert.strictEqual(intlLocaleFor('de'), 'fr-BE', 'unknown locales fall back to the default')

  const norm = (s) => s.replace(/[\u00a0\u202f]/gu, ' ')
  assert.strictEqual(norm(formatCentsForLocale(2415, 'fr')), '24,15 €')
  assert.strictEqual(norm(formatCentsForLocale(2415, 'nl')), '€ 24,15')
  assert.strictEqual(norm(formatCentsForLocale(2415, 'en')), '€24.15')
  assert.strictEqual(norm(formatCentsForLocale(2415, 'zh')), '€24.15')
  assert.strictEqual(norm(formatCentsForLocale(0, 'fr')), '0,00 €')
  assert.strictEqual(norm(formatCentsForLocale(123456, 'fr')), '1 234,56 €')
})

test('roundCentsToStep rounds to the policy step, ties up, and keeps 10 as roundCentsToNearest10', () => {
  assert.strictEqual(roundCentsToStep(2442, 10), roundCentsToNearest10(2442))
  assert.strictEqual(roundCentsToStep(2445, 10), 2450)
  // 5 cent step: 24,42 -> 24,40, 24,43 -> 24,45 (2.5 is the tie, up)
  assert.strictEqual(roundCentsToStep(2442, 5), 2440)
  assert.strictEqual(roundCentsToStep(2443, 5), 2445)
  assert.strictEqual(roundCentsToStep(2447, 5), 2445)
  assert.strictEqual(roundCentsToStep(2448, 5), 2450)
  // A 1 cent step (no rounding) and a 25 cent step
  assert.strictEqual(roundCentsToStep(2442, 1), 2442)
  assert.strictEqual(roundCentsToStep(2462, 25), 2450)
  assert.strictEqual(roundCentsToStep(2463, 25), 2475)
  assert.strictEqual(roundCentsToStep(-2463, 25), -2475)
  assert.ok(Object.is(roundCentsToStep(-1, 10), 0), 'never -0')
})

test('roundCentsToStep leaves non-finite amounts alone', () => {
  assert.ok(Number.isNaN(roundCentsToStep(Number.NaN, 10)))
  assert.strictEqual(roundCentsToStep(Infinity, 10), Infinity)
  assert.strictEqual(roundCentsToStep(-Infinity, 10), -Infinity)
})

test('roundCentsToStep with no usable step only rounds to whole cents and never returns -0', () => {
  assert.strictEqual(roundCentsToStep(12.4, 1), 12)
  assert.strictEqual(roundCentsToStep(12.6, 0), 13)
  assert.strictEqual(roundCentsToStep(5, Number.NaN), 5)
  assert.ok(Object.is(roundCentsToStep(-0.4, 1), 0))
  assert.ok(Object.is(roundCentsToStep(0.2, 1), 0))
})
