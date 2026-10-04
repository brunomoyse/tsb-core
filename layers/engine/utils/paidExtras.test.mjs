// Run: `vp test run layers/engine/utils/paidExtras.test.mjs`.

import { isCategoryBySlugUnsupportedError, paidExtraQuantity, paidExtrasOf } from './paidExtras.ts'
import { GqlError } from './gqlError.ts'
import assert from 'node:assert/strict'
import { test } from 'vite-plus/test'

const product = (code, name, price) => ({ code, name, price, isVisible: true, isAvailable: true })

test('only visible, coded products priced between 0 and 1 euro are extras, cheapest first then by name', () => {
  const extras = paidExtrasOf(
    [
      product('A1', 'Rice', '1.00'),
      product('A2', 'Sauce cup', '0.50'),
      product('A3', 'Free thing', '0.00'),
      product('A4', 'Pricey', '1.01'),
      { ...product('A5', 'Hidden', '0.30'), isVisible: false },
      product(null, 'No code', '0.30'),
      product('A6', 'apple dip', '0.50'),
    ],
    [],
  )
  assert.deepEqual(
    extras.map((extra) => extra.code),
    ['A6', 'A2', 'A1'],
  )
  assert.equal(extras[0].priceCents, 50)
  assert.equal(extras[0].label, 'apple dip')
})

test('an unavailable extra is still listed, flagged', () => {
  const [extra] = paidExtrasOf([{ ...product('A1', 'Rice', '0.90'), isAvailable: false }], [])
  assert.equal(extra.isAvailable, false)
})

test('the quantity counts plain lines of the product, not lines with a choice', () => {
  const lines = [
    { product: { code: 'A1' }, quantity: 2 },
    {
      product: { code: 'A1' },
      quantity: 1,
      selectedChoice: { id: 'c' },
      selectedChoices: [{ choiceId: 'c', quantity: 1 }],
    },
    { product: { code: 'A1' }, quantity: 3, selectedChoice: { id: 'c' }, selectedChoices: [] },
    { product: { code: 'B' }, quantity: 5 },
  ]
  assert.equal(paidExtraQuantity(lines, 'A1'), 5)
  assert.equal(paidExtraQuantity(lines, 'Z'), 0)
  assert.equal(paidExtrasOf([product('A1', 'Rice', '0.50')], lines)[0].quantity, 5)
})

test('an old backend is recognised by the validation error that names productCategoryBySlug', () => {
  const validation = (message) =>
    new GqlError([{ message, extensions: { code: 'GRAPHQL_VALIDATION_FAILED' } }])
  assert.equal(
    isCategoryBySlugUnsupportedError(
      validation('Cannot query field "productCategoryBySlug" on type "Query".'),
    ),
    true,
  )
  assert.equal(
    isCategoryBySlugUnsupportedError(
      validation('Cannot query field "productCategories" on type "Query".'),
    ),
    false,
  )
  assert.equal(
    isCategoryBySlugUnsupportedError(
      new GqlError([
        { message: 'productCategoryBySlug', extensions: { code: 'INTERNAL_SERVER_ERROR' } },
      ]),
    ),
    false,
  )
  assert.equal(
    isCategoryBySlugUnsupportedError(
      Object.assign(new Error('wrapped'), {
        cause: validation('Cannot query field "productCategoryBySlug"'),
      }),
    ),
    true,
  )
  assert.equal(isCategoryBySlugUnsupportedError(new Error('network')), false)
})

test('a line with a legacy choice and no selectedChoices at all is a line with a choice, not the extra', () => {
  const lines = [
    { product: { code: 'A1' }, quantity: 2, selectedChoice: { id: 'c' } },
    { product: { code: 'A1' }, quantity: 1, selectedChoice: null },
  ]
  assert.equal(paidExtraQuantity(lines, 'A1'), 3)
})
