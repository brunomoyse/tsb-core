// The menu page's catalogue rules (audit PR 4.4).
// Run: `vp test run layers/engine/utils/menuCatalog.test.mjs`.

import {
  baseCategories,
  displayedCategories,
  filterDietary,
  flattenProducts,
  isComposerProduct,
  searchProducts,
} from './menuCatalog.ts'
import assert from 'node:assert/strict'
import { test } from 'vite-plus/test'

const prod = (id, name, extra = {}) => ({
  id,
  name,
  code: null,
  isVisible: true,
  isHalal: false,
  isSpicy: false,
  isVegetarian: false,
  choiceGroups: [],
  ...extra,
})
const cat = (id, order, products) => ({ id, name: `Cat ${id}`, order, slug: id, products })

const menu = () => [
  cat('b', 2, [
    prod('p3', 'Miso soup', { isVegetarian: true }),
    prod('p4', 'Hidden', { isVisible: false }),
  ]),
  cat('a', 1, [
    prod('p1', 'Spicy ramen', { code: 'R1', isSpicy: true, isHalal: true }),
    prod('p2', 'Salmon sushi', { code: 'S2' }),
  ]),
  cat('c', 3, [prod('p5', 'Gone', { isVisible: false })]),
]

test('the base menu is sorted, shows visible products only and drops empty categories', () => {
  const base = baseCategories(menu(), {})
  assert.deepEqual(
    base.map((c) => c.id),
    ['a', 'b'],
  )
  assert.deepEqual(
    base[1].products.map((p) => p.id),
    ['p3'],
  )
})

test('a live update is merged into the product, and can hide it', () => {
  const live = { p2: { isAvailable: false, name: 'Salmon sushi (new)' }, p1: { isVisible: false } }
  const base = baseCategories(menu(), live)
  assert.deepEqual(
    base[0].products.map((p) => p.id),
    ['p2'],
  )
  assert.equal(base[0].products[0].name, 'Salmon sushi (new)')
})

test('the search needs every word, in name, code or category', () => {
  const all = flattenProducts(baseCategories(menu(), {}))
  assert.deepEqual(
    searchProducts(all, 'sushi').map((p) => p.id),
    ['p2'],
  )
  assert.deepEqual(
    searchProducts(all, 'r1 spicy').map((p) => p.id),
    ['p1'],
  )
  assert.deepEqual(
    searchProducts(all, 'cat b').map((p) => p.id),
    ['p3'],
  )
  assert.deepEqual(
    searchProducts(all, '  ').map((p) => p.id),
    ['p1', 'p2', 'p3'],
  )
  assert.deepEqual(searchProducts(all, 'sushi ramen'), [])
})

test('the dietary filters are ANDed', () => {
  const all = flattenProducts(baseCategories(menu(), {}))
  assert.deepEqual(
    filterDietary(all, new Set(['spicy'])).map((p) => p.id),
    ['p1'],
  )
  assert.deepEqual(
    filterDietary(all, new Set(['spicy', 'halal'])).map((p) => p.id),
    ['p1'],
  )
  assert.deepEqual(filterDietary(all, new Set(['spicy', 'vegetarian'])), [])
  assert.equal(filterDietary(all, new Set()), all)
})

test('without a search or filter the whole menu is shown; with one it is regrouped in category order', () => {
  const base = baseCategories(menu(), {})
  const all = flattenProducts(base)
  const none = { query: '', filters: new Set(), excludeComposer: false }
  assert.equal(displayedCategories(base, all, none), base)
  const shown = displayedCategories(base, all, { ...none, query: 's' })
  assert.deepEqual(
    shown.map((c) => [c.id, c.products.map((p) => p.id)]),
    [
      ['a', ['p1', 'p2']],
      ['b', ['p3']],
    ],
  )
  assert.deepEqual(
    displayedCategories(base, all, { ...none, filters: new Set(['vegetarian']) }).map((c) => c.id),
    ['b'],
  )
})

test('a composer product is detected by its multi-pick group and kept out of the grid on request', () => {
  const bowl = prod('bowl', 'Bowl', { choiceGroups: [{ id: 'g', maxSelections: 20 }] })
  const set = prod('set', 'Set', { choiceGroups: [{ id: 'g2', maxSelections: 1 }] })
  assert.equal(isComposerProduct(bowl), true)
  assert.equal(isComposerProduct(set), false)
  assert.equal(isComposerProduct(prod('plain', 'Plain', { choiceGroups: undefined })), false)

  const base = baseCategories([cat('a', 1, [bowl, set]), cat('b', 2, [bowl])], {})
  const all = flattenProducts(base)
  const opts = { query: '', filters: new Set(), excludeComposer: true }
  assert.deepEqual(
    displayedCategories(base, all, opts).map((c) => [c.id, c.products.map((p) => p.id)]),
    [['a', ['set']]],
  )
  assert.deepEqual(
    displayedCategories(base, all, { ...opts, query: 'b' }).map((c) => c.products.map((p) => p.id)),
    [],
  )
  assert.deepEqual(
    displayedCategories(base, all, { ...opts, excludeComposer: false, query: 'bowl' }).map(
      (c) => c.id,
    ),
    ['a', 'b'],
  )
})
