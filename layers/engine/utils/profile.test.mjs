// Run: `vp test run layers/engine/utils/profile.test.mjs`.

import { hasActiveOrder, profileFullName, profileInitials, splitStoredPhone } from './profile.ts'
import assert from 'node:assert/strict'
import { test } from 'vite-plus/test'

test('initials and full name, with placeholders when the name is missing', () => {
  assert.equal(profileInitials({ firstName: 'ada', lastName: 'lovelace' }), 'AL')
  assert.equal(profileInitials({ firstName: 'Ada' }), 'A')
  assert.equal(profileInitials(null), '?')
  assert.equal(profileFullName({ firstName: 'Ada', lastName: 'Lovelace' }), 'Ada Lovelace')
  assert.equal(profileFullName({ firstName: 'Ada', lastName: '' }), 'Ada')
  assert.equal(profileFullName(undefined), '–')
})

test('an order in progress is a warning, a finished one is not', () => {
  assert.equal(hasActiveOrder([{ status: 'DELIVERED' }, { status: 'PREPARING' }]), true)
  assert.equal(hasActiveOrder([{ status: 'DELIVERED' }, { status: 'CANCELLED' }]), false)
  assert.equal(hasActiveOrder([]), false)
  assert.equal(hasActiveOrder(undefined), false)
})

const countries = [
  { code: 'BE', prefix: '+32' },
  { code: 'FR', prefix: '+33' },
  { code: 'LU', prefix: '+352' },
]

test('a stored number splits into country and local part', () => {
  assert.deepEqual(splitStoredPhone('+32470123456', countries), {
    phoneLocal: '470123456',
    selectedCountry: 'BE',
  })
  assert.deepEqual(splitStoredPhone('+33612345678', countries), {
    phoneLocal: '612345678',
    selectedCountry: 'FR',
  })
})

test('an unknown prefix keeps the whole number and the current country; no number is empty', () => {
  assert.deepEqual(splitStoredPhone('+44123', countries), { phoneLocal: '+44123' })
  assert.deepEqual(splitStoredPhone('', countries), { phoneLocal: '' })
  assert.deepEqual(splitStoredPhone(null, countries), { phoneLocal: '' })
})
