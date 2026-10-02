// Run: `node --test layers/engine/utils/orderItemLabel.test.mjs`.

import assert from 'node:assert/strict'
import { orderItemChoiceText } from './orderItemLabel.ts'
import { test } from 'node:test'

const product = { choices: [{ id: 'a', name: 'Tonkotsu' }, { id: 'b', name: 'Corn' }] }

test('selections are listed by name, with the line-wide quantity when above 1', () => {
  assert.equal(orderItemChoiceText({
    product,
    selections: [{ choiceId: 'a', quantity: 1 }, { choiceId: 'b', quantity: 2 }],
  }), 'Tonkotsu, Corn x2')
})

test('a selection whose choice is unknown is left out; nothing known falls back to the single choice', () => {
  assert.equal(orderItemChoiceText({ product, selections: [{ choiceId: 'zzz', quantity: 1 }, { choiceId: 'a', quantity: 1 }] }), 'Tonkotsu')
  assert.equal(orderItemChoiceText({ product, selections: [{ choiceId: 'zzz', quantity: 1 }], choice: { name: 'Salmon' } }), 'Salmon')
})

test('an old order with only a choice, or nothing at all', () => {
  assert.equal(orderItemChoiceText({ product, choice: { name: ' Salmon ' }, selections: [] }), 'Salmon')
  assert.equal(orderItemChoiceText({ product, selections: [] }), undefined)
})
