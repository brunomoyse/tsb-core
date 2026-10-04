// The brand merge of the locale messages, now done at build time (audit PR 6.2, P11).
// Run: `vp test run layers/engine/utils/localeMessages.test.mjs`.

import { applyBrand, buildLocaleMessages, deepMerge } from './localeMessages.ts'
import assert from 'node:assert/strict'
import { test } from 'vite-plus/test'

test('the brand wins on leaf keys and the rest of the base is kept', () => {
  const merged = deepMerge(
    { a: { x: 'base x', y: 'base y' }, b: 'base b', list: ['1', '2'] },
    { a: { y: 'brand y', z: 'brand z' }, c: 'brand c', list: ['3'] },
  )
  assert.deepEqual(merged, {
    a: { x: 'base x', y: 'brand y', z: 'brand z' },
    b: 'base b',
    c: 'brand c',
    list: ['3'],
  })
})

test('merging does not modify its inputs', () => {
  const base = { a: { x: 'x' } }
  const brand = { a: { y: 'y' } }
  deepMerge(base, brand)
  assert.deepEqual(base, { a: { x: 'x' } })
  assert.deepEqual(brand, { a: { y: 'y' } })
})

test('the tokens are replaced in strings, nested objects and arrays, and nowhere else', () => {
  assert.deepEqual(
    applyBrand(
      {
        t: 'Bienvenue chez __BRAND__, __PHONE__ (__BRAND__)',
        n: { l: ['__PHONE__', 3, true, null] },
        k: 5,
      },
      'Yang',
      '+32 4',
    ),
    { t: 'Bienvenue chez Yang, +32 4 (Yang)', n: { l: ['+32 4', 3, true, null] }, k: 5 },
  )
})

test('buildLocaleMessages uses the brandName of the merged messages (the brand overrides the base)', () => {
  const messages = buildLocaleMessages(
    { brandName: 'Base', head: { title: '__BRAND__' }, call: 'Appelez le __PHONE__' },
    { brandName: 'Tokyo Sushi Bar' },
    '+32 4 222 98 88',
  )
  assert.deepEqual(messages, {
    brandName: 'Tokyo Sushi Bar',
    head: { title: 'Tokyo Sushi Bar' },
    call: 'Appelez le +32 4 222 98 88',
  })
})

test('a brand without brandName leaves an empty name rather than the raw token', () => {
  assert.equal(buildLocaleMessages({ t: '__BRAND__!' }, {}, '').t, '!')
})
