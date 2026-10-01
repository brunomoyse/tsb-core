// The schema.org Menu of the menu page (audit PR 3.8, P9).
// Run: `node --test layers/engine/utils/menuSchema.test.mjs`.

import { buildMenuSchema, menuItemImage } from './menuSchema.ts'
import assert from 'node:assert/strict'
import { test } from 'node:test'

const cat = { id: 'c1', name: 'Soupes' }
const product = (over = {}) => ({ id: 'p-uuid', slug: 'tomato-soup', name: 'Soupe', price: '8.50', isAvailable: true, category: cat, ...over })
const base = { menuUrl: 'https://shop.be/fr/menu', baseUrl: 'https://shop.be', s3BaseUrl: 'https://s3.be', name: 'Menu', description: 'd', inLanguage: 'fr-BE' }

test('images are keyed by product id, never by slug', () => {
  const schema = buildMenuSchema({ ...base, products: [product()] })
  const [{ hasMenuItem: [{ image }] }] = schema.hasMenuSection
  assert.equal(image.url, 'https://s3.be/images/thumbnails/p-uuid.png')
  assert.equal(image.contentUrl, 'https://s3.be/images/thumbnails/p-uuid.webp')
  assert.ok(!JSON.stringify(schema).includes('tomato-soup'))
})

test('a brand photo wins, made absolute', () => {
  const photoFor = (slug) => (slug === 'tomato-soup' ? { png: '/images/bowls/tomato-top-560.png', webp: '/images/bowls/tomato-top-800.webp' } : undefined)
  const image = menuItemImage(product(), { baseUrl: base.baseUrl, s3BaseUrl: base.s3BaseUrl, photoFor })
  assert.equal(image.url, 'https://shop.be/images/bowls/tomato-top-560.png')
  assert.equal(image.contentUrl, 'https://shop.be/images/bowls/tomato-top-800.webp')
  const other = menuItemImage(product({ slug: 'other' }), { baseUrl: base.baseUrl, s3BaseUrl: base.s3BaseUrl, photoFor })
  assert.equal(other.url, 'https://s3.be/images/thumbnails/p-uuid.png')
})

test('without a bucket the placeholder is an absolute URL', () => {
  const image = menuItemImage(product(), { baseUrl: base.baseUrl })
  assert.match(image.url, /^https:\/\/shop\.be\/images\/placeholder-product-thumbnail\.png$/u)
})

test('ids and urls are the localized menu URL', () => {
  const schema = buildMenuSchema({ ...base, products: [product()] })
  assert.equal(schema['@id'], 'https://shop.be/fr/menu#menu')
  assert.equal(schema.url, 'https://shop.be/fr/menu')
  assert.equal(schema.hasMenuSection[0]['@id'], 'https://shop.be/fr/menu#section-c1')
  assert.equal(schema.hasMenuSection[0].hasMenuItem[0]['@id'], 'https://shop.be/fr/menu#p-uuid')
})

test('products are grouped by category, offers and diets are carried', () => {
  const schema = buildMenuSchema({
    ...base,
    products: [product(), product({ id: 'p2', isAvailable: false, isHalal: true, isVegetarian: true }), product({ id: 'p3', category: { id: 'c2', name: 'Plats' } }), product({ id: 'p4', category: null })],
  })
  assert.equal(schema.hasMenuSection.length, 2)
  const items = schema.hasMenuSection[0].hasMenuItem
  assert.equal(items.length, 2)
  assert.equal(items[0].offers.availability, 'https://schema.org/InStock')
  assert.equal(items[1].offers.availability, 'https://schema.org/OutOfStock')
  assert.deepEqual(items[1].suitableForDiet, ['https://schema.org/HalalDiet', 'https://schema.org/VegetarianDiet'])
  assert.ok(!('suitableForDiet' in items[0]))
})
