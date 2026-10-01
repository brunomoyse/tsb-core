// Parity check with `tsb-service/internal/modules/order/domain/pricing_test.go` (TestPriceLine).
// Run: `node --test layers/engine/utils/pricing.test.mjs`. Same cases, same expected results.

import { exactUnitPriceCents, lineTotalCents as itemLineTotalCents, unitPriceCents as itemUnitPriceCents, priceLine, toCents } from './pricing.ts'
import assert from 'node:assert/strict'
import { test } from 'node:test'

const cases = [
  { name: 'no selections', base: '12.50', qty: 3, selections: [], lineTotal: '37.50', unit: '12.50' },
  {
    name: 'qty 1 with a paid choice',
    base: '12.00', qty: 1,
    selections: [{ modifier: '1.50', quantity: 1 }],
    lineTotal: '13.50', unit: '13.50',
  },
  {
    // 2 bowls need 2 broths: 12 × 2 + 1.50 × 2, not (12 + 1.50 × 2) × 2.
    name: 'qty 2 with a paid choice scaled to 2',
    base: '12.00', qty: 2,
    selections: [{ modifier: '1.50', quantity: 2 }],
    lineTotal: '27.00', unit: '13.50',
  },
  {
    name: 'qty 3 with mixed multi-select ingredients',
    base: '10.00', qty: 3,
    selections: [
      { modifier: '0.00', quantity: 3 },
      { modifier: '0.50', quantity: 4 },
      { modifier: '1.20', quantity: 2 },
    ],
    lineTotal: '34.40', unit: '11.47',
  },
  {
    name: 'negative modifier is clamped to 0',
    base: '12.00', qty: 2,
    selections: [{ modifier: '-2.00', quantity: 2 }, { modifier: '1.00', quantity: 1 }],
    lineTotal: '25.00', unit: '12.50',
  },
  {
    // Legacy single choice is line-wide: same as selections:[{choice, quantity: qty}].
    name: 'legacy single choice, qty 3',
    base: '8.00', qty: 3,
    selections: [{ modifier: '0.50', quantity: 3 }],
    lineTotal: '25.50', unit: '8.50',
  },
  {
    name: 'unit price rounds to cents but total stays exact',
    base: '10.00', qty: 3,
    selections: [{ modifier: '0.50', quantity: 1 }],
    lineTotal: '30.50', unit: '10.17',
  },
]

for (const c of cases) {
  test(`priceLine: ${c.name}`, () => {
    const { lineTotalCents, unitPriceCents } = priceLine(c.base, c.qty, c.selections)
    assert.strictEqual(lineTotalCents, toCents(c.lineTotal), 'lineTotal')
    assert.strictEqual(unitPriceCents, toCents(c.unit), 'unitPrice')
  })
}

// Same cases through the cart-item helpers the stores/composables/modals use.
const asItem = (c, legacy = false) => {
  const choices = c.selections.map((s, i) => ({ id: `c${i}`, priceModifier: s.modifier }))
  const base = { quantity: c.qty, product: { price: c.base, choices } }
  if (legacy) return { ...base, selectedChoices: [], selectedChoice: choices[0] }
  return { ...base, selectedChoices: c.selections.map((s, i) => ({ choiceId: `c${i}`, quantity: s.quantity })) }
}

for (const c of cases) {
  test(`cart item helpers: ${c.name}`, () => {
    const item = asItem(c)
    assert.strictEqual(itemLineTotalCents(item), toCents(c.lineTotal))
    assert.strictEqual(itemUnitPriceCents(item), toCents(c.unit))
  })
}

test('legacy selectedChoice (no selections) prices like a selection scaled to the line qty', () => {
  const c = cases.find((x) => x.name === 'legacy single choice, qty 3')
  assert.strictEqual(itemLineTotalCents(asItem(c, true)), toCents(c.lineTotal))
})

test('two bowls with a 1.50 broth cost base × 2 + 3.00', () => {
  const item = {
    quantity: 2,
    product: { price: '12.00', choices: [{ id: 'broth', priceModifier: '1.50' }] },
    selectedChoices: [{ choiceId: 'broth', quantity: 2 }],
  }
  assert.strictEqual(itemLineTotalCents(item), 2700)
})

test('exactUnitPriceCents is null when the unit price would not multiply back', () => {
  const [, , exact] = cases
  assert.strictEqual(exactUnitPriceCents(asItem(exact)), 1350)
  assert.strictEqual(exactUnitPriceCents(asItem(cases[6])), null)
})

test('summing line totals in cents is exact (no float drift)', () => {
  // Ten lines of 0.10 must be exactly 1.00 (summed as euro floats they give 0.9999999999999999).
  const cents = Array.from({ length: 10 }, () => priceLine('0.10', 1).lineTotalCents).reduce((a, b) => a + b, 0)
  assert.strictEqual(cents, 100)
})
