// Run: `vp test run layers/engine/utils/cashPayment.test.mjs`.

import { evaluateCashAmount, sanitizeCashAmount } from './cashPayment.ts'
import assert from 'node:assert/strict'
import { test } from 'vite-plus/test'

test('an empty amount is fine: the field is optional', () => {
  assert.deepEqual(evaluateCashAmount('', 3050), { kind: 'none' })
  assert.deepEqual(evaluateCashAmount(null, 3050), { kind: 'none' })
  assert.deepEqual(evaluateCashAmount('  ', 3050), { kind: 'none' })
})

test('below the total is short, with what is missing', () => {
  assert.deepEqual(evaluateCashAmount('20', 3050), { kind: 'short', missingCents: 1050 })
  assert.deepEqual(evaluateCashAmount('30.49', 3050), { kind: 'short', missingCents: 1 })
})

test('zero or not an amount is short (never silently accepted)', () => {
  assert.equal(evaluateCashAmount('0', 3050).kind, 'short')
  assert.equal(evaluateCashAmount('.', 3050).kind, 'short')
  assert.equal(evaluateCashAmount('0', 0).kind, 'short')
})

test('exactly the total needs no change', () => {
  assert.deepEqual(evaluateCashAmount('30.50', 3050), { kind: 'exact' })
  assert.deepEqual(evaluateCashAmount('30,5', 3050), { kind: 'exact' })
})

test('above the total reports the change due', () => {
  assert.deepEqual(evaluateCashAmount('50', 3050), { kind: 'change', changeCents: 1950 })
  assert.deepEqual(evaluateCashAmount('50.00', 3050), { kind: 'change', changeCents: 1950 })
})

test('sanitizeCashAmount keeps digits and two decimals, accepts a comma, and says null for nothing', () => {
  assert.equal(sanitizeCashAmount('25,5'), '25.5')
  assert.equal(sanitizeCashAmount('25.567'), '25.56')
  assert.equal(sanitizeCashAmount('abc'), null)
  assert.equal(sanitizeCashAmount(''), null)
  assert.equal(sanitizeCashAmount(null), null)
  assert.equal(sanitizeCashAmount(undefined), null)
  assert.equal(sanitizeCashAmount(30), '30')
  assert.equal(sanitizeCashAmount('.5'), '.5')
})
