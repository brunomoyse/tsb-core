// Run: `vp test run layers/engine/utils/orderItemLabel.test.mjs`.

import {
  cartLineChoiceText,
  cartLineMeta,
  orderItemChoiceText,
  orderLineSegments,
} from './orderItemLabel.ts'
import assert from 'node:assert/strict'
import { test } from 'vite-plus/test'

const product = {
  choices: [
    { id: 'a', name: 'Tonkotsu' },
    { id: 'b', name: 'Corn' },
  ],
}

test('selections are listed by name, with the line-wide quantity when above 1', () => {
  assert.equal(
    orderItemChoiceText({
      product,
      selections: [
        { choiceId: 'a', quantity: 1 },
        { choiceId: 'b', quantity: 2 },
      ],
    }),
    'Tonkotsu, Corn x2',
  )
})

test('a selection whose choice is unknown is left out; nothing known falls back to the single choice', () => {
  assert.equal(
    orderItemChoiceText({
      product,
      selections: [
        { choiceId: 'zzz', quantity: 1 },
        { choiceId: 'a', quantity: 1 },
      ],
    }),
    'Tonkotsu',
  )
  assert.equal(
    orderItemChoiceText({
      product,
      selections: [{ choiceId: 'zzz', quantity: 1 }],
      choice: { name: 'Salmon' },
    }),
    'Salmon',
  )
})

test('an old order with only a choice, or nothing at all', () => {
  assert.equal(
    orderItemChoiceText({ product, choice: { name: ' Salmon ' }, selections: [] }),
    'Salmon',
  )
  assert.equal(orderItemChoiceText({ product, selections: [] }), undefined)
})

const line = (extra = {}) => ({
  product: {
    code: 'E1',
    name: 'Edamame',
    category: { name: 'Entrées' },
    pieceCount: 6,
    choices: product.choices,
  },
  ...extra,
})

test('cartLineMeta: the code only shows for a brand that has codes, compact join by default', () => {
  assert.equal(cartLineMeta(line(), { showProductCode: true }), 'E1·Entrées')
  assert.equal(cartLineMeta(line(), { showProductCode: false }), 'Entrées')
  assert.equal(cartLineMeta({ product: { name: 'x' } }, { showProductCode: true }), undefined)
})

test('cartLineMeta: `spaced` spaces the separator without the piece count', () => {
  assert.equal(cartLineMeta(line(), { showProductCode: true, spaced: true }), 'E1 · Entrées')
  assert.equal(cartLineMeta(line(), { showProductCode: false, spaced: true }), 'Entrées')
})

test('cartLineMeta: the cart page adds the piece count and spaces the separator', () => {
  const pieces = { one: 'pc', many: 'pcs' }
  assert.equal(cartLineMeta(line(), { showProductCode: true, pieces }), 'E1 · Entrées · 6 pcs')
  assert.equal(cartLineMeta(line(), { showProductCode: false, pieces }), 'Entrées · 6 pcs')
  assert.equal(
    cartLineMeta(
      line({ product: { code: 'E1', name: 'x', category: { name: 'C' }, pieceCount: 1 } }),
      { showProductCode: false, pieces },
    ),
    'C · 1 pc',
  )
  assert.equal(
    cartLineMeta(line({ product: { code: null, name: 'x', category: null, pieceCount: null } }), {
      showProductCode: true,
      pieces,
    }),
    undefined,
  )
})

test('cartLineChoiceText: selections by name with the quantity, else the single choice', () => {
  assert.equal(
    cartLineChoiceText(
      line({
        selectedChoices: [
          { choiceId: 'a', quantity: 1 },
          { choiceId: 'b', quantity: 2 },
        ],
      }),
    ),
    'Tonkotsu, Corn x2',
  )
  assert.equal(
    cartLineChoiceText(line({ selectedChoice: { name: 'Salmon' }, selectedChoices: [] })),
    'Salmon',
  )
  assert.equal(cartLineChoiceText(line()), undefined)
})

test('orderLineSegments: code (when the brand has codes), category, then the name', () => {
  const item = { product: { code: 'E1', name: 'Edamame', category: { name: 'Entrées' } } }
  assert.deepEqual(orderLineSegments(item, true), [
    { text: 'E1', muted: true },
    { text: 'Entrées', muted: true },
    { text: 'Edamame', muted: false },
  ])
  assert.deepEqual(orderLineSegments(item, false), [
    { text: 'Entrées', muted: true },
    { text: 'Edamame', muted: false },
  ])
  assert.deepEqual(orderLineSegments({ product: { code: null, name: 'x' } }, true), [
    { text: 'x', muted: false },
  ])
})

test('selections of a product that carries no choices list fall back to the single choice', () => {
  assert.equal(
    orderItemChoiceText({
      product: {},
      selections: [{ choiceId: 'a', quantity: 1 }],
      choice: { name: 'Salmon' },
    }),
    'Salmon',
  )
  assert.equal(
    orderItemChoiceText({ selections: [{ choiceId: 'a', quantity: 1 }], choice: null }),
    undefined,
  )
})
