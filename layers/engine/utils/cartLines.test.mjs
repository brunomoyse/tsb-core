// Quantity changes on cart lines with choice selections (audit PR 1.4).
// Run: `node --test layers/engine/utils/cartLines.test.mjs`.

import { addSelections, canChangeLineQuantity, lineSignature, mergeIntoLine, perUnitSelections, rescaleSelections } from './cartLines.ts'
import assert from 'node:assert/strict'
import { test } from 'node:test'

const broth = (quantity) => ({ groupId: 'g-broth', choiceId: 'c-tomato', quantity })
const spice = (quantity) => ({ groupId: 'g-spice', choiceId: 'c-mild', quantity })

test('perUnitSelections divides every selection by the line quantity', () => {
  assert.deepStrictEqual(perUnitSelections([broth(2), spice(2)], 2), [broth(1), spice(1)])
  assert.deepStrictEqual(perUnitSelections([broth(6)], 3), [broth(2)])
  assert.deepStrictEqual(perUnitSelections([], 4), [])
})

test('perUnitSelections is null when the composition is not uniform per unit', () => {
  // Two bowls, one broth A and one broth B: each choice appears once for two units.
  assert.strictEqual(perUnitSelections([{ groupId: 'g', choiceId: 'a', quantity: 1 }, { groupId: 'g', choiceId: 'b', quantity: 1 }], 2), null)
  assert.strictEqual(perUnitSelections([broth(5)], 2), null)
})

test('perUnitSelections rejects a nonsensical line quantity', () => {
  assert.strictEqual(perUnitSelections([broth(1)], 0), null)
  assert.strictEqual(perUnitSelections([broth(1)], 1.5), null)
})

test('rescaleSelections: +1 on 1 bowl asks for 2 broths, -1 gets back to 1', () => {
  assert.deepStrictEqual(rescaleSelections([broth(1), spice(1)], 1, 2), [broth(2), spice(2)])
  assert.deepStrictEqual(rescaleSelections([broth(2), spice(2)], 2, 1), [broth(1), spice(1)])
  assert.deepStrictEqual(rescaleSelections([broth(3)], 3, 4), [broth(4)])
})

test('rescaleSelections keeps a multi-select composition (4 shrimp + 6 beef on 2 bowls → 3 bowls)', () => {
  const shrimp = (quantity) => ({ groupId: 'g-ing', choiceId: 'c-shrimp', quantity })
  const beef = (quantity) => ({ groupId: 'g-ing', choiceId: 'c-beef', quantity })
  assert.deepStrictEqual(rescaleSelections([shrimp(4), beef(6)], 2, 3), [shrimp(6), beef(9)])
})

test('rescaleSelections leaves a non-uniform line alone (null)', () => {
  assert.strictEqual(rescaleSelections([broth(1)], 2, 3), null)
})

test('rescaleSelections on a plain line has nothing to rescale', () => {
  assert.deepStrictEqual(rescaleSelections([], 2, 3), [])
})

test('canChangeLineQuantity', () => {
  assert.strictEqual(canChangeLineQuantity([], 3), true)
  assert.strictEqual(canChangeLineQuantity(undefined, 3), true)
  assert.strictEqual(canChangeLineQuantity([broth(2)], 2), true)
  assert.strictEqual(canChangeLineQuantity([broth(1)], 2), false)
})

test('lineSignature is per unit: 1 bowl and 2 bowls with the same choices are one line', () => {
  assert.strictEqual(lineSignature([broth(1), spice(1)], 1), lineSignature([broth(2), spice(2)], 2))
  assert.strictEqual(lineSignature([spice(2), broth(2)], 2), lineSignature([broth(1), spice(1)], 1))
})

test('lineSignature separates different compositions and the plain product', () => {
  assert.notStrictEqual(lineSignature([broth(1)], 1), lineSignature([spice(1)], 1))
  assert.notStrictEqual(lineSignature([broth(2)], 1), lineSignature([broth(1)], 1)) // 2 broths for one unit ≠ 1
  assert.strictEqual(lineSignature([], 5), '')
})

test('lineSignature keeps a non-uniform line apart from a uniform one with the same totals', () => {
  // Qty 3 with {broth: 2} is not uniform; qty 1 with {broth: 2} is.
  assert.notStrictEqual(lineSignature([broth(2)], 3), lineSignature([broth(2)], 1))
  assert.strictEqual(lineSignature([broth(2)], 3), lineSignature([broth(2)], 3))
  assert.notStrictEqual(lineSignature([broth(2)], 3), lineSignature([broth(2)], 5))
})

test('merging via rescale: adding a bowl to a line equals the rescaled sum of both', () => {
  // Existing 1 bowl (broth 1) + new 2 bowls (broth 2) → 3 bowls, broth 3, one signature throughout
  const merged = rescaleSelections([broth(1)], 1, 3)
  assert.deepStrictEqual(merged, [broth(3)])
  assert.strictEqual(lineSignature(merged, 3), lineSignature([broth(2)], 2))
})

test('addSelections sums identical non-uniform lines choice by choice', () => {
  const a = { groupId: 'g', choiceId: 'a', quantity: 1 }
  const b = { groupId: 'g', choiceId: 'b', quantity: 1 }
  assert.deepStrictEqual(addSelections([a, b], [a, b]), [{ ...a, quantity: 2 }, { ...b, quantity: 2 }])
})

test('mergeIntoLine: a plain line just adds quantity, capped', () => {
  assert.deepStrictEqual(mergeIntoLine({ quantity: 2, selections: [] }, { quantity: 3, selections: [] }, 99), { quantity: 5, selections: [] })
  assert.deepStrictEqual(mergeIntoLine({ quantity: 98, selections: [] }, { quantity: 3, selections: [] }, 99), { quantity: 99, selections: [] })
})

test('mergeIntoLine: a uniform line keeps its selections in step with the quantity', () => {
  // One bowl (broth 1, spice 1) + 2 more bowls (broth 2, spice 2) → 3 bowls, broth 3, spice 3.
  assert.deepStrictEqual(
    mergeIntoLine({ quantity: 1, selections: [broth(1), spice(1)] }, { quantity: 2, selections: [broth(2), spice(2)] }, 99),
    { quantity: 3, selections: [broth(3), spice(3)] },
  )
})

test('mergeIntoLine: the cap rescales the selections too, never leaves them behind', () => {
  assert.deepStrictEqual(
    mergeIntoLine({ quantity: 98, selections: [broth(98)] }, { quantity: 5, selections: [broth(5)] }, 99),
    { quantity: 99, selections: [broth(99)] },
  )
})

test('mergeIntoLine: identical non-uniform lines add up, and refuse to exceed the cap', () => {
  const a = { groupId: 'g', choiceId: 'a', quantity: 1 }
  const b = { groupId: 'g', choiceId: 'b', quantity: 1 }
  assert.deepStrictEqual(
    mergeIntoLine({ quantity: 2, selections: [a, b] }, { quantity: 2, selections: [a, b] }, 99),
    { quantity: 4, selections: [{ ...a, quantity: 2 }, { ...b, quantity: 2 }] },
  )
  assert.strictEqual(mergeIntoLine({ quantity: 98, selections: [a, b] }, { quantity: 2, selections: [a, b] }, 99), null)
})
