// Card-subtitle labels of required choice groups.
// Run: `node --test layers/engine/utils/choiceGroupLabel.test.mjs`.

import { choiceGroupCountLabel, choiceGroupLabelKey } from './choiceGroupLabel.ts'
import assert from 'node:assert/strict'
import { test } from 'node:test'

test('a pick-one group shows how many options there are, not "1 sauce"', () => {
  assert.equal(choiceGroupCountLabel('Sauce', 1, 4), 'sauce (4)')
  assert.equal(choiceGroupCountLabel('Sauce', 1, 1), 'sauce')
  assert.equal(choiceGroupCountLabel('Sauce', 1, 0), 'sauce')
})

test('a multi-select group keeps the pick count', () => {
  assert.equal(choiceGroupCountLabel('Ingrédients', 20, 30), '20 ingrédients')
})

test('a brand label is chosen per category and pick count', () => {
  const labels = { plateau: { one: 'menu.soup', other: 'menu.soups' } }
  assert.equal(choiceGroupLabelKey(labels, 'plateau', 1), 'menu.soup')
  assert.equal(choiceGroupLabelKey(labels, 'plateau', 2), 'menu.soups')
  assert.equal(choiceGroupLabelKey(labels, 'other', 2), null)
})
