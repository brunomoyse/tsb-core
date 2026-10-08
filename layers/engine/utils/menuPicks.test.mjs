// menuPicks: which products the row at the top of the menu shows, and under which title.
// Run: `vp test run layers/engine/utils/menuPicks.test.mjs`.

import { MENU_PICKS_MAX, matchMenuProducts, pickMenuRow } from './menuPicks.ts'
import assert from 'node:assert/strict'
import { test } from 'vite-plus/test'

const product = (id, over = {}) => ({
  id,
  name: `Product ${id}`,
  isAvailable: true,
  isVisible: true,
  ...over,
})
const count = (productId, orderCount = 1) => ({ productId, orderCount })
const ids = (picks) => picks?.products.map((p) => p.id)

const menu = ['a', 'b', 'c', 'd', 'e'].map((id) => product(id))

test("a returning customer sees their own products, in the server's order", () => {
  const picks = pickMenuRow({
    mine: [count('c', 3), count('a', 1)],
    popular: [count('b', 40), count('d', 30)],
    products: menu,
  })
  assert.equal(picks.kind, 'favorites')
  assert.deepEqual(ids(picks), ['c', 'a'])
})

test('"already ordered" until one product was ordered twice', () => {
  const picks = pickMenuRow({ mine: [count('c'), count('a')], popular: [], products: menu })
  assert.equal(picks.kind, 'ordered')
  assert.deepEqual(ids(picks), ['c', 'a'])
})

test('nobody signed in, or nothing ordered yet: the most ordered products', () => {
  for (const mine of [null, []]) {
    const picks = pickMenuRow({ mine, popular: [count('b', 40), count('d', 30)], products: menu })
    assert.equal(picks.kind, 'popular')
    assert.deepEqual(ids(picks), ['b', 'd'])
  }
})

test('a customer with a single product left falls back to the most ordered ones', () => {
  const picks = pickMenuRow({
    mine: [count('a', 5), count('gone', 4)],
    popular: [count('b'), count('d')],
    products: menu,
  })
  assert.equal(picks.kind, 'popular')
})

test('fewer than two products to show: no row', () => {
  assert.equal(pickMenuRow({ mine: null, popular: [count('b')], products: menu }), null)
  assert.equal(pickMenuRow({ mine: [count('a')], popular: [], products: menu }), null)
  assert.equal(pickMenuRow({ mine: null, popular: [count('b'), count('c')], products: [] }), null)
})

test('products off the menu or sold out since the counts were made are skipped, not counted', () => {
  const products = [product('a'), product('b', { isAvailable: false }), product('c')]
  const matched = matchMenuProducts(
    [count('gone'), count('b'), count('c', 2), count('a')],
    products,
  )
  assert.deepEqual(
    matched.map((m) => [m.product.id, m.orderCount]),
    [
      ['c', 2],
      ['a', 1],
    ],
  )
})

test(`at most ${MENU_PICKS_MAX} products`, () => {
  const many = Array.from({ length: 12 }, (_, i) => product(`p${i}`))
  const picks = pickMenuRow({ mine: null, popular: many.map((p) => count(p.id)), products: many })
  assert.equal(picks.products.length, MENU_PICKS_MAX)
  assert.equal(
    matchMenuProducts(
      many.map((p) => count(p.id)),
      many,
      3,
    ).length,
    3,
  )
})
