// Run: `vp test run layers/engine/utils/phoneInput.test.mjs`.

import assert from 'node:assert/strict'
import { classifyPhoneInput, looksLikeShortMobile } from './phoneInput.ts'
import { test } from 'vite-plus/test'

const kind = async (value) => (await classifyPhoneInput(value)).kind

test('nothing typed is empty (no error to show)', async () => {
  assert.equal(await kind(''), 'empty')
  assert.equal(await kind('   '), 'empty')
})

test('valid numbers come back in E.164, Belgian national or international', async () => {
  assert.deepEqual(await classifyPhoneInput('0470 12 34 56'), {
    kind: 'valid',
    e164: '+32470123456',
  })
  assert.deepEqual(await classifyPhoneInput('04 222 98 88'), { kind: 'valid', e164: '+3242229888' })
  assert.deepEqual(await classifyPhoneInput('+33 6 12 34 56 78'), {
    kind: 'valid',
    e164: '+33612345678',
  })
  assert.deepEqual(await classifyPhoneInput('0032 470 12 34 56'), {
    kind: 'valid',
    e164: '+32470123456',
  })
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

test('a Belgian number still being typed is incomplete', async () => {
  assert.equal(await kind('04'), 'incomplete')
  assert.equal(await kind('0470 12 34'), 'incomplete')
})

test('an international number that is too short is incomplete; one of the right length that is not a number is invalid', async () => {
  assert.equal(await kind('+32 47'), 'incomplete')
  assert.equal(await kind('+32 470 12 34 567 89'), 'invalid')
  assert.equal(await kind('+32 0 00 00 00 0'), 'invalid')
})

test('nine digits that no Belgian numbering plan can complete are invalid', async () => {
  assert.equal(await kind('000000000'), 'invalid')
  assert.equal(await kind('0 0 0 0 0 0 0 0 0'), 'invalid')
  assert.equal(await kind('0000 00 00 0'), 'invalid')
})

test('letters and over-long input are invalid', async () => {
  assert.equal(await kind('hello'), 'invalid')
  assert.equal(await kind('0470 12 34 56 78 90 12 34'), 'invalid')
})

// A mobile number one digit short ("0470 12 34 5", also 048x / 049x) is 9 digits starting 04, which is also the shape of a
// Liège landline (04 xxx xx xx): libphonenumber accepts every such number, and some may really be landlines, so the form
// accepts it and saves it. `looksLikeShortMobile` is what lets the form ask the customer to check it.
for (const [raw, e164] of [
  ['0470 12 34 5', '+3247012345'],
  ['0480 12 34 5', '+3248012345'],
  ['0499 99 99 9', '+3249999999'],
  ['0460 00 00 0', '+3246000000'],
]) {
  test(`"${raw}" (a mobile one digit short) is still accepted, and flagged as one`, async () => {
    const state = await classifyPhoneInput(raw)
    assert.deepEqual(state, { kind: 'valid', e164 })
    assert.equal(looksLikeShortMobile(state.e164), true)
  })
}

test('a complete mobile, a real Liège landline and a foreign number are not flagged', async () => {
  for (const raw of [
    '0470 12 34 56',
    '0499 99 99 99',
    '04 222 98 88',
    '04 345 67 89',
    '02 123 45 67',
    '+33 6 12 34 56 78',
  ]) {
    const state = await classifyPhoneInput(raw)
    assert.equal(state.kind, 'valid', raw)
    assert.equal(looksLikeShortMobile(state.e164), false, raw)
  }
})

test('only the E.164 of an 8-digit 046-049 number is flagged', () => {
  assert.equal(looksLikeShortMobile('+3247012345'), true)
  assert.equal(looksLikeShortMobile('+324701234'), false)
  assert.equal(looksLikeShortMobile('+32470123456'), false)
  assert.equal(looksLikeShortMobile('+3245012345'), false)
  assert.equal(looksLikeShortMobile('+3347012345'), false)
  assert.equal(looksLikeShortMobile(''), false)
})

// Every 9-digit number starting 04 is valid for libphonenumber (checked exhaustively when the guard that used to turn
// them "incomplete" was removed), so no 04 number of that length ever reaches the digit-count rules below it.
test('nine digits starting 04 are never "incomplete" or "invalid"', async () => {
  for (const raw of ['040000000', '041234567', '045555555', '046123456', '049999999']) {
    assert.equal(await kind(raw), 'valid', raw)
  }
})
