// The menu's category scroll-spy band (audit PR 4.4).
// Run: `node --test layers/engine/utils/menuScrollspy.test.mjs`.

import { DEFAULT_BAND_MARGIN, MIN_BAND_HEIGHT, bandRootMargin, categoryIdFromSection, topmostInBand } from './menuScrollspy.ts'
import assert from 'node:assert/strict'
import { test } from 'node:test'

test('the band starts just under the header and is a fifth of the viewport tall', () => {
  // 900px viewport: band 180px, header bottom 200 -> top 208, bottom inset 900 - 208 - 180 = 512
  assert.equal(bandRootMargin(200, 900), '-208px 0px -512px 0px')
})

test('a short viewport keeps a band of at least the minimum height', () => {
  const vh = 400
  const [top, , bottom] = bandRootMargin(180, vh).split(' ').map(v => -parseInt(v, 10))
  assert.equal(vh - top - bottom, MIN_BAND_HEIGHT)
})

test('a header taller than the room left never makes the bottom inset negative', () => {
  assert.equal(bandRootMargin(480, 500), '-488px 0px -0px 0px')
  assert.ok(!bandRootMargin(900, 500).includes('--'))
})

test('the default band is the one the YGF jump-nav always used', () => {
  assert.equal(DEFAULT_BAND_MARGIN, '-200px 0px -55% 0px')
})

test('the topmost category in menu order wins, whatever order the observer reported them', () => {
  const ids = ['soups', 'sushi', 'desserts']
  assert.equal(topmostInBand(ids, new Set(['desserts', 'sushi'])), 'sushi')
  assert.equal(topmostInBand(ids, new Set(['desserts'])), 'desserts')
  assert.equal(topmostInBand(ids, new Set()), null)
  assert.equal(topmostInBand(ids, new Set(['gone'])), null)
})

test('the section id maps back to the category id', () => {
  assert.equal(categoryIdFromSection('category-abc-123'), 'abc-123')
})
