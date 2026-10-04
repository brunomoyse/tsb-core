// The phone messages are shown under the field of a 320 px phone, where a line can break anywhere a space allows it.
// Run: `vp test run layers/engine/locales/phoneHint.test.mjs`.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'vite-plus/test'

const messages = (lang) =>
  JSON.parse(readFileSync(new URL(`./${lang}.json`, import.meta.url), 'utf8')).form

test('French: a non-breaking space before the colon, so the colon never starts a line', () => {
  for (const key of ['incompletePhone', 'phoneMaybeMobile']) {
    const text = messages('fr')[key]
    assert.match(text, /\S :/u, key)
    assert.doesNotMatch(text, / :/u, key)
  }
})

test('English: the hint is two plain sentences, not a colon-joined fragment', () => {
  assert.equal(
    messages('en').phoneMaybeMobile,
    'This mobile number seems to be missing a digit. Please check it.',
  )
})
