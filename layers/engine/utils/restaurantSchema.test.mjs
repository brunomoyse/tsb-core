// The schema.org Restaurant JSON-LD (audit PR 3.8, P8).
// Run: `node --test layers/engine/utils/restaurantSchema.test.mjs`.

import { buildRestaurantSchema, openingHoursSpecification } from './restaurantSchema.ts'
import assert from 'node:assert/strict'
import { test } from 'node:test'

const brand = (over = {}) => ({
  name: 'Brand',
  legalName: 'Brand',
  address: { street: 'Rue 1', city: 'Liège', postal: '4000', region: 'Wallonie', country: 'BE' },
  phone: '+32 4 222 98 88',
  email: 'a@b.c',
  domain: 'brand.be',
  socials: { instagram: 'https://instagram.com/x', facebook: undefined },
  geo: { lat: 50.6, lng: 5.5 },
  mapsUrl: 'x',
  foundingYear: 2016,
  cuisine: ['Chinese', 'Malatang'],
  acceptsReservations: false,
  logo: '/icon-512.png',
  priceRange: '€€',
  orderExtras: [],
  openingHours: { monday: { open: '11:30', close: '22:00' } },
  ...over,
})
const build = (input) => buildRestaurantSchema({ brand: brand(), baseUrl: 'https://shop.be', locale: 'fr', ...input })
const restaurant = (schema) => schema['@graph'].find((n) => n['@type'] === 'Restaurant')

test('a Restaurant node with the fields Google requires', () => {
  const schema = build({})
  assert.equal(schema['@context'], 'https://schema.org')
  const r = restaurant(JSON.parse(JSON.stringify(schema)))
  assert.equal(r['@type'], 'Restaurant')
  for (const key of ['name', 'address', 'image', 'telephone', 'servesCuisine', 'priceRange', 'openingHoursSpecification']) assert.ok(r[key], key)
  assert.equal(r.address['@type'], 'PostalAddress')
  assert.equal(r.address.addressCountry, 'BE')
  assert.equal(r.geo['@type'], 'GeoCoordinates')
  assert.equal(r.telephone, '+3242229888')
  assert.deepEqual(r.sameAs, ['https://instagram.com/x'])
})

test('no custom Offer, and nothing from another brand', () => {
  const json = JSON.stringify(build({}))
  assert.ok(!/Offer|discount|pickup/iu.test(json))
  assert.equal(build({}) ['@graph'].length, 1)
})

test('cuisine, price, reservations and logo come from the brand', () => {
  const r = restaurant(build({}))
  assert.deepEqual(r.servesCuisine, ['Chinese', 'Malatang'])
  assert.equal(r.acceptsReservations, false)
  assert.equal(r.logo, 'https://shop.be/icon-512.png')
  assert.equal(restaurant(build({ brand: brand({ acceptsReservations: true }) })).acceptsReservations, true)
})

test('the menu URL is localized', () => {
  assert.equal(restaurant(build({ locale: 'nl' })).hasMenu.url, 'https://shop.be/nl/menu')
  assert.equal(restaurant(build({ locale: 'nl' })).hasMenu['@id'], 'https://shop.be/nl/menu#menu')
  assert.equal(restaurant(build({ locale: 'zh' })).hasMenu.inLanguage, 'zh-CN')
})

test('the live opening hours win over the brand fallback', () => {
  const live = { monday: { open: '12:00', close: '14:00', dinnerOpen: '18:00', dinnerClose: '21:30' }, tuesday: null, saturday: { open: '12:00', close: '14:00', dinnerOpen: '18:00', dinnerClose: '21:30' } }
  const spec = restaurant(build({ openingHours: live })).openingHoursSpecification
  assert.deepEqual(spec, [
    { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Saturday'], opens: '12:00', closes: '14:00' },
    { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Saturday'], opens: '18:00', closes: '21:30' },
  ])
})

test('the brand hours are the fallback when the config is missing or empty', () => {
  const expected = [{ '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday'], opens: '11:30', closes: '22:00' }]
  assert.deepEqual(restaurant(build({})).openingHoursSpecification, expected)
  assert.deepEqual(restaurant(build({ openingHours: {} })).openingHoursSpecification, expected)
  assert.deepEqual(restaurant(build({ openingHours: null })).openingHoursSpecification, expected)
})

test('no hours anywhere means no openingHoursSpecification, not an empty one', () => {
  const r = restaurant(build({ brand: brand({ openingHours: undefined }) }))
  assert.ok(!('openingHoursSpecification' in r))
})

test('days with the same hours are grouped; a malformed or closed day is skipped', () => {
  const spec = openingHoursSpecification({
    monday: { open: '9:00', close: '17:00' },
    tuesday: { open: '9:00', close: '17:00' },
    wednesday: { open: 'closed', close: '17:00' },
    thursday: null,
    friday: { open: '10:00', close: '18:00' },
  })
  assert.deepEqual(spec.map((s) => [s.dayOfWeek, s.opens, s.closes]), [
    [['Monday', 'Tuesday'], '09:00', '17:00'],
    [['Friday'], '10:00', '18:00'],
  ])
})

test('the review aggregate is only emitted for a brand that has one', () => {
  assert.ok(!('aggregateRating' in restaurant(build({}))))
  const r = restaurant(build({ brand: brand({ rating: { value: 4.7, count: 248 } }) }))
  assert.equal(r.aggregateRating.reviewCount, 248)
})
