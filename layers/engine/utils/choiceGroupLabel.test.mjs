// Card-subtitle labels of required choice groups.
// Run: `vp test run layers/engine/utils/choiceGroupLabel.test.mjs`.

import { choiceGroupCountLabel, choiceGroupLabelKey } from './choiceGroupLabel.ts'
import assert from 'node:assert/strict'
import { test } from 'vite-plus/test'

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

test('no brand label when the brand has no labels, none for the category, or the product has no category', () => {
  const labels = { plateau: { one: 'menu.soup', other: 'menu.soups' } }
  assert.equal(choiceGroupLabelKey(undefined, 'plateau', 1), null)
  assert.equal(choiceGroupLabelKey(labels, 'drinks', 1), null)
  assert.equal(choiceGroupLabelKey(labels, null, 2), null)
  assert.equal(choiceGroupLabelKey(labels, undefined, 1), null)
  assert.equal(choiceGroupLabelKey(labels, '', 1), null)
})
