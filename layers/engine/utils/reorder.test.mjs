// Run: `vp test run layers/engine/utils/reorder.test.mjs`.

import { countUnits, planReorder } from './reorder.ts'
import assert from 'node:assert/strict'
import { orderItemPayload } from './orderPayload.ts'
import { test } from 'vite-plus/test'

const choice = (id, groupId) => ({
  id,
  productId: 'p1',
  choiceGroupId: groupId,
  priceModifier: '0.00',
  sortOrder: 0,
  name: id,
})

const bowl = (over = {}) => ({
  id: 'p1',
  name: 'Bowl',
  isAvailable: true,
  isVisible: true,
  price: '9.00',
  choices: [
    choice('brothA', 'g-broth'),
    choice('brothB', 'g-broth'),
    choice('corn', 'g-top'),
    choice('egg', 'g-top'),
  ],
  choiceGroups: [
    { id: 'g-broth', minSelections: 1, maxSelections: 1, choices: [] },
    { id: 'g-top', minSelections: 0, maxSelections: 3, choices: [] },
  ],
  ...over,
})

const sel = (groupId, choiceId, quantity) => ({ groupId, choiceId, quantity })

test('a composed bowl is restored with its selections untouched (they are already line-wide)', () => {
  const plan = planReorder([
    {
      quantity: 2,
      product: bowl(),
      choice: null,
      selections: [sel('g-top', 'corn', 2), sel('g-broth', 'brothA', 2)],
    },
  ])
  assert.equal(plan.skipped.length, 0)
  assert.equal(plan.lines.length, 1)
  assert.equal(plan.lines[0].quantity, 2)
  // Canonical order (by group, then choice), quantities as ordered.
  assert.deepEqual(plan.lines[0].selections, [
    { groupId: 'g-broth', choiceId: 'brothA', quantity: 2 },
    { groupId: 'g-top', choiceId: 'corn', quantity: 2 },
  ])
})

test('an unavailable or hidden product is skipped and named', () => {
  const plan = planReorder([
    { quantity: 1, product: bowl({ isAvailable: false }), choice: null, selections: [] },
    {
      quantity: 3,
      product: bowl({ isVisible: false, name: 'Hidden' }),
      choice: null,
      selections: [],
    },
  ])
  assert.equal(plan.lines.length, 0)
  assert.deepEqual(plan.skipped, [
    { name: 'Bowl', quantity: 1, reason: 'unavailable' },
    { name: 'Hidden', quantity: 3, reason: 'unavailable' },
  ])
})

test('a selection whose choice no longer exists skips the line', () => {
  const plan = planReorder([
    {
      quantity: 1,
      product: bowl(),
      choice: null,
      selections: [sel('g-broth', 'brothGone', 1)],
    },
  ])
  assert.equal(plan.lines.length, 0)
  assert.equal(plan.skipped[0].reason, 'choices')
})

test('a choice that moved to another group skips the line', () => {
  const plan = planReorder([
    {
      quantity: 1,
      product: bowl(),
      choice: null,
      selections: [sel('g-top', 'brothA', 1)],
    },
  ])
  assert.equal(plan.lines.length, 0)
  assert.equal(plan.skipped[0].reason, 'choices')
})

test('a line that no longer satisfies the current group rules is skipped (required group missing, max exceeded)', () => {
  const missing = planReorder([
    { quantity: 1, product: bowl(), choice: null, selections: [sel('g-top', 'corn', 1)] },
  ])
  assert.equal(missing.skipped[0].reason, 'choices')
  const tooMany = planReorder([
    {
      quantity: 1,
      product: bowl(),
      choice: null,
      selections: [sel('g-broth', 'brothA', 1), sel('g-top', 'corn', 2), sel('g-top', 'egg', 2)],
    },
  ])
  assert.equal(tooMany.skipped[0].reason, 'choices')
})

test('group minimums and maximums scale with the line quantity', () => {
  const ok = planReorder([
    {
      quantity: 2,
      product: bowl(),
      choice: null,
      selections: [sel('g-broth', 'brothA', 1), sel('g-broth', 'brothB', 1)],
    },
  ])
  assert.equal(ok.lines.length, 1)
  const short = planReorder([
    { quantity: 2, product: bowl(), choice: null, selections: [sel('g-broth', 'brothA', 1)] },
  ])
  assert.equal(short.skipped.length, 1)
})

test('an old order with a single choice and no selections keeps working', () => {
  const sushi = {
    id: 'p2',
    name: 'Maki',
    isAvailable: true,
    isVisible: true,
    choices: [choice('salmon', 'g-fish')],
  }
  const plan = planReorder([
    { quantity: 3, product: sushi, choice: choice('salmon', 'g-fish'), selections: [] },
  ])
  assert.equal(plan.lines.length, 1)
  assert.equal(plan.lines[0].choice.id, 'salmon')
  assert.deepEqual(plan.lines[0].selections, [
    { groupId: 'g-fish', choiceId: 'salmon', quantity: 3 },
  ])
  const gone = planReorder([
    {
      quantity: 1,
      product: { ...sushi, choices: [] },
      choice: choice('salmon', 'g-fish'),
      selections: [],
    },
  ])
  assert.equal(gone.lines.length, 0)
  assert.equal(gone.skipped[0].reason, 'choices')
})

test('a product without choices and without group data is restored as is', () => {
  const plain = { id: 'p3', name: 'Edamame', isAvailable: true, isVisible: true, choices: [] }
  const plan = planReorder([{ quantity: 2, product: plain, choice: null, selections: undefined }])
  assert.equal(plan.lines.length, 1)
  assert.deepEqual(plan.lines[0].selections, [])
  assert.equal(countUnits(plan.lines), 2)
})

test('an old order choice on a product that now lists no choices at all skips the line', () => {
  const noChoices = { id: 'p4', name: 'Maki', isAvailable: true, isVisible: true }
  const plan = planReorder([
    { quantity: 1, product: noChoices, choice: choice('salmon', 'g-fish'), selections: [] },
  ])
  assert.equal(plan.lines.length, 0)
  assert.equal(plan.skipped[0].reason, 'choices')
})

test('an old order choice whose group is unknown stays the plain legacy choice: no selection with an empty groupId', () => {
  const legacy = { id: 'salmon', productId: 'p5', priceModifier: '0.00', sortOrder: 0, name: 'S' }
  const sushi = { id: 'p5', name: 'Maki', isAvailable: true, isVisible: true, choices: [legacy] }
  const plan = planReorder([{ quantity: 2, product: sushi, choice: legacy, selections: [] }])
  assert.equal(plan.lines.length, 1)
  // The order input would carry `choiceId` only: tsb-service's CreateOrderItemSelectionInput.groupId is a mandatory
  // UUID, an empty one fails the whole createOrder / quoteOrder request, not just the line.
  assert.deepEqual(plan.lines[0].selections, [])
  assert.deepEqual(plan.lines[0].choice, legacy)
  const [line] = plan.lines
  assert.deepEqual(
    orderItemPayload({
      product: line.product,
      quantity: line.quantity,
      selectedChoice: line.choice,
      selectedChoices: line.selections,
    }),
    { productId: 'p5', quantity: 2, choiceId: 'salmon' },
  )
})
