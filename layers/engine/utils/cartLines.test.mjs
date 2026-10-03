// Quantity changes on cart lines with choice selections (audit PR 1.4).
// Run: `node --test layers/engine/utils/cartLines.test.mjs`.

import {
  addSelections,
  canChangeLineQuantity,
  cartLineKey,
  cartLineKeys,
  compareSelections,
  lineSignature,
  matchesLine,
  mergeIntoLine,
  migratePersistedLines,
  perUnitSelections,
  rescaleSelections,
  selectionsSignature,
  sortSelections,
} from './cartLines.ts'
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
  assert.strictEqual(
    perUnitSelections(
      [
        { groupId: 'g', choiceId: 'a', quantity: 1 },
        { groupId: 'g', choiceId: 'b', quantity: 1 },
      ],
      2,
    ),
    null,
  )
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
  assert.deepStrictEqual(addSelections([a, b], [a, b]), [
    { ...a, quantity: 2 },
    { ...b, quantity: 2 },
  ])
})

test('mergeIntoLine: a plain line just adds quantity, capped', () => {
  assert.deepStrictEqual(
    mergeIntoLine({ quantity: 2, selections: [] }, { quantity: 3, selections: [] }, 99),
    { quantity: 5, selections: [] },
  )
  assert.deepStrictEqual(
    mergeIntoLine({ quantity: 98, selections: [] }, { quantity: 3, selections: [] }, 99),
    { quantity: 99, selections: [] },
  )
})

test('mergeIntoLine: a uniform line keeps its selections in step with the quantity', () => {
  // One bowl (broth 1, spice 1) + 2 more bowls (broth 2, spice 2) → 3 bowls, broth 3, spice 3.
  assert.deepStrictEqual(
    mergeIntoLine(
      { quantity: 1, selections: [broth(1), spice(1)] },
      { quantity: 2, selections: [broth(2), spice(2)] },
      99,
    ),
    { quantity: 3, selections: [broth(3), spice(3)] },
  )
})

test('mergeIntoLine: the cap rescales the selections too, never leaves them behind', () => {
  assert.deepStrictEqual(
    mergeIntoLine(
      { quantity: 98, selections: [broth(98)] },
      { quantity: 5, selections: [broth(5)] },
      99,
    ),
    { quantity: 99, selections: [broth(99)] },
  )
})

test('mergeIntoLine: identical non-uniform lines add up, and refuse to exceed the cap', () => {
  const a = { groupId: 'g', choiceId: 'a', quantity: 1 }
  const b = { groupId: 'g', choiceId: 'b', quantity: 1 }
  assert.deepStrictEqual(
    mergeIntoLine({ quantity: 2, selections: [a, b] }, { quantity: 2, selections: [a, b] }, 99),
    {
      quantity: 4,
      selections: [
        { ...a, quantity: 2 },
        { ...b, quantity: 2 },
      ],
    },
  )
  assert.strictEqual(
    mergeIntoLine({ quantity: 98, selections: [a, b] }, { quantity: 2, selections: [a, b] }, 99),
    null,
  )
})

// Group order and choice order disagree here: group 'g-a' sorts before 'g-b', choice 'z' after 'a'.
const gaZ = (quantity) => ({ groupId: 'g-a', choiceId: 'z', quantity })
const gbA = (quantity) => ({ groupId: 'g-b', choiceId: 'a', quantity })

test('one canonical order: by group then choice, independent of locale', () => {
  assert.deepStrictEqual(sortSelections([gbA(1), gaZ(1)]), [gaZ(1), gbA(1)])
  assert.strictEqual(compareSelections(gaZ(1), gbA(1)), -1)
  assert.strictEqual(compareSelections(gaZ(1), gaZ(5)), 0)
})

test('selectionsSignature does not depend on the order the selections come in', () => {
  assert.strictEqual(selectionsSignature([gaZ(2), gbA(2)]), selectionsSignature([gbA(2), gaZ(2)]))
  assert.notStrictEqual(
    selectionsSignature([gaZ(2), gbA(2)]),
    selectionsSignature([gaZ(2), gbA(1)]),
  )
})

