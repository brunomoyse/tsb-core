// What a cart line does with a quote issue (message + actions), and accepting a new price.
// Run: `vp test run layers/engine/utils/cartIssues.test.mjs`.

import { describeLineIssue, describeLineIssues, quotedSnapshotPricing } from './cartIssues.ts'
import assert from 'node:assert/strict'
import { test } from 'vite-plus/test'

const issue = (code, currentPrice = null) => ({ code, currentPrice })

test('a product that is gone or sold out can only be removed', () => {
  for (const [code, key] of [
    ['PRODUCT_NOT_FOUND', 'cart.issues.notFound'],
    ['PRODUCT_UNAVAILABLE', 'cart.issues.unavailable'],
  ]) {
    assert.deepEqual(describeLineIssue(issue(code), 1000, 0), {
      code,
      messageKey: key,
      params: {},
      actions: ['remove'],
    })
  }
})

test('a price change offers to accept the new price (primary) or to remove the line', () => {
  assert.deepEqual(describeLineIssue(issue('PRICE_CHANGED', '13.00'), 2500, 2600), {
    code: 'PRICE_CHANGED',
    messageKey: 'cart.issues.priceChanged',
    params: { fromCents: 2500, toCents: 2600 },
    actions: ['accept-price', 'remove'],
  })
})

test('a lunch-only product offers the slot picker first', () => {
  const view = describeLineIssue(issue('LUNCH_SLOT_REQUIRED'), 1100, 1100)
  assert.equal(view.messageKey, 'cart.issues.lunchOnly')
  assert.deepEqual(view.actions, ['choose-slot', 'remove'])
})

test('an invalid composition or quantity has to be removed and composed again from the menu', () => {
  assert.deepEqual(describeLineIssue(issue('SELECTION_INVALID'), 0, 0).actions, ['remove'])
  assert.equal(
    describeLineIssue(issue('SELECTION_INVALID'), 0, 0).messageKey,
    'cart.issues.selectionInvalid',
  )
  assert.equal(
    describeLineIssue(issue('INVALID_QUANTITY'), 0, 0).messageKey,
    'cart.issues.invalidQuantity',
  )
})

test('every code has a way out: an unknown code from a newer backend or INVALID_PRICE falls back to remove', () => {
  for (const code of ['INVALID_PRICE', 'SOMETHING_NEW']) {
    const view = describeLineIssue(issue(code), 0, 0)
    assert.equal(view.messageKey, 'cart.issues.generic')
    assert.deepEqual(view.actions, ['remove'])
  }
})

test('several issues on one line: the one that matters most comes first', () => {
  const views = describeLineIssues(
    [issue('PRICE_CHANGED', '9.00'), issue('LUNCH_SLOT_REQUIRED'), issue('PRODUCT_UNAVAILABLE')],
    900,
    900,
  )
  assert.deepEqual(
    views.map((v) => v.code),
    ['PRODUCT_UNAVAILABLE', 'LUNCH_SLOT_REQUIRED', 'PRICE_CHANGED'],
  )
})

test('accepting a price: the product price and the modifiers of its choices move, nothing else', () => {
  const product = {
    choices: [
      { id: 'broth-b', priceModifier: '1.50', name: 'Spicy' },
      { id: 'noodle', priceModifier: '0.50', name: 'Noodles' },
    ],
  }
  const pricing = quotedSnapshotPricing(product, {
    productPrice: '11.00',
    selections: [{ groupId: 'g', choiceId: 'broth-b', quantity: 2, priceModifier: '2.00' }],
  })
  assert.deepEqual(pricing, {
    price: '11.00',
    choices: [
      { id: 'broth-b', priceModifier: '2.00' }, // Priced by the quote
      { id: 'noodle', priceModifier: '0.50' }, // Not in the quote: unchanged
    ],
  })
  // No price from the server (the product is gone): nothing to accept.
  assert.equal(quotedSnapshotPricing(product, { productPrice: null, selections: [] }), null)
})

test('accepting a price adds the selected choices the snapshot lacked, so the price stops changing', () => {
  const product = { choices: [{ id: 'broth-b', priceModifier: '1.50', name: 'Spicy' }] }
  const pricing = quotedSnapshotPricing(product, {
    productPrice: '11.00',
    selections: [
      { groupId: 'g1', choiceId: 'broth-b', quantity: 1, priceModifier: '2.00' },
      { groupId: 'g2', choiceId: 'egg', quantity: 1, priceModifier: '0.80' }, // Missing from the snapshot
      { groupId: 'g2', choiceId: 'egg', quantity: 1, priceModifier: '0.80' }, // Listed twice: added once
    ],
  })
  assert.deepEqual(pricing.choices, [
    { id: 'broth-b', priceModifier: '2.00' },
    { id: 'egg', priceModifier: '0.80', groupId: 'g2' },
  ])
})
