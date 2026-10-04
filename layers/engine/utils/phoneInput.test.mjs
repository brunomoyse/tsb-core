// Run: `vp test run layers/engine/utils/phoneInput.test.mjs`.

import assert from 'node:assert/strict'
import { classifyPhoneInput } from './phoneInput.ts'
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

// KNOWN PRODUCT ISSUE (owner decision pending): a mobile number one digit short ("0470 12 34 5", also 048x / 049x) is 9
// digits starting with 04, which is ALSO the shape of a Liège landline (04 xxx xx xx), so libphonenumber accepts it as
// valid and the checkout would save +3247012345 as a landline. The guard in classifyPhoneInput for exactly this
// (`digits.length === 9 && startsWith('04')` -> incomplete) is therefore unreachable for real input: it only runs for
// a 9-digit number libphonenumber rejects, and none of "0470 12 34 5", "0499 99 99 9" or "04 000 00 00" is rejected.
// `test.fails` keeps the suite green while this is open and turns red the day it is fixed (then make these plain tests).
for (const raw of ['0470 12 34 5', '0480 12 34 5', '0499 99 99 9']) {
  test.fails(`KNOWN ISSUE: "${raw}" (a mobile one digit short) is reported as incomplete, not accepted as a Liège landline`, async () => {
    assert.equal(await kind(raw), 'incomplete')
  })
}
