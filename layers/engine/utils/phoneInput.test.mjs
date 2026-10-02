// Run: `node --test layers/engine/utils/phoneInput.test.mjs`.

import assert from 'node:assert/strict'
import { classifyPhoneInput } from './phoneInput.ts'
import { test } from 'node:test'

const kind = async (value) => (await classifyPhoneInput(value)).kind

test('nothing typed is empty (no error to show)', async () => {
  assert.equal(await kind(''), 'empty')
  assert.equal(await kind('   '), 'empty')
})

test('valid numbers come back in E.164, Belgian national or international', async () => {
  assert.deepEqual(await classifyPhoneInput('0470 12 34 56'), { kind: 'valid', e164: '+32470123456' })
  assert.deepEqual(await classifyPhoneInput('04 222 98 88'), { kind: 'valid', e164: '+3242229888' })
  assert.deepEqual(await classifyPhoneInput('+33 6 12 34 56 78'), { kind: 'valid', e164: '+33612345678' })
  assert.deepEqual(await classifyPhoneInput('0032 470 12 34 56'), { kind: 'valid', e164: '+32470123456' })
})

test('a Belgian number typed slowly is incomplete, never "add the country code"', async () => {
  for (const typed of ['0', '04', '0470', '0470 12', '0470 12 34']) {
    assert.equal(await kind(typed), 'incomplete', typed)
  }
})

test('an unfinished international number is incomplete', async () => {
  assert.equal(await kind('+32'), 'incomplete')
  assert.equal(await kind('+33 6 12'), 'incomplete')
})

test('a complete-looking national number that is not Belgian asks for the country code', async () => {
  assert.equal(await kind('06 12 34 56 78'), 'needsCountryCode')
})

test('too long or not a number is invalid', async () => {
  assert.equal(await kind('0470 12 34 567'), 'invalid')
  assert.equal(await kind('+33 6 12 34 56 78 90 12'), 'invalid')
  assert.equal(await kind('abc'), 'invalid')
})