test('merge then remove/increment finds the line (audit PR 1.4 review)', () => {
  // Two identical non-uniform lines (2 bowls, one of each choice) merge into one with summed selections.
  const stored = sortSelections([gbA(1), gaZ(1)]) // what the store keeps (canonical)
  const merged = mergeIntoLine(
    { quantity: 2, selections: stored },
    { quantity: 2, selections: stored },
    99,
  )
  const line = {
    product: { id: 'p1' },
    quantity: merged.quantity,
    selectedChoices: merged.selections,
  }
  assert.strictEqual(line.quantity, 4)
  // The cart surfaces hand the line's own selections back, in whatever order: it must still be found.
  for (const selections of [line.selectedChoices, [...line.selectedChoices].reverse()]) {
    assert.ok(matchesLine(line, { productId: 'p1', selections, quantity: 4 }))
  }
  assert.ok(matchesLine(line, { productId: 'p1', selections: line.selectedChoices }))
  assert.ok(!matchesLine(line, { productId: 'p2', selections: line.selectedChoices, quantity: 4 }))
  assert.ok(!matchesLine(line, { productId: 'p1', selections: line.selectedChoices, quantity: 3 }))
})

test('a line stored in another order (older build) is still found', () => {
  const line = { product: { id: 'p1' }, quantity: 2, selectedChoices: [gbA(1), gaZ(1)] }
  assert.ok(matchesLine(line, { productId: 'p1', selections: [gaZ(1), gbA(1)], quantity: 2 }))
})

const legacyChoice = { id: 'c-tomato', choiceGroupId: 'g-broth' }
const legacyLine = (quantity, selQuantity = 1, id = 'p1') => ({
  product: { id },
  quantity,
  selectedChoices: [{ groupId: 'g-broth', choiceId: 'c-tomato', quantity: selQuantity }],
  selectedChoice: legacyChoice,
})

test('migratePersistedLines rescales a legacy per-unit choice to the line quantity', () => {
  const [line] = migratePersistedLines([legacyLine(3)], 99)
  assert.strictEqual(line.quantity, 3)
  assert.deepStrictEqual(line.selectedChoices, [
    { groupId: 'g-broth', choiceId: 'c-tomato', quantity: 3 },
  ])
})

test('migratePersistedLines leaves already-correct and plain lines alone', () => {
  const ok = legacyLine(3, 3)
  const plain = { product: { id: 'p2' }, quantity: 2, selectedChoices: [], selectedChoice: null }
  const one = legacyLine(1, 1, 'p3')
  assert.deepStrictEqual(migratePersistedLines([ok, plain, one], 99), [ok, plain, one])
})

test('migratePersistedLines merges lines that became the same line', () => {
  // 1 bowl + 2 bowls, both with the tomato broth: the 2-bowl line was stored as quantity 1.
  const lines = migratePersistedLines([legacyLine(1), legacyLine(2)], 99)
  assert.strictEqual(lines.length, 1)
  assert.strictEqual(lines[0].quantity, 3)
  assert.deepStrictEqual(lines[0].selectedChoices, [
    { groupId: 'g-broth', choiceId: 'c-tomato', quantity: 3 },
  ])
})

test('migratePersistedLines never drops units to respect the cap: it keeps two lines instead', () => {
  const lines = migratePersistedLines([legacyLine(60), legacyLine(60)], 99)
  assert.strictEqual(lines.length, 2)
  assert.strictEqual(
    lines.reduce((n, l) => n + l.quantity, 0),
    120,
  )
  // ...and the keys stay unique for v-for.
  assert.strictEqual(new Set(cartLineKeys(lines)).size, 2)
})

test('cartLineKeys: unique keys, the first occurrence keeps the plain key', () => {
  const a = { product: { id: 'p1' }, quantity: 1, selectedChoices: [], selectedChoice: null }
  const keys = cartLineKeys([a, a, { ...a, product: { id: 'p2' } }])
  assert.strictEqual(keys[0], cartLineKey(a))
  assert.strictEqual(new Set(keys).size, 3)
})
